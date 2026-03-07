console.log("email.js loaded ✅");

window.sendEmailViaEdge = async function ({ to, subject, html }) {
  if (!to) throw new Error("Missing recipient email");
  if (!subject) throw new Error("Missing subject");
  if (!html) throw new Error("Missing html");

  const { data, error } = await window.supabaseClient.functions.invoke(
    "send-email",
    {
      body: { to, subject, html },
    },
  );

  if (error) {
    console.error("Email error:", error);
    throw error;
  }

  return data;
};

window.emailTemplate = function ({
  title,
  ticket,
  phone = "",
  statusLine,
  extraHtml = "",
}) {
  const safeTicket = String(ticket || "");
  const safePhone = String(phone || "").trim();

  let trackUrl = `${window.location.origin}/tracking.html?ticket=${encodeURIComponent(
    safeTicket,
  )}`;

  if (safePhone) {
    trackUrl += `&phone=${encodeURIComponent(safePhone)}`;
  }

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">

      <h2 style="margin-bottom:10px">${title}</h2>

      <p>${statusLine}</p>

      <div style="
        padding:14px;
        border:1px solid #e2e8f0;
        border-radius:10px;
        background:#f8fafc;
        margin-top:15px;
        margin-bottom:15px;
      ">
        <div style="font-size:12px;color:#64748b">Ticket Number</div>
        <div style="font-size:20px;font-weight:700">${safeTicket}</div>
        ${
          safePhone
            ? `
        <div style="font-size:12px;color:#64748b;margin-top:10px">Phone Number</div>
        <div style="font-size:16px;font-weight:600">${safePhone}</div>
        `
            : ""
        }
      </div>

      <div style="margin-top:18px;margin-bottom:18px;">
        <a
          href="${trackUrl}"
          style="
            display:inline-block;
            background:#2563eb;
            color:#ffffff;
            text-decoration:none;
            padding:12px 18px;
            border-radius:8px;
            font-weight:700;
          "
        >
          Track Your Application
        </a>
      </div>

      ${extraHtml}

      <p style="margin-top:20px;font-size:12px;color:#64748b">
        KUCCPS Assist • Automated notification
      </p>

    </div>
  `;
};
