const form = document.getElementById("trackForm");
const ticketEl = document.getElementById("ticket");
const phoneEl = document.getElementById("phone");
const msgEl = document.getElementById("msg");
const btn = document.getElementById("trackBtn");

const resultBox = document.getElementById("result");
const rTicket = document.getElementById("rTicket");
const rService = document.getElementById("rService");
const rTier = document.getElementById("rTier");
const rStatus = document.getElementById("rStatus");
const rCreated = document.getElementById("rCreated");
const rUpdated = document.getElementById("rUpdated");

const serviceMetaCard = document.getElementById("serviceMetaCard");
const rPrice = document.getElementById("rPrice");
const rProcessingTime = document.getElementById("rProcessingTime");

// Admin message
const needInfoBox = document.getElementById("needInfoBox");
const rNeedInfoMsg = document.getElementById("rNeedInfoMsg");

// Upload UI
const uploadSection = document.getElementById("uploadSection");
const moreFilesEl = document.getElementById("moreFiles");
const uploadMoreBtn = document.getElementById("uploadMoreBtn");
const uploadMsg = document.getElementById("uploadMsg");

// Keep last tracking result so upload can use it
let LAST_TRACK_ROW = null;

function normalizePhone(p) {
  return (p || "").trim();
}

function normalizeTicket(t) {
  return (t || "").trim().toUpperCase();
}

function normalizeStatus(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function fmtDate(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d || "");
  }
}

function prettyStatus(s) {
  const t = normalizeStatus(s);
  const map = {
    pending: "pending",
    approved: "approved",
    declined: "declined",
    need_more_info: "needs info",
    needs_info: "needs info",
    needs_more_info: "needs info",
    info_submitted: "info submitted (under review)",
  };
  return map[t] || t || "-";
}

