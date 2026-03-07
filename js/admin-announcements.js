// js/admin-announcements.js

const annRefreshBtn = document.getElementById("annRefreshBtn");
const annMsg = document.getElementById("annMsg");
const annTitle = document.getElementById("annTitle");
const annContent = document.getElementById("annContent");
const annHighlight = document.getElementById("annHighlight");
const annActive = document.getElementById("annActive");
const annCreateBtn = document.getElementById("annCreateBtn");
const annList = document.getElementById("annList");

function esc(s = "") {
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
function fmt(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts || "");
  }
}

let busy = false;
function setBusy(state) {
  busy = state;
  annCreateBtn.disabled = state;
  annRefreshBtn.disabled = state;
  // disable action buttons too
  annList
    .querySelectorAll("button[data-action]")
    .forEach((b) => (b.disabled = state));
}
function setMsg(text, type = "info") {
  annMsg.textContent = text || "";
  annMsg.style.color =
    type === "error" ? "#b91c1c" : type === "success" ? "#166534" : "";
}

function buildEditForm(a) {
  return `
    <div class="card" style="margin-top:10px; border:1px dashed rgba(2,6,23,0.2); background:#fff;">
      <h2 style="margin:0 0 8px; font-size:15px;">Editing: ${esc(a.title)}</h2>

      <label style="font-size:12px;" class="muted">Title</label>
      <input id="editTitle-${a.id}" value="${esc(a.title)}" />

      <div style="margin-top:10px;">
        <label style="font-size:12px;" class="muted">Message</label>
        <textarea id="editContent-${a.id}" rows="4">${esc(a.content)}</textarea>
      </div>

      <div class="actions" style="margin-top:10px;">
        <button data-action="save_edit" data-id="${a.id}">Save</button>
        <button data-action="cancel_edit" data-id="${a.id}">Cancel</button>
      </div>
    </div>
  `;
}

