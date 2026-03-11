const contentEl = document.getElementById("servicesContent");
const msgEl = document.getElementById("servicesMsg");

let allServices = [];

function escapeHtml(str = "") {
  return String(str).replace(
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
  const normalized = String(reqText || "").replace(/\\n/g, "\n");

  const lines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) {
    return "<p class='muted'>No requirements listed.</p>";
  }

  return `<ul>${lines
    .slice(0, 3)
    .map((l) => `<li>${escapeHtml(l)}</li>`)
    .join("")}</ul>`;
}

function getCategory(serviceName = "", slug = "") {
  const text = `${serviceName} ${slug}`.toLowerCase();

  if (text.includes("kuccps")) return "KUCCPS";

  if (
    text.includes("kmtc") ||
    text.includes("tvet") ||
    text.includes("degree")
  ) {
    return "Training";
  }

  if (text.includes("helb") || text.includes("kra") || text.includes("sha")) {
    return "Student Services";
  }

  return "General";
}

function getBadge(serviceName = "", slug = "") {
  const text = `${serviceName} ${slug}`.toLowerCase();

  if (text.includes("revision")) return "Popular";
  if (text.includes("transfer")) return "Trending";
  if (text.includes("helb")) return "Finance";
  if (text.includes("kra")) return "Registration";

  return "";
}

function formatPrice(price) {
  const n = Number(price || 0);

  if (!n) return "Contact";

  return `KES ${n.toLocaleString()}`;
}

function buildStartApplicationUrl(slug = "") {
  const next = `service.html?slug=${encodeURIComponent(slug)}`;
  return `login.html?next=${encodeURIComponent(next)}`;
}

function renderCard(service) {
  const badge = getBadge(service.name, service.slug);
  const startUrl = buildStartApplicationUrl(service.slug);

  return `
  <div class="card service-card">

    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">

      <h2 style="margin:0;font-size:18px;">${escapeHtml(service.name)}</h2>

      ${badge ? `<span class="badge">${escapeHtml(badge)}</span>` : ""}

    </div>

    <p class="muted">${escapeHtml(service.description || "")}</p>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">

      <strong style="color:#2563eb;">
        ${escapeHtml(formatPrice(service.price))}
      </strong>

      <span class="muted" style="font-size:12px;">
        Regular / VIP
      </span>

    </div>

    <div class="req">
      <h3>Requirements</h3>
      ${renderRequirements(service.requirements)}
    </div>

    <div style="margin-top:auto;">
      <a href="${startUrl}">
        <button type="button">
          Start Application
        </button>
      </a>
    </div>

  </div>
  `;
}

function renderServices(services) {
  if (!services.length) {
    contentEl.innerHTML = `<p class="muted">No services match your search.</p>`;
    return;
  }

  contentEl.innerHTML = `
    <div class="services-grid">
      ${services.map(renderCard).join("")}
    </div>
  `;
}

function createSearchBar() {
  const searchBox = document.createElement("input");

  searchBox.placeholder = "Search services...";
  searchBox.className = "service-search";

  searchBox.style.cssText = `
  width:100%;
  padding:12px 14px;
  margin-bottom:20px;
  border-radius:10px;
  border:1px solid #e2e8f0;
  `;

  searchBox.addEventListener("input", () => {
    const q = searchBox.value.toLowerCase();

    const filtered = allServices.filter((s) =>
      `${s.name} ${s.slug} ${s.description}`.toLowerCase().includes(q),
    );

    renderServices(filtered);
  });

  contentEl.before(searchBox);
}

async function loadServices() {
  msgEl.textContent = "Loading services...";

  const { data, error } = await window.supabaseClient
    .from("services")
    .select(
      "id,name,slug,description,requirements,is_active,sort_order,created_at,price",
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    msgEl.textContent = `Error: ${error.message}`;
    return;
  }

  if (!data || data.length === 0) {
    msgEl.textContent = "No services available.";
    return;
  }

  allServices = data;

  msgEl.textContent = `${data.length} services available`;

  createSearchBar();

  renderServices(data);
}

loadServices();
