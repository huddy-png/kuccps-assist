const adminMsg = document.getElementById("adminMsg");
const bookingsList = document.getElementById("bookingsList");
const logoutBtn = document.getElementById("logoutBtn");
const bookingSummaryBar = document.getElementById("bookingSummaryBar");

const statusFilter = document.getElementById("statusFilter");
const tierFilter = document.getElementById("tierFilter");
const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");

const heroRefreshBtn = document.getElementById("heroRefreshBtn");
const jumpToBookingsBtn = document.getElementById("jumpToBookingsBtn");
const jumpToAnnouncementsBtn = document.getElementById(
  "jumpToAnnouncementsBtn",
);
const jumpToResourcesBtn = document.getElementById("jumpToResourcesBtn");

const statTotalBookings = document.getElementById("statTotalBookings");
const statPendingBookings = document.getElementById("statPendingBookings");
const statApprovedBookings = document.getElementById("statApprovedBookings");
const statVipBookings = document.getElementById("statVipBookings");
const statPaidDeposits = document.getElementById("statPaidDeposits");

function escAdmin(s = "") {
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

async function getSessionOrRedirect() {
  const { data, error } = await window.supabaseClient.auth.getSession();
  if (error) console.error("getSession error:", error);

  if (!data?.session) {
    window.location.href =
      "login.html?next=" + encodeURIComponent("admin.html");
    return null;
  }

  return data.session;
}

async function isAdmin(uid) {
  const { data, error } = await window.supabaseClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", uid)
    .maybeSingle();

  if (error) {
    console.error("Admin check error:", error);
    return false;
  }

  return !!data;
}

function normalizeStatus(s) {
  const t = String(s || "").toLowerCase();

  if (
    t === "needs_docs" ||
    t === "request_docs" ||
    t === "needs_more_info" ||
    t === "needs_info" ||
    t === "need_more_info"
  ) {
    return "need_more_info";
  }

  return t || "unknown";
}

function getStatusMeta(status) {
  const t = normalizeStatus(status);

  const map = {
    pending: {
      label: "Pending",
      bg: "rgba(245, 158, 11, 0.13)",
      color: "#b45309",
      border: "rgba(245, 158, 11, 0.22)",
    },
    approved: {
      label: "Approved",
      bg: "rgba(34, 197, 94, 0.12)",
      color: "#166534",
      border: "rgba(34, 197, 94, 0.24)",
    },
    declined: {
      label: "Declined",
      bg: "rgba(239, 68, 68, 0.12)",
      color: "#b91c1c",
      border: "rgba(239, 68, 68, 0.24)",
    },
    need_more_info: {
      label: "Needs Info",
      bg: "rgba(245, 158, 11, 0.13)",
      color: "#b45309",
      border: "rgba(245, 158, 11, 0.24)",
    },
    info_submitted: {
      label: "Info Submitted",
      bg: "rgba(59, 130, 246, 0.12)",
      color: "#1d4ed8",
      border: "rgba(59, 130, 246, 0.24)",
    },
    unknown: {
      label: "Unknown",
      bg: "rgba(15, 23, 42, 0.08)",
      color: "#334155",
      border: "rgba(15, 23, 42, 0.15)",
    },
  };

  return map[t] || map.unknown;
}

function statusBadge(status) {
  const meta = getStatusMeta(status);

  return `
    <span
      class="badge"
      style="
        background:${meta.bg};
        color:${meta.color};
        border:1px solid ${meta.border};
      "
    >
      ${escAdmin(meta.label)}
    </span>
  `;
}

function tierLabel(tier) {
  return String(tier || "").toLowerCase() === "vip" ? "VIP" : "Regular";
}

function setRowBusy(bookingId, busy) {
  const card = document.querySelector(`[data-booking-card="${bookingId}"]`);
  if (!card) return;

  card.querySelectorAll("button[data-action]").forEach((b) => {
    b.disabled = busy;
  });
}

const STATUS_MAP = {
  approve: "approved",
  decline: "declined",
  needs_info: "need_more_info",
};

function fmtBytes(n) {
  const x = Number(n || 0);
  if (!x) return "-";

  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = x;

  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }

  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function fmtDate(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d || "");
  }
}

