const serviceNameEl = document.getElementById("serviceName");
const serviceDescEl = document.getElementById("serviceDesc");
const requirementsBox = document.getElementById("requirementsBox");
const dynamicFieldsEl = document.getElementById("dynamicFields");

const serviceMetaCard = document.getElementById("serviceMetaCard");
const servicePriceEl = document.getElementById("servicePrice");
const serviceProcessingTimeEl = document.getElementById(
  "serviceProcessingTime",
);
const serviceTierInfoEl = document.getElementById("serviceTierInfo");
const serviceVipInfoEl = document.getElementById("serviceVipInfo");

const form = document.getElementById("bookingForm");
const phoneEl = document.getElementById("phone");
const docsEl = document.getElementById("docs");
const msgEl = document.getElementById("msg");
const submitBtn = document.getElementById("submitBtn");

const depositBox = document.getElementById("depositBox");
const depositPaidEl = document.getElementById("depositPaid");
const depositRefEl = document.getElementById("depositRef");

const logoutBtn = document.getElementById("logoutBtn");

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
  const normalized = String(reqText).replace(/\\n/g, "\n");
  const lines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) return "<p class='muted'>No requirements added yet.</p>";
  return `<ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`;
}

function getRequirementLines(reqText = "") {
  return String(reqText)
    .replace(/\\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function toFieldId(label, index) {
  return `field_${index}_${String(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")}`;
}

function buildFieldPlaceholder(label = "") {
  const t = String(label).toLowerCase();

  if (t.includes("email")) return "Enter email address";
  if (t.includes("phone")) return "Enter phone number";
  if (t.includes("id")) return "Enter ID number";
  if (t.includes("index")) return "Enter KCSE index number";
  if (t.includes("year")) return "Enter year";
  if (t.includes("course")) return "Enter course";
  if (t.includes("university")) return "Enter university";
  if (t.includes("campus")) return "Enter campus";
  if (t.includes("issue")) return "Describe the issue";
  if (t.includes("grades")) return "Enter the grades";
  return "Enter details";
}

function buildFieldType(label = "") {
  const t = String(label).toLowerCase();

  if (t.includes("email")) return "email";
  if (t.includes("phone")) return "tel";
  if (t.includes("year")) return "text";
  return "text";
}

function buildDynamicFields(reqText = "") {
  const lines = getRequirementLines(reqText);

  if (!lines.length) {
    dynamicFieldsEl.innerHTML = `
      <div class="req" style="margin-top:0; grid-column:1 / -1;">
        <h3>Info</h3>
        <p class="muted" style="margin:0;">No custom fields found for this service yet.</p>
      </div>
    `;
    return;
  }

  dynamicFieldsEl.innerHTML = lines
    .map((label, index) => {
      const fieldId = toFieldId(label, index);
      const type = buildFieldType(label);
      const placeholder = buildFieldPlaceholder(label);
      const isLongField =
        /course|university|issue|grades|details|preferences|message/i.test(
          label,
        );

      if (isLongField) {
        return `
          <div style="grid-column: 1 / -1;">
            <label for="${fieldId}"><strong>${escapeHtml(label)}</strong></label>
            <textarea
              id="${fieldId}"
              data-field-label="${escapeHtml(label)}"
              rows="3"
              placeholder="${escapeHtml(placeholder)}"
            ></textarea>
          </div>
        `;
      }

      return `
        <div>
          <label for="${fieldId}"><strong>${escapeHtml(label)}</strong></label>
          <input
            id="${fieldId}"
            type="${type}"
            data-field-label="${escapeHtml(label)}"
            placeholder="${escapeHtml(placeholder)}"
          />
        </div>
      `;
    })
    .join("");
}

function collectStructuredDetails() {
  const fields = dynamicFieldsEl.querySelectorAll("[data-field-label]");
  const lines = [];

  fields.forEach((field) => {
    const label = field.getAttribute("data-field-label") || "";
    const value = String(field.value || "").trim();
    lines.push(`${label}: ${value}`);
  });

  return {
    detailsText: lines.join("\n"),
    formData: Array.from(fields).map((field) => ({
      label: field.getAttribute("data-field-label") || "",
      value: String(field.value || "").trim(),
    })),
  };
}

function validateDynamicFields() {
  const fields = dynamicFieldsEl.querySelectorAll("[data-field-label]");
  for (const field of fields) {
    if (!String(field.value || "").trim()) {
      const label = field.getAttribute("data-field-label") || "This field";
      msgEl.textContent = `${label} is required.`;
      field.focus();
      return false;
    }
  }
  return true;
}

function getTier() {
  const checked = document.querySelector('input[name="tier"]:checked');
  return checked ? checked.value : "regular";
}

function makeTicket() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `KAS-${y}${m}${day}-${rand}`;
}

function formatPrice(price) {
  const n = Number(price || 0);
  if (!n) return "Price available on request";
  return `KES ${n.toLocaleString()}`;
}

function formatProcessingTime(value = "") {
  const t = String(value || "").trim();
  return t || "Varies";
}

// ---------- Draft ----------
function getSlug() {
  return new URLSearchParams(window.location.search).get("slug") || "service";
}

function draftKey(slug) {
  return `kas_draft_${slug}`;
}

function saveDraft(slug) {
  const dynamicValues = {};
  dynamicFieldsEl.querySelectorAll("[data-field-label]").forEach((field) => {
    dynamicValues[field.id] = field.value || "";
  });

  const draft = {
    phone: phoneEl?.value || "",
    tier: getTier(),
    depositPaid: !!depositPaidEl?.checked,
    depositRef: depositRefEl?.value || "",
    dynamicValues,
    savedAt: Date.now(),
  };

  localStorage.setItem(draftKey(slug), JSON.stringify(draft));
}

function loadDraft(slug) {
  const raw = localStorage.getItem(draftKey(slug));
  if (!raw) return;

  try {
    const d = JSON.parse(raw);

    if (phoneEl) phoneEl.value = d.phone || "";

    const tier = d.tier || "regular";
    const radio = document.querySelector(`input[name="tier"][value="${tier}"]`);
    if (radio) radio.checked = true;

    if (depositBox)
      depositBox.style.display = tier === "vip" ? "block" : "none";
    if (depositPaidEl) depositPaidEl.checked = !!d.depositPaid;
    if (depositRefEl) depositRefEl.value = d.depositRef || "";

    if (d.dynamicValues && typeof d.dynamicValues === "object") {
      Object.entries(d.dynamicValues).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.value = value || "";
      });
    }
  } catch (e) {
    console.warn("Draft parse failed:", e);
  }
}