function safeFilename(name) {
  return String(name || "file")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

function getBookingIdFromRow(row) {
  return row?.booking_id || row?.id || null;
}

function isNeedsInfoStatus(status) {
  const s = normalizeStatus(status);
  return (
    s === "need_more_info" || s === "needs_info" || s === "needs_more_info"
  );
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

async function trackBooking(ticket, phone) {
  const { data, error } = await window.supabaseClient.rpc("track_booking", {
    ticket_in: ticket,
    phone_in: phone,
  });
  if (error) throw error;
  return data && data.length ? data[0] : null;
}

async function fetchServiceInfoByBookingRow(row) {
  const serviceId = row?.service_id;
  if (!serviceId) return null;

  const { data, error } = await window.supabaseClient
    .from("services")
    .select("id,name,price,processing_time")
    .eq("id", serviceId)
    .maybeSingle();

  if (error) {
    console.warn("Failed to fetch service info:", error);
    return null;
  }

  return data || null;
}

async function renderTrackingRow(row) {
  rTicket.textContent = row.ticket || "-";
  rTier.textContent = row.tier || "-";
  rStatus.textContent = prettyStatus(row.status);
  rCreated.textContent = fmtDate(row.created_at);
  rUpdated.textContent = fmtDate(row.updated_at);

  // Reset sections
  needInfoBox.style.display = "none";
  rNeedInfoMsg.textContent = "";
  uploadSection.style.display = "none";
  uploadMsg.textContent = "";
  moreFilesEl.value = "";
  serviceMetaCard.style.display = "none";
  rPrice.textContent = "—";
  rProcessingTime.textContent = "—";
  rService.textContent = "-";

  const serviceInfo = await fetchServiceInfoByBookingRow(row);
  if (serviceInfo) {
    rService.textContent = serviceInfo.name || "-";
    rPrice.textContent = formatPrice(serviceInfo.price);
    rProcessingTime.textContent = formatProcessingTime(
      serviceInfo.processing_time,
    );
    serviceMetaCard.style.display = "grid";
  }

  const adminMsg = (row.need_more_info_message || "").trim();

  if (isNeedsInfoStatus(row.status)) {
    needInfoBox.style.display = "block";
    rNeedInfoMsg.textContent =
      adminMsg ||
      "Admin requested more information. Please upload the requested documents below.";
    uploadSection.style.display = "block";
  }

  resultBox.style.display = "block";
}

async function uploadRequestedDocs() {
  uploadMsg.textContent = "";
  uploadMoreBtn.disabled = true;

  try {
    if (!LAST_TRACK_ROW) {
      uploadMsg.textContent = "Please track your ticket first.";
      return;
    }

    if (!isNeedsInfoStatus(LAST_TRACK_ROW.status)) {
      uploadMsg.textContent =
        "Uploads are only available when admin requests more info.";
      return;
    }

    const bookingId = getBookingIdFromRow(LAST_TRACK_ROW);
    const ticket = normalizeTicket(LAST_TRACK_ROW.ticket || ticketEl.value);
    const phone = normalizePhone(phoneEl.value);

    if (!bookingId) {
      uploadMsg.textContent =
        "Upload cannot proceed because booking_id is missing from tracking result.";
      return;
    }
    if (!ticket || !phone) {
      uploadMsg.textContent =
        "Ticket/Phone missing. Please re-track your ticket.";
      return;
    }

    const files = moreFilesEl.files;
    if (!files || files.length === 0) {
      uploadMsg.textContent = "Please select at least one file.";
      return;
    }

    uploadMsg.textContent = "Uploading...";

    for (const file of files) {
      const cleanName = safeFilename(file.name);
      const path = `${ticket}/${Date.now()}_${cleanName}`;

      const { error: upErr } = await window.supabaseClient.storage
        .from("booking-docs")
        .upload(path, file, {
          upsert: false,
          contentType: file.type || undefined,
        });

      if (upErr) throw upErr;

      const { error: rpcErr } = await window.supabaseClient.rpc(
        "student_add_booking_file",
        {
          booking_id_in: bookingId,
          ticket_in: ticket,
          phone_in: phone,
          file_path_in: path,
          file_name_in: file.name,
          mime_type_in: file.type || null,
          size_bytes_in: file.size || null,
        },
      );

      if (rpcErr) throw rpcErr;
    }

    const { error: markErr } = await window.supabaseClient.rpc(
      "student_mark_info_submitted",
      {
        booking_id_in: bookingId,
        ticket_in: ticket,
        phone_in: phone,
      },
    );

    if (markErr) {
      uploadMsg.textContent =
        "✅ Uploaded successfully. Admin can see your uploads, but status update failed. (Admin can still proceed.)";
      return;
    }

    const freshRow = await trackBooking(ticket, phone);
    if (freshRow) {
      LAST_TRACK_ROW = freshRow;
      await renderTrackingRow(freshRow);
    }

    uploadMsg.textContent =
      "✅ Uploaded successfully. Your ticket is now under review.";
  } catch (e) {
    console.error(e);
    uploadMsg.textContent = `Upload failed: ${e.message}`;
  } finally {
    uploadMoreBtn.disabled = false;
  }
}

uploadMoreBtn.addEventListener("click", uploadRequestedDocs);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msgEl.textContent = "";
  resultBox.style.display = "none";

  needInfoBox.style.display = "none";
  rNeedInfoMsg.textContent = "";
  uploadSection.style.display = "none";
  uploadMsg.textContent = "";
  moreFilesEl.value = "";
  LAST_TRACK_ROW = null;
  serviceMetaCard.style.display = "none";
  rPrice.textContent = "—";
  rProcessingTime.textContent = "—";
  rService.textContent = "-";

  const ticket = normalizeTicket(ticketEl.value);
  const phone = normalizePhone(phoneEl.value);

  if (!ticket || !phone) {
    msgEl.textContent = "Please enter both ticket number and phone number.";
    return;
  }

  btn.disabled = true;
  msgEl.textContent = "Checking status...";

  try {
    const row = await trackBooking(ticket, phone);

    if (!row) {
      msgEl.textContent =
        "No record found. Confirm the ticket and phone number used during submission.";
      return;
    }

    LAST_TRACK_ROW = row;
    await renderTrackingRow(row);

    msgEl.textContent = "";
  } catch (err) {
    msgEl.textContent = `Error: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
});

(function autofillFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const ticketFromUrl = normalizeTicket(params.get("ticket") || "");
  const phoneFromUrl = normalizePhone(params.get("phone") || "");

  if (ticketFromUrl) ticketEl.value = ticketFromUrl;
  if (phoneFromUrl) phoneEl.value = phoneFromUrl;

  if (ticketFromUrl && phoneFromUrl) {
    setTimeout(() => {
      form.requestSubmit();
    }, 150);
  }
})();
