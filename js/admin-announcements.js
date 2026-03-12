const annRefreshBtn = document.getElementById("annRefreshBtn");
const annMsg = document.getElementById("annMsg");
const annTitle = document.getElementById("annTitle");
const annContent = document.getElementById("annContent");
const annHighlight = document.getElementById("annHighlight");
const annActive = document.getElementById("annActive");
const annCreateBtn = document.getElementById("annCreateBtn");
const annList = document.getElementById("annList");

function escAnn(s = "") {
  return String(s).replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[m],
  );
}

function fmtAnn(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts || "");
  }
}

let annBusy = false;
let annEditingId = null;

function setAnnBusy(state) {
  annBusy = state;
  annCreateBtn.disabled = state;
  annRefreshBtn.disabled = state;

  annList.querySelectorAll("button[data-action]").forEach((b) => {
    b.disabled = state;
  });
}

function setAnnMsg(text, type = "info") {
  annMsg.textContent = text || "";
  annMsg.style.color =
    type === "error" ? "#b91c1c" : type === "success" ? "#166534" : "";
}

function buildEditForm(a) {
  return `
    <div class="card admin-edit-box" style="border:1px dashed rgba(2,6,23,0.18); background:#fff;">
      <h3 style="margin:0 0 8px;">Editing: ${escAnn(a.title)}</h3>

      <div style="display:grid; gap:10px;">
        <div>
          <label class="muted" style="font-size:12px;">Title</label>
          <input id="editTitle-${a.id}" value="${escAnn(a.title)}" />
        </div>

        <div>
          <label class="muted" style="font-size:12px;">Message</label>
          <textarea id="editContent-${a.id}" rows="4">${escAnn(
            a.content,
          )}</textarea>
        </div>

        <div class="admin-render-actions" style="margin-top:4px;">
          <button data-action="save_edit" data-id="${a.id}" type="button">Save</button>
          <button data-action="cancel_edit" data-id="${a.id}" type="button">Cancel</button>
        </div>
      </div>
    </div>
  `;
}

function announcementCard(a) {
  const activeLabel = a.is_active ? "Active" : "Hidden";
  const bg = a.is_highlight ? "rgba(30, 91, 255, 0.06)" : "#fff";

  return `
    <div class="card admin-render-card" style="background:${bg}; border-color:rgba(2,6,23,0.10); padding:18px;">
      <div class="admin-render-top">
        <div class="admin-render-body">
          <div class="admin-render-meta">
            ${
              a.is_highlight
                ? `<span class="badge" style="background:rgba(30,91,255,0.12); color:#1e40af; border:1px solid rgba(30,91,255,0.22);">Highlighted</span>`
                : `<span class="badge" style="background:rgba(2,6,23,0.05); color:#475569; border:1px solid rgba(2,6,23,0.08);">Normal</span>`
            }

            <span
              class="badge"
              style="
                background:rgba(2,6,23,0.06);
                color:#334155;
                border:1px solid rgba(2,6,23,0.08);
              "
            >
              ${activeLabel}
            </span>
          </div>

          <h3 style="margin:0 0 8px;">${escAnn(a.title)}</h3>

          <div class="admin-render-text">${escAnn(a.content)}</div>

          <p class="muted admin-render-footnote">
            Created: ${escAnn(fmtAnn(a.created_at))}
            ${a.updated_at ? `<br>Updated: ${escAnn(fmtAnn(a.updated_at))}` : ""}
          </p>

          <div id="editBox-${a.id}"></div>
        </div>

        <div class="admin-render-actions">
          <button data-action="toggle_active" data-id="${a.id}" type="button">
            ${a.is_active ? "Hide" : "Make Active"}
          </button>

          <button data-action="toggle_highlight" data-id="${a.id}" type="button">
            ${a.is_highlight ? "Remove Highlight" : "Highlight"}
          </button>

          <button data-action="edit" data-id="${a.id}" type="button">Edit</button>
          <button
            data-action="delete"
            data-id="${a.id}"
            type="button"
            style="background:#7f1d1d; border-color:#7f1d1d;"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  `;
}

async function loadAnnouncements() {
  setAnnMsg("Loading announcements...");
  annList.innerHTML = "";

  const { data, error } = await window.supabaseClient
    .from("announcements")
    .select(
      "id,title,content,is_highlight,is_active,created_at,updated_at,created_by",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    setAnnMsg(`Error: ${error.message}`, "error");
    return;
  }

  if (!data || data.length === 0) {
    setAnnMsg("No announcements yet.");
    return;
  }

  setAnnMsg("");
  annList.innerHTML = data.map(announcementCard).join("");

  annList.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () =>
      handleAnnAction(btn.dataset.action, btn.dataset.id),
    );
  });
}