function clearDraft(slug) {
  localStorage.removeItem(draftKey(slug));
}

function bindDraftAutoSave() {
  ["input", "change", "keyup"].forEach((evt) => {
    phoneEl?.addEventListener(evt, () => saveDraft(getSlug()));
    depositPaidEl?.addEventListener(evt, () => saveDraft(getSlug()));
    depositRefEl?.addEventListener(evt, () => saveDraft(getSlug()));

    dynamicFieldsEl?.addEventListener(evt, () => saveDraft(getSlug()));
  });

  document.querySelectorAll('input[name="tier"]').forEach((r) => {
    r.addEventListener("change", () => {
      if (depositBox)
        depositBox.style.display = getTier() === "vip" ? "block" : "none";
      saveDraft(getSlug());
    });
  });
}

// ---------- Auth ----------
async function requireSessionOrRedirect() {
  const { data, error } = await window.supabaseClient.auth.getSession();
  if (error) console.error("getSession error:", error);

  const session = data?.session;
  if (!session) {
    const slug = getSlug();
    saveDraft(slug);

    const backTo = window.location.pathname + window.location.search;
    window.location.href = `login.html?next=${encodeURIComponent(backTo)}`;
    return null;
  }
  return session;
}

async function getLoggedInEmail() {
  const { data, error } = await window.supabaseClient.auth.getUser();
  if (error) console.warn("getUser error:", error);
  return data?.user?.email || null;
}

async function loadServiceBySlug(slug) {
  msgEl.textContent = "Loading service...";

  const { data, error } = await window.supabaseClient
    .from("services")
    .select(
      "id,name,description,requirements,is_active,slug,created_at,price,processing_time",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    msgEl.textContent = `Error loading service: ${error.message}`;
    console.error("loadServiceBySlug error:", error);
    return null;
  }

  if (!data) {
    serviceNameEl.textContent = "Service not found";
    serviceDescEl.textContent = "";
    requirementsBox.innerHTML =
      "<p class='muted'>This service may have been removed/deactivated, or the link is wrong.</p>";
    msgEl.textContent = "";
    if (serviceMetaCard) serviceMetaCard.style.display = "none";
    return null;
  }

  serviceNameEl.textContent = data.name;
  serviceDescEl.textContent = data.description || "";
  requirementsBox.innerHTML = renderRequirements(data.requirements || "");
  buildDynamicFields(data.requirements || "");

  if (serviceMetaCard) {
    serviceMetaCard.style.display = "block";
    if (servicePriceEl) {
      servicePriceEl.textContent = formatPrice(data.price);
    }
    if (serviceProcessingTimeEl) {
      serviceProcessingTimeEl.textContent = formatProcessingTime(
        data.processing_time,
      );
    }
    if (serviceTierInfoEl) {
      serviceTierInfoEl.textContent = "Regular / VIP";
    }
    if (serviceVipInfoEl) {
      serviceVipInfoEl.textContent = "30% required";
    }
  }

  loadDraft(getSlug());
  msgEl.textContent = "";
  return data;
}