function formatPrice(price) {
  const n = Number(price || 0);
  if (!n) return "Not set";
  return `KES ${n.toLocaleString()}`;
}

function formatProcessingTime(value = "") {
  const t = String(value || "").trim();
  return t || "Not set";
}

function parseDetails(detailsText = "") {
  const raw = String(detailsText || "").trim();
  if (!raw) return [];

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(":");

      if (idx === -1) {
        return { label: "Detail", value: line };
      }

      const label = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();

      return {
        label: label || "Detail",
        value: value || "-",
      };
    });
}

function renderDetailsGrid(detailsText = "") {
  const pairs = parseDetails(detailsText);

  if (!pairs.length) {
    return `
      <div class="req" style="margin-top:10px;">
        <h3 class="booking-section-title">Submitted Details</h3>
        <p class="muted" style="margin:0;">No details submitted.</p>
      </div>
    `;
  }

  return `
    <div class="req" style="margin-top:10px;">
      <h3 class="booking-section-title">Submitted Details</h3>
      <div class="booking-details-grid">
        ${pairs
          .map(
            (item) => `
          <div class="booking-box">
            <div class="muted booking-box-label">${escAdmin(item.label)}</div>
            <div class="booking-box-value">${escAdmin(item.value)}</div>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function normalizeStoragePath(path = "") {
  let p = String(path || "").trim();
  if (!p) return "";

  p = p.replace(
    /^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|sign)\/booking-docs\//i,
    "",
  );
  p = p.replace(
    /^\/?storage\/v1\/object\/(?:public|sign)\/booking-docs\//i,
    "",
  );
  p = p.replace(/^booking-docs\//i, "");
  p = p.replace(/^\/+/, "");

  return p;
}

function buildPathCandidates(filePath, booking = {}, file = {}) {
  const raw = normalizeStoragePath(filePath);
  const userId = String(booking.user_id || "").trim();
  const ticket = String(booking.ticket || "").trim();
  const fileName = String(file.file_name || "").trim();

  const candidates = new Set();

  if (raw) candidates.add(raw);

  if (raw && userId && !raw.startsWith(userId + "/")) {
    candidates.add(`${userId}/${raw}`);
  }

  if (ticket && fileName) {
    candidates.add(`${ticket}/${fileName}`);
  }

  if (userId && ticket && fileName) {
    candidates.add(`${userId}/${ticket}/${fileName}`);
  }

  if (raw && ticket && raw.startsWith(ticket + "/") && userId) {
    candidates.add(`${userId}/${raw}`);
  }

  if (raw && fileName && ticket && !raw.includes("/")) {
    candidates.add(`${ticket}/${raw}`);
    if (userId) candidates.add(`${userId}/${ticket}/${raw}`);
  }

  return [...candidates].filter(Boolean);
}

async function createWorkingSignedUrl(filePath, booking = {}, file = {}) {
  const candidates = buildPathCandidates(filePath, booking, file);
  let lastError = null;

  for (const candidate of candidates) {
    const { data, error } = await window.supabaseClient.storage
      .from("booking-docs")
      .createSignedUrl(candidate, 60 * 10);

    if (!error && data?.signedUrl) {
      return {
        signedUrl: data.signedUrl,
        usedPath: candidate,
        error: null,
      };
    }

    lastError = error;
  }

  return {
    signedUrl: null,
    usedPath: null,
    error: lastError,
    tried: candidates,
  };
}

async function sendBookingStatusEmail({
  to,
  ticket,
  phone = "",
  status,
  needMoreInfoMessage = "",
}) {
  const sendFn = window.sendEmailViaEdge;
  const tplFn = window.emailTemplate;

  if (!sendFn || !tplFn) {
    console.warn("email.js not loaded in admin page.");
    return;
  }

  if (!to) {
    console.warn("No recipient email found for booking:", ticket);
    return;
  }

  let subject = "";
  let title = "";
  let statusLine = "";
  let extraHtml = "";

  if (status === "approved") {
    subject = `KUCCPS Assist: Application approved (${ticket})`;
    title = "Application approved ✅";
    statusLine =
      "Your application has been reviewed and approved by the admin.";
    extraHtml = `
      <p style="margin-top:12px">
        Keep your ticket number safe for future tracking and reference.
      </p>
    `;
  } else if (status === "declined") {
    subject = `KUCCPS Assist: Application declined (${ticket})`;
    title = "Application declined ❌";
    statusLine =
      "Your application has been reviewed and was not approved at this time.";
    extraHtml = `
      <p style="margin-top:12px">
        If needed, contact support for clarification or submit a new request with the correct details.
      </p>
    `;
  } else if (status === "need_more_info") {
    subject = `KUCCPS Assist: More information required (${ticket})`;
    title = "More information required 📝";
    statusLine =
      "Your application needs additional information or documents before it can be processed.";
    extraHtml = `
      <div style="margin-top:12px; padding:12px; background:#fff7ed; border:1px solid #fed7aa; border-radius:10px;">
        <div style="font-weight:700; margin-bottom:6px;">Admin message</div>
        <div style="white-space:pre-wrap;">${escAdmin(
          needMoreInfoMessage || "",
        )}</div>
      </div>
      <p style="margin-top:12px">
        Please provide the requested details so the application can continue.
      </p>
    `;
  } else {
    return;
  }

  const html = tplFn({
    title,
    ticket,
    phone,
    statusLine,
    extraHtml,
  });

  await sendFn({ to, subject, html });
}

function updateTopAnalytics(rows = []) {
  const total = rows.length;
  const pending = rows.filter(
    (r) => normalizeStatus(r.status) === "pending",
  ).length;
  const approved = rows.filter(
    (r) => normalizeStatus(r.status) === "approved",
  ).length;
  const vip = rows.filter(
    (r) => String(r.tier || "").toLowerCase() === "vip",
  ).length;
  const paidDeposits = rows.filter(
    (r) =>
      String(r.tier || "").toLowerCase() === "vip" && Boolean(r.deposit_paid),
  ).length;

  if (statTotalBookings) statTotalBookings.textContent = String(total);
  if (statPendingBookings) statPendingBookings.textContent = String(pending);
  if (statApprovedBookings) statApprovedBookings.textContent = String(approved);
  if (statVipBookings) statVipBookings.textContent = String(vip);
  if (statPaidDeposits) statPaidDeposits.textContent = String(paidDeposits);
}

function renderBookingSummary(rows = []) {
  if (!bookingSummaryBar) return;

  if (!rows.length) {
    bookingSummaryBar.style.display = "none";
    bookingSummaryBar.innerHTML = "";
    return;
  }

  const counts = {
    total: rows.length,
    vip: rows.filter((r) => String(r.tier || "").toLowerCase() === "vip")
      .length,
    pending: rows.filter((r) => normalizeStatus(r.status) === "pending").length,
    approved: rows.filter((r) => normalizeStatus(r.status) === "approved")
      .length,
    needsInfo: rows.filter(
      (r) => normalizeStatus(r.status) === "need_more_info",
    ).length,
    paidDeposits: rows.filter(
      (r) =>
        String(r.tier || "").toLowerCase() === "vip" && Boolean(r.deposit_paid),
    ).length,
  };

  bookingSummaryBar.style.display = "flex";
  bookingSummaryBar.innerHTML = `
    <span class="booking-summary-chip">Total: ${counts.total}</span>
    <span class="booking-summary-chip">VIP: ${counts.vip}</span>
    <span class="booking-summary-chip">Pending: ${counts.pending}</span>
    <span class="booking-summary-chip">Approved: ${counts.approved}</span>
    <span class="booking-summary-chip">Needs Info: ${counts.needsInfo}</span>
    <span class="booking-summary-chip">Paid Deposits: ${counts.paidDeposits}</span>
  `;
}

async function fetchBookings() {
  adminMsg.textContent = "Loading bookings...";
  bookingsList.innerHTML = "";

  const status = statusFilter.value;
  const tier = tierFilter.value;
  const q = searchInput.value.trim();

  let query = window.supabaseClient
    .from("bookings")
    .select(
      `
      id,
      ticket,
      email,
      status,
      tier,
      phone,
      details,
      deposit_required_percent,
      deposit_paid,
      deposit_reference,
      admin_notes,
      need_more_info_message,
      created_at,
      updated_at,
      user_id,
      service_id,
      services:services ( name, price, processing_time )
    `,
    )
    .order("created_at", { ascending: false });

  if (status !== "all") query = query.eq("status", status);
  if (tier !== "all") query = query.eq("tier", tier);
  if (q) query = query.or(`ticket.ilike.%${q}%,phone.ilike.%${q}%`);

  const { data, error } = await query;

  if (error) {
    console.warn("Primary bookings query failed, trying fallback:", error);

    let q2 = window.supabaseClient
      .from("bookings")
      .select(
        `
        id,
        ticket,
        email,
        status,
        tier,
        phone,
        details,
        deposit_required_percent,
        deposit_paid,
        deposit_reference,
        admin_notes,
        need_more_info_message,
        created_at,
        updated_at,
        user_id,
        service_id
      `,
      )
      .order("created_at", { ascending: false });

    if (status !== "all") q2 = q2.eq("status", status);
    if (tier !== "all") q2 = q2.eq("tier", tier);
    if (q) q2 = q2.or(`ticket.ilike.%${q}%,phone.ilike.%${q}%`);

    const fallback = await q2;

    if (fallback.error) {
      adminMsg.textContent = `Error: ${fallback.error.message}`;
      console.error(fallback.error);
      updateTopAnalytics([]);
      renderBookingSummary([]);
      return;
    }

    const withStub = (fallback.data || []).map((b) => ({
      ...b,
      services: null,
    }));

    return renderBookings(withStub);
  }

  return renderBookings(data || []);
}

function renderBookings(rows) {
  const sorted = [...rows].sort((a, b) => {
    const av = String(a.tier || "").toLowerCase() === "vip" ? 0 : 1;
    const bv = String(b.tier || "").toLowerCase() === "vip" ? 0 : 1;
    if (av !== bv) return av - bv;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  updateTopAnalytics(sorted);
  renderBookingSummary(sorted);

  if (!sorted.length) {
    adminMsg.textContent = "No bookings found (for this filter).";
    bookingsList.innerHTML = "";
    return;
  }

  adminMsg.textContent = `Showing ${sorted.length} booking(s).`;

  bookingsList.innerHTML = sorted
    .map((b) => {
      const serviceName =
        b.services?.name || `(Service ID: ${escAdmin(b.service_id || "-")})`;
      const servicePrice = b.services?.price ?? null;
      const serviceProcessingTime = b.services?.processing_time ?? "";
      const created = fmtDate(b.created_at);
      const updated = fmtDate(b.updated_at);
      const isVip = String(b.tier || "").toLowerCase() === "vip";
      const depositState = b.deposit_paid ? "Paid" : "Unpaid";

      const dep = isVip
        ? `
            <div class="req" style="margin-top:10px;">
              <h3 class="booking-section-title">VIP Deposit</h3>
              <p style="margin:0;">
                <strong>Status:</strong>
                <span style="color:${b.deposit_paid ? "#15803d" : "#b45309"}; font-weight:800;">
                  ${depositState}
                </span><br/>
                <strong>Required:</strong> ${escAdmin(String(b.deposit_required_percent || 30))}%${
                  b.deposit_reference
                    ? `<br/><strong>Reference:</strong> ${escAdmin(
                        b.deposit_reference,
                      )}`
                    : ""
                }
              </p>
            </div>
          `
        : "";

      const notes = b.admin_notes
        ? `<div class="muted" style="margin-top:10px;"><strong>Admin notes:</strong> ${escAdmin(b.admin_notes)}</div>`
        : "";

      const emailLine = b.email
        ? `<strong>Email:</strong> ${escAdmin(b.email)}<br/>`
        : "";

      const needInfoMsg =
        b.need_more_info_message &&
        normalizeStatus(b.status) === "need_more_info"
          ? `
            <div class="card" style="margin-top:10px; background:#fff8eb; border:1px solid rgba(245,158,11,0.2);">
              <strong>Needs Info Message:</strong>
              <div class="muted" style="margin-top:6px; white-space:pre-wrap;">${escAdmin(
                b.need_more_info_message,
              )}</div>
            </div>
          `
          : "";

      const serviceMeta = `
        <div class="booking-service-grid">
          <div class="req" style="margin-top:0;">
            <h3 class="booking-section-title">Service Fee</h3>
            <p style="margin:0; font-weight:900; color:#1e5bff;">${escAdmin(
              formatPrice(servicePrice),
            )}</p>
          </div>

          <div class="req" style="margin-top:0;">
            <h3 class="booking-section-title">Processing Time</h3>
            <p style="margin:0; font-weight:700;">${escAdmin(
              formatProcessingTime(serviceProcessingTime),
            )}</p>
          </div>
        </div>
      `;

      const visibleDetails = renderDetailsGrid(b.details || "");

      return `
        <div class="card booking-card ${isVip ? "vip-booking" : ""}" data-booking-card="${b.id}">
          <div class="booking-card-top">
            <div class="booking-card-head">
              ${
                isVip
                  ? `<div class="booking-flag" style="margin-bottom:10px;">★ VIP Booking</div>`
                  : ""
              }
              <h2>${escAdmin(serviceName)}</h2>

              <div class="muted" style="margin-top:6px; line-height:1.75;">
                <strong>Ticket:</strong> ${escAdmin(b.ticket || "-")}<br/>
                <strong>Tier:</strong> ${escAdmin(tierLabel(b.tier))}<br/>
                ${emailLine}
                <strong>Phone:</strong> ${escAdmin(b.phone || "-")}<br/>
                <strong>Status:</strong> ${statusBadge(b.status)}
              </div>
            </div>

            <div class="muted" style="text-align:right; min-width:180px;">
              <div><strong>Created:</strong> ${escAdmin(created)}</div>
              <div style="margin-top:4px;"><strong>Updated:</strong> ${escAdmin(updated)}</div>
            </div>
          </div>

          ${serviceMeta}
          ${dep}
          ${needInfoMsg}
          ${visibleDetails}

          <details style="margin-top:12px;">
            <summary><strong>Raw details text</strong></summary>
            <pre style="white-space:pre-wrap; background:#f6f7fb; padding:10px; border-radius:10px; margin-top:10px;">${escAdmin(
              b.details || "",
            )}</pre>
          </details>

          ${notes}

          <div class="booking-card-actions" style="margin-top:14px;">
            <button data-action="approve" data-id="${b.id}">Approve</button>
            <button data-action="needs_info" data-id="${b.id}">Needs Info</button>
            <button data-action="decline" data-id="${b.id}">Decline</button>
            <button data-action="docs" data-id="${b.id}">View Docs</button>
            <button data-action="note" data-id="${b.id}">Add Note</button>
            <button
              data-action="delete"
              data-id="${b.id}"
              type="button"
              style="background:#7f1d1d; border-color:#7f1d1d;"
            >
              Delete Booking
            </button>
          </div>

          <div class="muted booking-row-msg" id="rowMsg-${b.id}"></div>
          <div id="docs-${b.id}" class="booking-docs-wrap"></div>
        </div>
      `;
    })
    .join("");

  bookingsList.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () =>
      handleAction(btn.dataset.action, btn.dataset.id),
    );
  });
}

