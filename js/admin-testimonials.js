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
        <div class="card">
          <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
            <div style="min-width:240px; flex:1;">
              <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                <span class="badge">${t.is_approved ? "Approved" : "Pending"}</span>
                <span style="padding:4px 8px;border-radius:999px;background:rgba(2,6,23,0.06);font-size:12px;">
                  ${t.is_active ? "Active" : "Hidden"}
                </span>
              </div>

              <h2 style="margin:10px 0 0; font-size:16px;">${escTes(t.name)}</h2>

              ${
                t.service_name
                  ? `<p class="muted" style="margin:6px 0 0;"><strong>Service:</strong> ${escTes(t.service_name)}</p>`
                  : ""
              }

              <p style="margin:10px 0 0; white-space:pre-wrap; line-height:1.6;">
                ${escTes(t.message)}
              </p>

              <p class="muted" style="margin-top:10px; font-size:12px;">
                Submitted: ${escTes(fmtTes(t.created_at))}
              </p>
            </div>

            <div class="actions" style="align-items:flex-start; display:flex; flex-direction:column; gap:8px; min-width:180px;">
              <button data-tes-action="toggle_approve" data-id="${t.id}">
                ${t.is_approved ? "Unapprove" : "Approve"}
              </button>

              <button data-tes-action="toggle_active" data-id="${t.id}">
                ${t.is_active ? "Hide" : "Make Active"}
              </button>

              <button data-tes-action="delete" data-id="${t.id}">
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
