const successWall = document.getElementById("successWall");
const refreshSuccessBtn = document.getElementById("refreshSuccessBtn");

function escSuccess(s = "") {
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

function shortenSuccess(text = "", max = 100) {
  const clean = String(text || "").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).trimEnd() + "...";
}

function fmtSuccessDate(ts) {
  try {
    return new Date(ts).toLocaleDateString();
  } catch {
    return "";
  }
}

function buildSuccessMessage(row) {
  const course = String(row.course || "").trim();
  const institution = String(row.institution || "").trim();

  if (course && institution) return `${course} — ${institution}`;
  if (course) return course;
  if (institution) return institution;

  return "Student success record";
}

function renderSuccess(rows) {
  if (!successWall) return;

  if (!rows || rows.length === 0) {
    successWall.innerHTML = `
      <p class="muted" style="margin:0;">
        No student successes yet.
      </p>
    `;
    return;
  }

  successWall.innerHTML = rows
    .map(
      (s) => `
      <div class="card">
        <div style="font-size:18px;color:#10b981;">
          <i class="fa-solid fa-circle-check"></i>
        </div>

        <p style="margin:10px 0 0; line-height:1.6;">
          ${escSuccess(shortenSuccess(buildSuccessMessage(s), 100))}
        </p>

        ${
          s.student_name
            ? `<p style="margin:10px 0 0; font-weight:800;">
                — ${escSuccess(s.student_name)}
              </p>`
            : ""
        }

        ${
          s.year
            ? `<p class="muted" style="margin:6px 0 0; font-size:12px;">
                ${escSuccess(s.year)}
              </p>`
            : `<p class="muted" style="margin:6px 0 0; font-size:12px;">
                ${escSuccess(fmtSuccessDate(s.created_at))}
              </p>`
        }
      </div>
    `,
    )
    .join("");
}

async function loadSuccessWall() {
  if (!successWall) return;

  successWall.innerHTML = `
    <p class="muted">Loading student success...</p>
  `;

  try {
    const { data, error } = await window.supabaseClient
      .from("success_wall")
      .select("student_name,course,institution,year,created_at,is_active")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(4);

    if (error) throw error;

    renderSuccess(data || []);
  } catch (e) {
    console.error(e);
    successWall.innerHTML = `
      <p class="muted">Failed to load student success.</p>
    `;
  }
}

refreshSuccessBtn?.addEventListener("click", loadSuccessWall);

loadSuccessWall();

setInterval(() => {
  loadSuccessWall();
}, 20000);