async function deleteBookingFlow(bookingId, bookingRow, rowMsg) {
  const confirmed = confirm(
    `Delete booking ${bookingRow.ticket || ""} permanently?\n\nThis will try to remove linked documents and file records too.`,
  );
  if (!confirmed) return;

  rowMsg.textContent = "Deleting booking...";

  let fileRows = [];

  const filesResult = await window.supabaseClient
    .from("booking_files")
    .select("id,file_path,file_name")
    .eq("booking_id", bookingId);

  if (!filesResult.error && Array.isArray(filesResult.data)) {
    fileRows = filesResult.data;
  }

  if (fileRows.length) {
    const storagePaths = [];

    for (const f of fileRows) {
      const candidates = buildPathCandidates(f.file_path, bookingRow, f);
      if (candidates.length) storagePaths.push(candidates[0]);
    }

    if (storagePaths.length) {
      const { error: storageErr } = await window.supabaseClient.storage
        .from("booking-docs")
        .remove(storagePaths);

      if (storageErr) {
        console.warn("Storage delete warning:", storageErr);
      }
    }

    const { error: filesDeleteErr } = await window.supabaseClient
      .from("booking_files")
      .delete()
      .eq("booking_id", bookingId);

    if (filesDeleteErr) {
      console.warn("booking_files delete warning:", filesDeleteErr);
    }
  }

  const { error: bookingDeleteErr } = await window.supabaseClient
    .from("bookings")
    .delete()
    .eq("id", bookingId);

  if (bookingDeleteErr) {
    rowMsg.textContent = `Error: ${bookingDeleteErr.message}`;
    return;
  }

  rowMsg.textContent = "✅ Booking deleted.";
  await fetchBookings();
}

