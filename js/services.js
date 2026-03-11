const contentEl = document.getElementById("servicesContent");
const msgEl = document.getElementById("servicesMsg");

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
    return "<p class='muted'>No requirements added yet.</p>";
  }

  return `<ul>${lines
    .slice(0, 4)
    .map((l) => `<li>${escapeHtml(l)}</li>`)
    .join("")}</ul>`;
}

function getCategory(serviceName = "", slug = "") {
  const text = `${serviceName} ${slug}`.toLowerCase();

  if (text.includes("kuccps")) return "KUCCPS Services";

  if (
    text.includes("kmtc") ||
    text.includes("self-sponsored") ||
    text.includes("degree")
  ) {
    return "College & Training";
  }

  return "Student Support Services";
}

function getBadge(serviceName = "", slug = "") {
  const text = `${serviceName} ${slug}`.toLowerCase();

  if (text.includes("helb") || text.includes("sha") || text.includes("kra")) {
    return "Student Service";
  }

  if (text.includes("revision") || text.includes("transfer")) {
    return "Popular";
  }

  if (text.includes("kmtc")) {
    return "Medical Training";
  }

  return "Application";
}

function getHelperText(serviceName = "", slug = "") {
  const text = `${serviceName} ${slug}`.toLowerCase();

  if (text.includes("revision")) {
    return "Best for students changing course choices before closure.";
  }

  if (text.includes("transfer")) {
    return "Best for students changing institution after placement.";
  }

  if (text.includes("helb")) {
    return "Best for funding, loan, appeal, and follow-up support.";
  }

  if (text.includes("kra")) {
    return "Best for first-time KRA PIN setup and registration support.";
  }

  if (text.includes("sha")) {
    return "Best for account registration and setup assistance.";
  }

  if (text.includes("kmtc")) {
    return "Best for students applying to KMTC programmes.";
  }

  if (text.includes("self-sponsored")) {
    return "Best for direct degree application outside KUCCPS placement.";
  }

  return "Best for students who need guided application support.";
}

function formatPrice(price) {
  const n = Number(price || 0);
  if (!n) return "Price available on request";
  return `KES ${n.toLocaleString()}`;
}

function buildStartApplicationUrl(slug = "") {
  const next = `service.html?slug=${encodeURIComponent(slug)}`;
  return `login.html?next=${encodeURIComponent(next)}`;
}

function renderCard(service) {
  const badge = getBadge(service.name, service.slug);
  const helper = getHelperText(service.name, service.slug);
  const startUrl = buildStartApplicationUrl(service.slug);

  return `
    <div class="card" style="height:100%;">
      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:10px;
          flex-wrap:wrap;
        "
      >
        <h2 style="margin:0; font-size:18px;">${escapeHtml(service.name)}</h2>
        <span class="badge">${escapeHtml(badge)}</span>
      </div>

      <p class="muted" style="margin:0;">${escapeHtml(
        service.description || "",
      )}</p>

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
          flex-wrap:wrap;
          padding:10px 12px;
          border-radius:12px;
          background:linear-gradient(180deg, #fbfdff, #f7f9ff);
          border:1px solid rgba(30, 91, 255, 0.12);
        "
      >
        <div>
          <div style="font-size:12px; color:#64748b; font-weight:700;">
            Service Fee
          </div>
          <div style="font-size:18px; font-weight:900; color:#1e5bff;">
            ${escapeHtml(formatPrice(service.price))}
          </div>
        </div>
        <div class="muted" style="font-size:12px;">
          Regular & VIP available
        </div>
      </div>

      <div
        style="
          border-left: 3px solid rgba(30, 91, 255, 0.22);
          padding-left: 10px;
          margin-top: 2px;
        "
      >
        <p class="muted" style="margin:0; font-size:13px;">${escapeHtml(
          helper,
        )}</p>
      </div>

      <div class="req">
        <h3>Requirements</h3>
        ${renderRequirements(service.requirements || "")}
      </div>

      <div style="margin-top:auto;">
        <a href="${startUrl}">
          <button type="button">Start Application</button>
        </a>
      </div>
    </div>
  `;
}

function renderSection(title, services) {
  return `
    <section style="margin-top: 18px;">
      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:flex-end;
          gap:10px;
          flex-wrap:wrap;
          margin-bottom:10px;
        "
      >
        <div>
          <h2 style="margin:0; font-size:20px;">${escapeHtml(title)}</h2>
          <p class="muted" style="margin:6px 0 0;">
            ${escapeHtml(`${services.length} service${services.length === 1 ? "" : "s"} available`)}
          </p>
        </div>
      </div>

      <div class="services-grid">
        ${services.map(renderCard).join("")}
      </div>
    </section>
  `;
}

async function loadServices() {
  msgEl.textContent = "Loading services...";
  contentEl.innerHTML = "";

  const { data, error } = await window.supabaseClient
    .from("services")
    .select(
      "id,name,slug,description,requirements,is_active,sort_order,created_at,price",
    )
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

  const grouped = {
    "KUCCPS Services": [],
    "College & Training": [],
    "Student Support Services": [],
  };

  data.forEach((service) => {
    const category = getCategory(service.name, service.slug);
    grouped[category].push(service);
  });

  msgEl.textContent = `${data.length} service${data.length === 1 ? "" : "s"} available.`;

  contentEl.innerHTML = [
    grouped["KUCCPS Services"].length
      ? renderSection("KUCCPS Services", grouped["KUCCPS Services"])
      : "",
    grouped["College & Training"].length
      ? renderSection("College & Training", grouped["College & Training"])
      : "",
    grouped["Student Support Services"].length
      ? renderSection(
          "Student Support Services",
          grouped["Student Support Services"],
        )
      : "",
  ].join("");
}

loadServices();
