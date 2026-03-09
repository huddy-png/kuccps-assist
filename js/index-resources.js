const resourcesMsg = document.getElementById("resourcesMsg");
const resourcesList = document.getElementById("resourcesList");
const refreshResourcesBtn = document.getElementById("refreshResourcesBtn");

function escIndexRes(s = "") {
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

function fmtIndexResDate(ts) {
  try {
    return new Date(ts).toLocaleDateString();
  } catch {
    return String(ts || "");
  }
}

function renderResources(rows) {
  if (!rows || rows.length === 0) {
    resourcesMsg.textContent = "No resources available yet.";
    resourcesList.innerHTML = "";
    return;
  }

  resourcesMsg.textContent = "";

  resourcesList.innerHTML = rows
    .map((r) => {
      return `
        <div class="card">
          <h2 style="margin:0; font-size:16px;">${escIndexRes(r.title)}</h2>
          <p class="muted" style="margin:6px 0 0;">
            ${escIndexRes(r.description || "Helpful document for students")}
          </p>

          <p class="muted" style="margin-top:10px; font-size:12px;">
            Added: ${escIndexRes(fmtIndexResDate(r.created_at))}
          </p>

          <div style="margin-top:10px;">
            <a href="${r.file_url}" target="_blank" rel="noopener">
              <button type="button">
                <i class="fa-solid fa-download"></i> Download Resource
              </button>
            </a>
          </div>
        </div>
      `;
    })
    .join("");
}

async function loadResourcesHome() {
  resourcesMsg.textContent = "Loading resources...";
  resourcesList.innerHTML = "";

  try {
    const { data, error } = await window.supabaseClient
      .from("resources")
      .select("id,title,description,file_url,is_active,created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    renderResources(data || []);
  } catch (e) {
    console.error(e);
    resourcesMsg.textContent =
      "Failed to load resources. Please refresh the page.";
  }
}

refreshResourcesBtn?.addEventListener("click", loadResourcesHome);
loadResourcesHome();
