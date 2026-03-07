const adminMsg = document.getElementById("adminMsg");
const bookingsList = document.getElementById("bookingsList");
const logoutBtn = document.getElementById("logoutBtn");

const statusFilter = document.getElementById("statusFilter");
const tierFilter = document.getElementById("tierFilter");
const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");

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
  )
    return "need_more_info";
  return t || "unknown";
}

function badge(status) {
  const t = normalizeStatus(status);
  const map = {
    pending: "Pending",
    approved: "Approved",
    declined: "Declined",
    need_more_info: "Needs Info",
    info_submitted: "Info Submitted",
  };
  return `<span class="badge">${esc(map[t] || t)}</span>`;
}

function tierLabel(tier) {
  const t = String(tier || "").toLowerCase();
  return t === "vip" ? "VIP" : "Regular";
}

function setRowBusy(bookingId, busy) {
  const card = document.querySelector(`[data-booking-card="${bookingId}"]`);
  if (!card) return;
  card
    .querySelectorAll("button[data-action]")
    .forEach((b) => (b.disabled = busy));
}

// DB-safe statuses
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

// ---------- FIX FOR VIEW DOCS ----------
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

async function createWorkingSignedUrl(filePath) {
  const candidates = [
    normalizeStoragePath(filePath),
    String(filePath || "").trim(),
  ].filter(Boolean);

  let lastError = null;

  for (const candidate of [...new Set(candidates)]) {
    const { data, error } = await window.supabaseClient.storage
      .from("booking-docs")
      .createSignedUrl(candidate, 60 * 10);

    if (!error && data?.signedUrl) {
      return { signedUrl: data.signedUrl, usedPath: candidate, error: null };
    }

    lastError = error;
  }

  return { signedUrl: null, usedPath: null, error: lastError };
}

// ---------- Email helper ----------
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
        <div style="white-space:pre-wrap;">${esc(needMoreInfoMessage || "")}</div>
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
      services:services ( name )
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
    const av = a.tier === "vip" ? 0 : 1;
    const bv = b.tier === "vip" ? 0 : 1;
    if (av !== bv) return av - bv;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  if (!sorted.length) {
    adminMsg.textContent = "No bookings found (for this filter).";
    bookingsList.innerHTML = "";
    return;
  }

  adminMsg.textContent = `Showing ${sorted.length} booking(s).`;

  bookingsList.innerHTML = sorted
    .map((b) => {
      const serviceName =
        b.services?.name || "(Service ID: " + esc(b.service_id || "-") + ")";
      const created = fmtDate(b.created_at);
      const updated = fmtDate(b.updated_at);

      const dep =
        b.tier === "vip"
          ? `<div class="muted" style="margin-top:8px;">
              <strong>Deposit:</strong> ${b.deposit_paid ? "PAID" : "NOT PAID"} (${b.deposit_required_percent || 30}%)
              ${b.deposit_reference ? `<br/><strong>Ref:</strong> ${esc(b.deposit_reference)}` : ""}
            </div>`
          : "";

      const notes = b.admin_notes
        ? `<div class="muted" style="margin-top:8px;"><strong>Admin notes:</strong> ${esc(b.admin_notes)}</div>`
        : "";

      const emailLine = b.email
        ? `<strong>Email:</strong> ${esc(b.email)}<br/>`
        : "";

      const needInfoMsg =
        b.need_more_info_message &&
        normalizeStatus(b.status) === "need_more_info"
          ? `<div class="card" style="margin-top:10px; background:#fff6e5;">
              <strong>Needs Info Message:</strong>
              <div class="muted" style="margin-top:6px; white-space:pre-wrap;">${esc(b.need_more_info_message)}</div>
            </div>`
          : "";

      return `
        <div class="card" data-booking-card="${b.id}">
          <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
            <div>
              <h2 style="margin:0;">${esc(serviceName)}</h2>
              <div class="muted" style="margin-top:4px;">
                <strong>Ticket:</strong> ${esc(b.ticket)}<br/>
                <strong>Tier:</strong> ${esc(tierLabel(b.tier))}<br/>
                ${emailLine}
                <strong>Phone:</strong> ${esc(b.phone || "-")}<br/>
                <strong>Status:</strong> ${badge(b.status)}
              </div>
            </div>
            <div class="muted" style="text-align:right;">
              <div><strong>Created:</strong> ${esc(created)}</div>
              <div><strong>Updated:</strong> ${esc(updated)}</div>
            </div>
          </div>

          ${dep}
          ${needInfoMsg}

          <details style="margin-top:10px;">
            <summary><strong>Student details</strong></summary>
            <pre style="white-space:pre-wrap; background:#f6f7fb; padding:10px; border-radius:10px; margin-top:10px;">${esc(b.details || "")}</pre>
          </details>

          ${notes}

          <div class="actions" style="margin-top:12px; display:flex; flex-wrap:wrap; gap:10px;">
            <button data-action="approve" data-id="${b.id}">Approve</button>
            <button data-action="needs_info" data-id="${b.id}">Needs Info</button>
            <button data-action="decline" data-id="${b.id}">Decline</button>
            <button data-action="docs" data-id="${b.id}">View Docs</button>
            <button data-action="note" data-id="${b.id}">Add Note</button>
          </div>

          <div class="muted" id="rowMsg-${b.id}" style="margin-top:10px;"></div>
          <div id="docs-${b.id}" style="margin-top:10px;"></div>
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

async function handleAction(action, bookingId) {
  const rowMsg = document.getElementById(`rowMsg-${bookingId}`);
  const docsBox = document.getElementById(`docs-${bookingId}`);
  rowMsg.textContent = "";
  docsBox.innerHTML = "";

  setRowBusy(bookingId, true);

  try {
    if (action === "docs") {
      rowMsg.textContent = "Loading documents...";

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
        const result = await createWorkingSignedUrl(f.file_path);

        const meta = [
          f.mime_type ? esc(f.mime_type) : null,
          f.size_bytes ? esc(fmtBytes(f.size_bytes)) : null,
          f.created_at ? esc(fmtDate(f.created_at)) : null,
          f.uploaded_by ? esc(String(f.uploaded_by)) : null,
        ]
          .filter(Boolean)
          .join(" • ");

        if (!result.signedUrl) {
          items.push(
            `<li>
              <div><strong>${esc(f.file_name)}</strong></div>
              <div class="muted">${meta || ""}</div>
              <div class="muted">(cannot open: ${esc(result.error?.message || "Object not found")})</div>
              <div class="muted" style="font-size:12px;">Saved path: ${esc(f.file_path || "")}</div>
            </li>`,
          );
        } else {
          items.push(
            `<li>
              <div><a href="${result.signedUrl}" target="_blank" rel="noopener"><strong>${esc(f.file_name)}</strong></a></div>
              <div class="muted">${meta || ""}</div>
            </li>`,
          );
        }
      }

      rowMsg.textContent = "";
      docsBox.innerHTML = `
        <div class="card" style="background:#f6f7fb;">
          <strong>Documents</strong>
          <ul style="margin-top:8px;">${items.join("")}</ul>
          <div class="muted">Links expire in ~10 minutes.</div>
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
      return;
    }

    const { data: bookingRow, error: bookingRowErr } =
      await window.supabaseClient
        .from("bookings")
        .select("id,ticket,email,phone")
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

logoutBtn.addEventListener("click", async () => {
  await window.supabaseClient.auth.signOut();
  window.location.href = "index.html";
});

refreshBtn.addEventListener("click", fetchBookings);
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
    return;
  }

  adminMsg.textContent = "✅ Admin access confirmed.";
  fetchBookings();
})();