async function handleAction(action, bookingId) {
  const rowMsg = document.getElementById(`rowMsg-${bookingId}`);
  const docsBox = document.getElementById(`docs-${bookingId}`);

  rowMsg.textContent = "";
  docsBox.innerHTML = "";

  setRowBusy(bookingId, true);

  try {
    if (action === "docs") {
      rowMsg.textContent = "Loading documents...";

      const { data: bookingRow, error: bookingErr } =
        await window.supabaseClient
          .from("bookings")
          .select("id,ticket,user_id")
          .eq("id", bookingId)
          .maybeSingle();

      if (bookingErr || !bookingRow) {
        rowMsg.textContent = `Docs error: ${
          bookingErr?.message || "Booking not found"
        }`;
        return;
      }

      let files = null;

      const primary = await window.supabaseClient
        .from("booking_files")
        .select(
          "id,file_path,file_name,mime_type,size_bytes,created_at,uploaded_by",
        )
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });

      if (!primary.error) {
        files = primary.data || [];
      } else {
        const fallback = await window.supabaseClient
          .from("booking_files")
          .select("id,file_path,file_name,mime_type,size_bytes,created_at")
          .eq("booking_id", bookingId)
          .order("created_at", { ascending: false });

        if (fallback.error) {
          rowMsg.textContent = `Docs error: ${fallback.error.message}`;
          return;
        }

        files = fallback.data || [];
      }

      if (!files || !files.length) {
        rowMsg.textContent = "No documents uploaded for this booking.";
        return;
      }

      const items = [];

      for (const f of files) {
        const result = await createWorkingSignedUrl(f.file_path, bookingRow, f);

        const meta = [
          f.mime_type ? escAdmin(f.mime_type) : null,
          f.size_bytes ? escAdmin(fmtBytes(f.size_bytes)) : null,
          f.created_at ? escAdmin(fmtDate(f.created_at)) : null,
          f.uploaded_by ? escAdmin(String(f.uploaded_by)) : null,
        ]
          .filter(Boolean)
          .join(" • ");

        if (!result.signedUrl) {
          items.push(`
            <li>
              <div><strong>${escAdmin(f.file_name)}</strong></div>
              <div class="muted">${meta || ""}</div>
              <div class="muted">(cannot open: ${escAdmin(
                result.error?.message || "Object not found",
              )})</div>
              <div class="muted" style="font-size:12px;">Saved path: ${escAdmin(
                f.file_path || "",
              )}</div>
              <div class="muted" style="font-size:12px;">Tried: ${escAdmin(
                (result.tried || []).join(" | "),
              )}</div>
            </li>
          `);
        } else {
          items.push(`
            <li>
              <div class="booking-doc-actions">
                <a href="${result.signedUrl}" target="_blank" rel="noopener"><strong>${escAdmin(
                  f.file_name,
                )}</strong></a>
                <a href="${result.signedUrl}" target="_blank" rel="noopener">
                  <button type="button">Preview</button>
                </a>
              </div>
              <div class="muted">${meta || ""}</div>
            </li>
          `);
        }
      }

      rowMsg.textContent = "";
      docsBox.innerHTML = `
        <div class="card" style="background:#f6f7fb;">
          <strong>Documents</strong>
          <ul class="booking-doc-list">${items.join("")}</ul>
          <div class="muted">Links expire in about 10 minutes.</div>
        </div>
      `;
      return;
    }

    if (action === "note") {
      const note = prompt("Enter admin note:");
      if (note === null) return;

      rowMsg.textContent = "Saving note...";

      const { error } = await window.supabaseClient
        .from("bookings")
        .update({ admin_notes: note })
        .eq("id", bookingId);

      rowMsg.textContent = error ? `Error: ${error.message}` : "✅ Note saved.";

      if (!error) {
        await fetchBookings();
      }
      return;
    }

    const { data: bookingRow, error: bookingRowErr } =
      await window.supabaseClient
        .from("bookings")
        .select("id,ticket,email,phone,user_id")
        .eq("id", bookingId)
        .maybeSingle();

    if (bookingRowErr) {
      rowMsg.textContent = `Error: ${bookingRowErr.message}`;
      return;
    }

    if (!bookingRow) {
      rowMsg.textContent = "Booking not found.";
      return;
    }

    if (action === "delete") {
      await deleteBookingFlow(bookingId, bookingRow, rowMsg);
      return;
    }

    if (action === "needs_info") {
      const msg = prompt(
        "What information/documents are missing? (This will be shown to the student)",
      );

      if (msg === null) return;

      const clean = msg.trim();

      if (!clean) {
        rowMsg.textContent = "Please type a message (cannot be empty).";
        return;
      }

      rowMsg.textContent = "Updating status + message...";

      const { error } = await window.supabaseClient
        .from("bookings")
        .update({
          status: STATUS_MAP.needs_info,
          need_more_info_message: clean,
        })
        .eq("id", bookingId);

      if (error) {
        rowMsg.textContent = `Error: ${error.message}`;
        return;
      }

      try {
        await sendBookingStatusEmail({
          to: bookingRow.email,
          ticket: bookingRow.ticket,
          phone: bookingRow.phone,
          status: "need_more_info",
          needMoreInfoMessage: clean,
        });

        rowMsg.textContent = "✅ Updated (Needs Info) + email sent.";
      } catch (e) {
        console.warn("Needs info email failed:", e);
        rowMsg.textContent = "✅ Updated (Needs Info), but email failed.";
      }

      await fetchBookings();
      return;
    }

    const nextStatus = STATUS_MAP[action] || action;

    rowMsg.textContent = "Updating status...";

    const { error } = await window.supabaseClient
      .from("bookings")
      .update({
        status: nextStatus,
        need_more_info_message: null,
      })
      .eq("id", bookingId);

    if (error) {
      rowMsg.textContent = `Error: ${error.message}`;
      return;
    }

    try {
      await sendBookingStatusEmail({
        to: bookingRow.email,
        ticket: bookingRow.ticket,
        phone: bookingRow.phone,
        status: nextStatus,
      });

      rowMsg.textContent = "✅ Updated + email sent.";
    } catch (e) {
      console.warn("Status email failed:", e);
      rowMsg.textContent = "✅ Updated, but email failed.";
    }

    await fetchBookings();
  } finally {
    setRowBusy(bookingId, false);
  }
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