logoutBtn?.addEventListener("click", async () => {
  await window.supabaseClient.auth.signOut();
  window.location.href = "index.html";
});

bindDraftAutoSave();

(async function init() {
  const slug = getSlug();
  window._service = await loadServiceBySlug(slug);
})();

// ---------- Submit booking ----------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msgEl.textContent = "";

  const service = window._service;
  if (!service) {
    msgEl.textContent = "Service not loaded. Refresh and try again.";
    return;
  }

  if (!validateDynamicFields()) return;

  const session = await requireSessionOrRedirect();
  if (!session) return;

  const userEmail = await getLoggedInEmail();
  const tier = getTier();
  const ticket = makeTicket();
  const phoneValue = phoneEl.value.trim() || null;

  if (!phoneValue) {
    msgEl.textContent = "Phone number is required.";
    phoneEl.focus();
    return;
  }

  const { detailsText } = collectStructuredDetails();

  const bookingPayload = {
    user_id: session.user.id,
    service_id: service.id,
    tier,
    phone: phoneValue,
    details: detailsText || null,
    ticket,
    status: "pending",
    email: userEmail,
    deposit_required_percent: tier === "vip" ? 30 : 0,
    deposit_paid: tier === "vip" ? !!depositPaidEl.checked : false,
    deposit_reference:
      tier === "vip" ? depositRefEl.value.trim() || null : null,
  };

  submitBtn.disabled = true;
  msgEl.textContent = "Submitting booking...";

  const { data: booking, error: bookingErr } = await window.supabaseClient
    .from("bookings")
    .insert(bookingPayload)
    .select("id,ticket,email,phone")
    .single();

  if (bookingErr) {
    submitBtn.disabled = false;
    msgEl.textContent = `Booking error: ${bookingErr.message}`;
    console.error("bookingErr:", bookingErr);
    return;
  }

  const files = docsEl.files ? Array.from(docsEl.files) : [];

  if (files.length) {
    msgEl.textContent = `Uploading ${files.length} document(s)...`;
    let okCount = 0;

    for (const f of files) {
      const safeName = f.name.replace(/[^\w.\-]+/g, "_");
      const path = `${session.user.id}/${booking.ticket}/${Date.now()}_${safeName}`;

      const { error: upErr } = await window.supabaseClient.storage
        .from("booking-docs")
        .upload(path, f, { upsert: false });

      if (upErr) {
        console.error("Upload error:", upErr);
        msgEl.textContent = `Upload failed for ${f.name}: ${upErr.message}`;
        continue;
      }

      const { error: fileRecErr } = await window.supabaseClient
        .from("booking_files")
        .insert({
          booking_id: booking.id,
          user_id: session.user.id,
          file_path: path,
          file_name: f.name,
          mime_type: f.type || null,
          size_bytes: f.size || null,
        });

      if (fileRecErr) {
        console.error("File record error:", fileRecErr);
        msgEl.textContent = `Uploaded, but failed saving record for ${f.name}: ${fileRecErr.message}`;
        continue;
      }

      okCount++;
      msgEl.textContent = `Uploading... (${okCount}/${files.length})`;
    }
  }

  try {
    const sendFn = window.sendEmailViaEdge;
    const tplFn = window.emailTemplate;

    if (!sendFn || !tplFn) {
      console.warn(
        "email.js not loaded: sendEmailViaEdge/emailTemplate missing",
      );
    } else if (booking.email) {
      const subject = `KUCCPS Assist: Application received (${booking.ticket})`;
      const html = tplFn({
        title: "Application received ✅",
        ticket: booking.ticket,
        phone: booking.phone || phoneValue || "",
        statusLine:
          "We have received your application. Our admin will review it and update you shortly.",
        extraHtml: `<p style="margin:12px 0 0">You can track your request anytime using your ticket number.</p>`,
      });

      await sendFn({ to: booking.email, subject, html });
    } else {
      console.warn(
        "No user email found (user is logged in but email missing).",
      );
    }
  } catch (e) {
    console.warn("Email send failed (non-blocking):", e);
  }

  clearDraft(getSlug());

  msgEl.textContent = "✅ Submitted! Redirecting to your ticket...";
  window.location.href = `ticket.html?ticket=${encodeURIComponent(booking.ticket)}`;
});
