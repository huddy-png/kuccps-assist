const tesRefreshBtn = document.getElementById("tesRefreshBtn");
const tesMsg = document.getElementById("tesMsg");
const tesList = document.getElementById("tesList");

function escTes(s = "") {
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

function fmtTes(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts || "");
  }
}

let tesBusy = false;

function setTesBusy(state) {
  tesBusy = state;
  tesRefreshBtn.disabled = state;

  tesList
    .querySelectorAll("button[data-tes-action]")
    .forEach((b) => (b.disabled = state));
}

function setTesMsg(text, type = "info") {
  tesMsg.textContent = text || "";
  tesMsg.style.color =
    type === "error" ? "#b91c1c" : type === "success" ? "#166534" : "";
}

function approvalBadge(t) {
  return t.is_approved
    ? `<span class="badge" style="background:rgba(34,197,94,0.12); color:#166534; border:1px solid rgba(34,197,94,0.25);">Approved</span>`
    : `<span class="badge" style="background:rgba(245,158,11,0.12); color:#b45309; border:1px solid rgba(245,158,11,0.25);">Pending</span>`;
}

function activeBadge(t) {
  return t.is_active
    ? `<span class="badge" style="background:rgba(59,130,246,0.10); color:#1d4ed8; border:1px solid rgba(59,130,246,0.22);">Active</span>`
    : `<span class="badge" style="background:rgba(2,6,23,0.06); color:#334155; border:1px solid rgba(2,6,23,0.08);">Hidden</span>`;
}

async function loadTestimonials() {
  setTesMsg("Loading testimonials...");
  tesList.innerHTML = "";

  const { data, error } = await window.supabaseClient
    .from("testimonials")
    .select("id,name,message,service_name,is_approved,is_active,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    setTesMsg(`Error: ${error.message}`, "error");
    return;
  }

  if (!data || data.length === 0) {
    setTesMsg("No testimonials yet.");
    return;
  }

  setTesMsg("");

  tesList.innerHTML = data
    .map((t) => {
      return `
        <div class="card admin-render-card" style="padding:18px;">
          <div class="admin-render-top">
            <div class="admin-render-body">
              <div class="admin-render-meta">
                ${approvalBadge(t)}
                ${activeBadge(t)}
              </div>

              <h2 style="margin:0; font-size:16px;">${escTes(t.name)}</h2>

              ${
                t.service_name
                  ? `<p class="muted" style="margin:6px 0 0;"><strong>Service:</strong> ${escTes(
                      t.service_name,
                    )}</p>`
                  : ""
              }

              <p style="margin:10px 0 0; white-space:pre-wrap; line-height:1.6;">
                ${escTes(t.message)}
              </p>

              <p class="muted admin-render-footnote">
                Submitted: ${escTes(fmtTes(t.created_at))}
              </p>
            </div>

            <div class="tes-actions-col">
              <button data-tes-action="toggle_approve" data-id="${t.id}">
                ${t.is_approved ? "Unapprove" : "Approve"}
              </button>

              <button data-tes-action="toggle_active" data-id="${t.id}">
                ${t.is_active ? "Hide" : "Make Active"}
              </button>

              <button
                data-tes-action="delete"
                data-id="${t.id}"
                style="background:#7f1d1d; border-color:#7f1d1d;"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  tesList.querySelectorAll("button[data-tes-action]").forEach((btn) => {
    btn.addEventListener("click", () =>
      handleTestimonialAction(btn.dataset.tesAction, btn.dataset.id),
    );
  });
}

async function handleTestimonialAction(action, id) {
  if (tesBusy) return;

  try {
    setTesBusy(true);
    setTesMsg("");

    const { data: row, error: rowErr } = await window.supabaseClient
      .from("testimonials")
      .select("id,is_approved,is_active")
      .eq("id", id)
      .maybeSingle();

    if (rowErr) throw rowErr;
    if (!row) {
      setTesMsg("Testimonial not found.", "error");
      return;
    }

    if (action === "toggle_approve") {
      setTesMsg("Saving...");
      const { error } = await window.supabaseClient
        .from("testimonials")
        .update({ is_approved: !row.is_approved })
        .eq("id", id);

      if (error) throw error;

      setTesMsg("✅ Approval updated.", "success");
      await loadTestimonials();
      return;
    }

    if (action === "toggle_active") {
      setTesMsg("Saving...");
      const { error } = await window.supabaseClient
        .from("testimonials")
        .update({ is_active: !row.is_active })
        .eq("id", id);

      if (error) throw error;

      setTesMsg("✅ Visibility updated.", "success");
      await loadTestimonials();
      return;
    }

    if (action === "delete") {
      const ok = confirm("Delete this testimonial permanently?");
      if (!ok) return;

      setTesMsg("Deleting...");
      const { error } = await window.supabaseClient
        .from("testimonials")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setTesMsg("✅ Testimonial deleted.", "success");
      await loadTestimonials();
    }
  } catch (e) {
    console.error(e);
    setTesMsg(`Error: ${e.message}`, "error");
  } finally {
    setTesBusy(false);
  }
}

tesRefreshBtn?.addEventListener("click", loadTestimonials);
loadTestimonials();