logoutBtn.addEventListener("click", async () => {
  await window.supabaseClient.auth.signOut();
  window.location.href = "index.html";
});

refreshBtn.addEventListener("click", fetchBookings);
heroRefreshBtn?.addEventListener("click", fetchBookings);

jumpToBookingsBtn?.addEventListener("click", () =>
  scrollToSection("bookingsSection"),
);
jumpToAnnouncementsBtn?.addEventListener("click", () =>
  scrollToSection("announcementsSection"),
);
jumpToResourcesBtn?.addEventListener("click", () =>
  scrollToSection("resourcesSection"),
);

statusFilter.addEventListener("change", fetchBookings);
tierFilter.addEventListener("change", fetchBookings);

let searchTimer = null;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(fetchBookings, 300);
});

(async function init() {
  const session = await getSessionOrRedirect();
  if (!session) return;

  const ok = await isAdmin(session.user.id);
  if (!ok) {
    adminMsg.textContent = "❌ Access denied. You are not an admin.";
    bookingsList.innerHTML = "";
    updateTopAnalytics([]);
    renderBookingSummary([]);
    return;
  }

  adminMsg.textContent = "✅ Admin access confirmed.";
  fetchBookings();
})();

const adminScrollBtn = document.getElementById("adminScrollTopBtn");

if (adminScrollBtn) {
  const toggleAdminScrollBtn = () => {
    if (window.scrollY > 150) {
      adminScrollBtn.classList.add("show");
    } else {
      adminScrollBtn.classList.remove("show");
    }
  };

  window.addEventListener("scroll", toggleAdminScrollBtn, { passive: true });
  toggleAdminScrollBtn();

  adminScrollBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
}