async function handleAnnAction(action, id) {
  if (annBusy) return;

  try {
    setAnnBusy(true);
    setAnnMsg("");

    const { data: row, error: rErr } = await window.supabaseClient
      .from("announcements")
      .select("id,title,content,is_active,is_highlight")
      .eq("id", id)
      .maybeSingle();

    if (rErr) throw rErr;
    if (!row) {
      setAnnMsg("Announcement not found.", "error");
      return;
    }

    if (action === "toggle_active") {
      setAnnMsg("Saving...");
      const { error } = await window.supabaseClient
        .from("announcements")
        .update({ is_active: !row.is_active })
        .eq("id", id);

      if (error) throw error;

      setAnnMsg("✅ Saved.", "success");
      await loadAnnouncements();
      return;
    }

    if (action === "toggle_highlight") {
      setAnnMsg("Saving...");
      const { error } = await window.supabaseClient
        .from("announcements")
        .update({ is_highlight: !row.is_highlight })
        .eq("id", id);

      if (error) throw error;

      setAnnMsg("✅ Saved.", "success");
      await loadAnnouncements();
      return;
    }

    if (action === "edit") {
      if (annEditingId && annEditingId !== id) {
        const oldBox = document.getElementById(`editBox-${annEditingId}`);
        if (oldBox) oldBox.innerHTML = "";
      }

      const box = document.getElementById(`editBox-${id}`);
      box.innerHTML = buildEditForm(row);
      annEditingId = id;

      box.querySelectorAll("button[data-action]").forEach((b) => {
        b.addEventListener("click", () =>
          handleAnnAction(b.dataset.action, b.dataset.id),
        );
      });

      setAnnMsg("Editing...");
      return;
    }

    if (action === "cancel_edit") {
      const box = document.getElementById(`editBox-${id}`);
      box.innerHTML = "";
      annEditingId = null;
      setAnnMsg("");
      return;
    }

    if (action === "save_edit") {
      const tEl = document.getElementById(`editTitle-${id}`);
      const cEl = document.getElementById(`editContent-${id}`);

      const t = (tEl?.value || "").trim();
      const c = (cEl?.value || "").trim();

      if (!t || !c) {
        setAnnMsg("Title and message cannot be empty.", "error");
        return;
      }

      setAnnMsg("Saving...");
      const { error } = await window.supabaseClient
        .from("announcements")
        .update({ title: t, content: c })
        .eq("id", id);

      if (error) throw error;

      annEditingId = null;
      setAnnMsg("✅ Updated.", "success");
      await loadAnnouncements();
      return;
    }

    if (action === "delete") {
      const ok = confirm("Delete this announcement permanently?");
      if (!ok) return;

      setAnnMsg("Deleting...");
      const { error } = await window.supabaseClient
        .from("announcements")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (annEditingId === id) annEditingId = null;

      setAnnMsg("✅ Deleted.", "success");
      await loadAnnouncements();
    }
  } catch (e) {
    console.error(e);
    setAnnMsg(`Error: ${e.message}`, "error");
  } finally {
    setAnnBusy(false);
  }
}

annCreateBtn.addEventListener("click", async () => {
  if (annBusy) return;

  const title = (annTitle.value || "").trim();
  const content = (annContent.value || "").trim();

  if (!title || !content) {
    setAnnMsg("Please enter both a title and a message.", "error");
    return;
  }

  try {
    setAnnBusy(true);
    setAnnMsg("Posting...");

    const payload = {
      title,
      content,
      is_highlight: !!annHighlight.checked,
      is_active: !!annActive.checked,
    };

    const { error } = await window.supabaseClient
      .from("announcements")
      .insert(payload);

    if (error) throw error;

    annTitle.value = "";
    annContent.value = "";
    annHighlight.checked = false;
    annActive.checked = true;

    setAnnMsg("✅ Update posted.", "success");
    await loadAnnouncements();
  } catch (e) {
    console.error(e);
    setAnnMsg(`Error: ${e.message}`, "error");
  } finally {
    setAnnBusy(false);
  }
});

annRefreshBtn.addEventListener("click", loadAnnouncements);
loadAnnouncements();
