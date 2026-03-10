const activityFeed = document.getElementById("activityFeed");
const refreshActivityBtn = document.getElementById("refreshActivityBtn");

function escapeActivity(str = "") {
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

function shortenActivity(text = "", max = 80) {
  const clean = String(text || "").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).trimEnd() + "...";
}

function formatActivityTime(ts) {
  try {
    return new Date(ts).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function renderActivity(rows) {
  if (!activityFeed) return;

  if (!rows || rows.length === 0) {
    activityFeed.innerHTML = `
      <p class="muted" style="margin:0;">
        No recent activity yet.
      </p>
    `;
    return;
  }

  activityFeed.innerHTML = rows
    .map(
      (a, index) => `
      <div
        style="
          display:flex;
          gap:10px;
          align-items:flex-start;
          padding:${index === 0 ? "0 0 12px 0" : "12px 0"};
          border-bottom:${index === rows.length - 1 ? "none" : "1px solid rgba(2, 6, 23, 0.08)"};
        "
      >
        <div
          style="
            width:30px;
            height:30px;
            min-width:30px;
            border-radius:999px;
            display:grid;
            place-items:center;
            background:rgba(30, 91, 255, 0.10);
            color:#1e5bff;
            margin-top:1px;
          "
        >
          <i class="fa-solid fa-bolt" style="font-size:12px;"></i>
        </div>

        <div style="flex:1; min-width:0;">
          <div style="font-size:14px; line-height:1.5; color:#0f172a;">
            ${escapeActivity(shortenActivity(a.message || "", 90))}
          </div>

          <div class="muted" style="margin-top:4px; font-size:12px;">
            ${escapeActivity(formatActivityTime(a.created_at))}
          </div>
        </div>
      </div>
    `,
    )
    .join("");
}

async function loadActivity() {
  if (!activityFeed) return;

  activityFeed.innerHTML = `
    <p class="muted" style="margin:0;">
      Loading activity...
    </p>
  `;

  try {
    const { data, error } = await window.supabaseClient
      .from("activity_feed")
      .select("message, created_at")
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) throw error;

    renderActivity(data || []);
  } catch (e) {
    console.error("Activity load error:", e);
    activityFeed.innerHTML = `
      <p class="muted" style="margin:0;">
        Failed to load activity.
      </p>
    `;
  }
}

refreshActivityBtn?.addEventListener("click", loadActivity);

loadActivity();

setInterval(() => {
  loadActivity();
}, 15000);
