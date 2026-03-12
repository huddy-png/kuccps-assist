const resRefreshBtn = document.getElementById("resRefreshBtn");
const resMsg = document.getElementById("resMsg");
const resTitle = document.getElementById("resTitle");
const resDescription = document.getElementById("resDescription");
const resFile = document.getElementById("resFile");
const resActive = document.getElementById("resActive");
const resUploadBtn = document.getElementById("resUploadBtn");
const resList = document.getElementById("resList");

function escRes(s = "") {
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

function fmtResDate(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts || "");
  }
}

function safeResFileName(name = "") {
  return String(name)
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_");
}

let resBusy = false;

function setResBusy(state) {
  resBusy = state;
  if (resUploadBtn) resUploadBtn.disabled = state;
  if (resRefreshBtn) resRefreshBtn.disabled = state;
  resList
    ?.querySelectorAll("button[data-res-action]")
    .forEach((b) => (b.disabled = state));
}

function setResMsg(text, type = "info") {
  resMsg.textContent = text || "";
  resMsg.style.color =
    type === "error" ? "#b91c1c" : type === "success" ? "#166534" : "";
}

function resourceCard(r) {
  const activeLabel = r.is_active ? "Active" : "Hidden";
  const fileLink = r.file_url || "#";

  return `
    <div class="card admin-render-card">
      <div class="admin-render-top">
        <div class="admin-render-body">
          <div class="admin-render-meta">
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

          <h3 style="margin:0 0 8px;">${escRes(r.title)}</h3>

          <p class="muted" style="margin:0 0 10px; word-break:break-word;">
            ${escRes(r.description || "No description")}
          </p>

          <p class="muted admin-render-footnote">
            Uploaded: ${escRes(fmtResDate(r.created_at))}
          </p>

          <div class="admin-render-actions" style="margin-top:12px;">
            <a href="${fileLink}" target="_blank" rel="noopener">
              <button type="button">Open File</button>
            </a>
          </div>
        </div>

        <div class="admin-render-actions">
          <button data-res-action="toggle_active" data-id="${r.id}" type="button">
            ${r.is_active ? "Hide" : "Make Active"}
          </button>

          <button data-res-action="delete" data-id="${r.id}" type="button">
            Delete
          </button>
        </div>
      </div>
    </div>
  `;
}

async function loadResources() {
  setResMsg("Loading resources...");
  resList.innerHTML = "";

  const { data, error } = await window.supabaseClient
    .from("resources")
    .select("id,title,description,file_path,file_url,is_active,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    setResMsg(`Error: ${error.message}`, "error");
    return;
  }

  if (!data || data.length === 0) {
    setResMsg("No resources uploaded yet.");
    return;
  }

  setResMsg("");
  resList.innerHTML = data.map(resourceCard).join("");

  resList.querySelectorAll("button[data-res-action]").forEach((btn) => {
    btn.addEventListener("click", () =>
      handleResourceAction(btn.dataset.resAction, btn.dataset.id),
    );
  });
}

async function handleResourceAction(action, id) {
  if (resBusy) return;

  try {
    setResBusy(true);
    setResMsg("");

    const { data: row, error: rowErr } = await window.supabaseClient
      .from("resources")
      .select("id,title,file_path,is_active")
      .eq("id", id)
      .maybeSingle();

    if (rowErr) throw rowErr;
    if (!row) {
      setResMsg("Resource not found.", "error");
      return;
    }

    if (action === "toggle_active") {
      setResMsg("Saving...");
      const { error } = await window.supabaseClient
        .from("resources")
        .update({ is_active: !row.is_active })
        .eq("id", id);

      if (error) throw error;

      setResMsg("✅ Resource updated.", "success");
      await loadResources();
      return;
    }

    if (action === "delete") {
      const ok = confirm("Delete this resource permanently?");
      if (!ok) return;

      setResMsg("Deleting...");

      if (row.file_path) {
        const { error: storageErr } = await window.supabaseClient.storage
          .from("site-resources")
          .remove([row.file_path]);

        if (storageErr) {
          console.warn("Storage delete warning:", storageErr);
        }
      }

      const { error } = await window.supabaseClient
        .from("resources")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setResMsg("✅ Resource deleted.", "success");
      await loadResources();
    }
  } catch (e) {
    console.error(e);
    setResMsg(`Error: ${e.message}`, "error");
  } finally {
    setResBusy(false);
  }
}

resUploadBtn?.addEventListener("click", async () => {
  if (resBusy) return;

  const title = (resTitle.value || "").trim();
  const description = (resDescription.value || "").trim();
  const file = resFile.files?.[0] || null;

  if (!title) {
    setResMsg("Please enter a title.", "error");
    return;
  }

  if (!file) {
    setResMsg("Please choose a file to upload.", "error");
    return;
  }

  try {
    setResBusy(true);
    setResMsg("Uploading resource...");

    const safeName = safeResFileName(file.name);
    const path = `${Date.now()}_${safeName}`;

    const { error: uploadErr } = await window.supabaseClient.storage
      .from("site-resources")
      .upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });

    if (uploadErr) throw uploadErr;

    const { data: publicData } = window.supabaseClient.storage
      .from("site-resources")
      .getPublicUrl(path);

    const publicUrl = publicData?.publicUrl || null;

    const { error: insertErr } = await window.supabaseClient
      .from("resources")
      .insert({
        title,
        description: description || null,
        file_path: path,
        file_url: publicUrl,
        is_active: !!resActive.checked,
      });

    if (insertErr) throw insertErr;

    resTitle.value = "";
    resDescription.value = "";
    resFile.value = "";
    resActive.checked = true;

    setResMsg("✅ Resource uploaded.", "success");
    await loadResources();
  } catch (e) {
    console.error(e);
    setResMsg(`Error: ${e.message}`, "error");
  } finally {
    setResBusy(false);
  }
});

resRefreshBtn?.addEventListener("click", loadResources);
loadResources();
