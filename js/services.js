const listEl = document.getElementById("servicesList");
const msgEl = document.getElementById("servicesMsg");

function escapeHtml(str = "") {
  return str.replace(
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

function renderRequirements(reqText = "") {
  const lines = reqText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return "<p class='muted'>No requirements added yet.</p>";
  return `<ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`;
}

async function loadServices() {
  msgEl.textContent = "Loading services...";

  const { data, error } = await window.supabaseClient
    .from("services")
    .select("id,name,slug,description,requirements")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    msgEl.textContent = `Error: ${error.message}`;
    return;
  }

  if (!data || data.length === 0) {
    msgEl.textContent = "No services available yet.";
    return;
  }

  msgEl.textContent = "";

  listEl.innerHTML = data
    .map(
      (s) => `
    <div class="card">
      <h2>${escapeHtml(s.name)}</h2>
      <p class="muted">${escapeHtml(s.description || "")}</p>

      <div class="req">
        <h3>Requirements</h3>
        ${renderRequirements(s.requirements || "")}
      </div>

      <a href="service.html?slug=${encodeURIComponent(s.slug)}">
        <button>Start Application</button>
      </a>
    </div>
  `,
    )
    .join("");
}

loadServices();