async function loadAnnouncements() {
  setMsg("Loading announcements...");
  annList.innerHTML = "";

  const { data, error } = await window.supabaseClient
    .from("announcements")
    .select(
      "id,title,content,is_highlight,is_active,created_at,updated_at,created_by",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    setMsg(`Error: ${error.message}`, "error");
    return;
  }

  if (!data || data.length === 0) {
    setMsg("No announcements yet.");
    return;
  }

  setMsg("");

  annList.innerHTML = data
    .map((a) => {
      const bg = a.is_highlight ? "rgba(30, 91, 255, 0.06)" : "#fff";
      const activeLabel = a.is_active ? "Active" : "Hidden";

      return `
      <div class="card" style="background:${bg}; border-color: rgba(2,6,23,0.10);">
        <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
          <div style="min-width:240px; flex:1;">
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              ${a.is_highlight ? `<span class="badge" style="padding:4px 8px;border-radius:999px;background:rgba(30,91,255,0.12);color:#1e5bff;font-weight:600;font-size:12px;">Highlighted</span>` : ""}
              <span style="padding:4px 8px;border-radius:999px;background:rgba(2,6,23,0.06);font-size:12px;">
                ${activeLabel}
              </span>
            </div>

            <h2 style="margin:8px 0 0; font-size:16px;">${esc(a.title)}</h2>
            <p style="margin:10px 0 0; white-space:pre-wrap; line-height:1.6;">${esc(a.content)}</p>

            <p class="muted" style="margin-top:10px; font-size:12px;">
              Created: ${esc(fmt(a.created_at))}${a.updated_at ? `<br/>Updated: ${esc(fmt(a.updated_at))}` : ""}
            </p>

            <div id="editBox-${a.id}"></div>
          </div>

          <div class="actions" style="align-items:flex-start; display:flex; flex-direction:column; gap:8px; min-width:180px;">
            <button data-action="toggle_active" data-id="${a.id}">
              ${a.is_active ? "Hide" : "Make Active"}
            </button>

            <button data-action="toggle_highlight" data-id="${a.id}">
              ${a.is_highlight ? "Remove Highlight" : "Highlight"}
            </button>

            <button data-action="edit" data-id="${a.id}">Edit</button>
            <button data-action="delete" data-id="${a.id}">Delete</button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  annList.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () =>
      handleAnnAction(btn.dataset.action, btn.dataset.id),
    );
  });
}

async function handleAnnAction(action, id) {
  if (busy) return;

  try {
    setBusy(true);
    setMsg("");

    // fetch current
    const { data: row, error: rErr } = await window.supabaseClient
      .from("announcements")
      .select("id,title,content,is_active,is_highlight")
      .eq("id", id)
      .maybeSingle();

    if (rErr) throw rErr;
    if (!row) {
      setMsg("Announcement not found.", "error");
      return;
    }

    if (action === "toggle_active") {
      setMsg("Saving...");
      const { error } = await window.supabaseClient
        .from("announcements")
        .update({ is_active: !row.is_active })
        .eq("id", id);
      if (error) throw error;
      setMsg("✅ Saved.", "success");
      await loadAnnouncements();
      return;
    }

    if (action === "toggle_highlight") {
      setMsg("Saving...");
      const { error } = await window.supabaseClient
        .from("announcements")
        .update({ is_highlight: !row.is_highlight })
        .eq("id", id);
      if (error) throw error;
      setMsg("✅ Saved.", "success");
      await loadAnnouncements();
      return;
    }

    if (action === "edit") {
      const box = document.getElementById(`editBox-${id}`);
      box.innerHTML = buildEditForm(row);

      box.querySelectorAll("button[data-action]").forEach((b) => {
        b.addEventListener("click", () =>
          handleAnnAction(b.dataset.action, b.dataset.id),
        );
      });

      setMsg("Editing…");
      return;
    }

    if (action === "cancel_edit") {
      const box = document.getElementById(`editBox-${id}`);
      box.innerHTML = "";
      setMsg("");
      return;
    }

    if (action === "save_edit") {
      const tEl = document.getElementById(`editTitle-${id}`);
      const cEl = document.getElementById(`editContent-${id}`);

      const t = (tEl?.value || "").trim();
      const c = (cEl?.value || "").trim();
      if (!t || !c) {
        setMsg("Title and message cannot be empty.", "error");
        return;
      }

      setMsg("Saving...");
      const { error } = await window.supabaseClient
        .from("announcements")
        .update({ title: t, content: c })
        .eq("id", id);

      if (error) throw error;

      setMsg("✅ Updated.", "success");
      await loadAnnouncements();
      return;
    }

    if (action === "delete") {
      const ok = confirm("Delete this announcement permanently?");
      if (!ok) return;

      setMsg("Deleting...");
      const { error } = await window.supabaseClient
        .from("announcements")
        .delete()
        .eq("id", id);
      if (error) throw error;

      setMsg("✅ Deleted.", "success");
      await loadAnnouncements();
      return;
    }
  } catch (e) {
    console.error(e);
    setMsg(`Error: ${e.message}`, "error");
  } finally {
    setBusy(false);
  }
}

annCreateBtn.addEventListener("click", async () => {
  if (busy) return;

  const title = (annTitle.value || "").trim();
  const content = (annContent.value || "").trim();

  if (!title || !content) {
    setMsg("Please enter both a title and a message.", "error");
    return;
  }

  try {
    setBusy(true);
    setMsg("Posting...");

    const payload = {
      title,
      content,
      is_highlight: !!annHighlight.checked,
      is_active: !!annActive.checked,
      // created_by will auto-fill if you set default auth.uid() in SQL
    };

    const { error } = await window.supabaseClient
      .from("announcements")
      .insert(payload);

    if (error) throw error;

    annTitle.value = "";
    annContent.value = "";
    annHighlight.checked = false;
    annActive.checked = true;

    setMsg("✅ Update posted.", "success");
    await loadAnnouncements();
  } catch (e) {
    console.error(e);
    setMsg(`Error: ${e.message}`, "error");
  } finally {
    setBusy(false);
  }
});

annRefreshBtn.addEventListener("click", loadAnnouncements);
loadAnnouncements();
