const testimonialsMsg = document.getElementById("testimonialsMsg");
const testimonialsList = document.getElementById("testimonialsList");
const refreshTestimonialsBtn = document.getElementById(
  "refreshTestimonialsBtn",
);

const tesName = document.getElementById("tesName");
const tesService = document.getElementById("tesService");
const tesMessage = document.getElementById("tesMessage");
const tesSubmitBtn = document.getElementById("tesSubmitBtn");
const tesSubmitMsg = document.getElementById("tesSubmitMsg");

function escIndexTes(s = "") {
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

function fmtIndexTesDate(ts) {
  try {
    return new Date(ts).toLocaleDateString();
  } catch {
    return String(ts || "");
  }
}

function renderTestimonials(rows) {
  if (!rows || rows.length === 0) {
    testimonialsMsg.textContent =
      "No testimonials available yet. Be the first to share your experience.";
    testimonialsList.innerHTML = "";
    return;
  }

  testimonialsMsg.textContent = "";

  testimonialsList.innerHTML = rows
    .map(
      (t) => `
      <div class="card">
        <div style="font-size:18px; color:#f59e0b;">★★★★★</div>
        <p style="margin:10px 0 0; line-height:1.6; white-space:pre-wrap;">
          “${escIndexTes(t.message)}”
        </p>

        ${
          t.service_name
            ? `<p class="muted" style="margin:10px 0 0;"><strong>Service:</strong> ${escIndexTes(t.service_name)}</p>`
            : ""
        }

        <p style="margin:10px 0 0; font-weight:800;">
          — ${escIndexTes(t.name)}
        </p>

        <p class="muted" style="margin:6px 0 0; font-size:12px;">
          ${escIndexTes(fmtIndexTesDate(t.created_at))}
        </p>
      </div>
    `,
    )
    .join("");
}

async function loadTestimonialsHome() {
  testimonialsMsg.textContent = "Loading testimonials...";
  testimonialsList.innerHTML = "";

  try {
    const { data, error } = await window.supabaseClient
      .from("testimonials")
      .select("id,name,message,service_name,created_at,is_approved,is_active")
      .eq("is_approved", true)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(12);

    if (error) throw error;
    renderTestimonials(data || []);
  } catch (e) {
    console.error(e);
    testimonialsMsg.textContent =
      "Failed to load testimonials. Please refresh the page.";
  }
}

tesSubmitBtn?.addEventListener("click", async () => {
  const name = (tesName.value || "").trim();
  const service = (tesService.value || "").trim();
  const message = (tesMessage.value || "").trim();

  tesSubmitMsg.textContent = "";

  if (!name || !message) {
    tesSubmitMsg.textContent = "Please enter your name and message.";
    return;
  }

  try {
    tesSubmitBtn.disabled = true;
    tesSubmitMsg.textContent = "Submitting...";

    const { error } = await window.supabaseClient.from("testimonials").insert({
      name,
      message,
      service_name: service || null,
      is_approved: false,
      is_active: true,
    });

    if (error) throw error;

    tesName.value = "";
    tesService.value = "";
    tesMessage.value = "";

    tesSubmitMsg.textContent =
      "✅ Submitted successfully. Your testimonial will appear after admin approval.";
  } catch (e) {
    console.error(e);
    tesSubmitMsg.textContent = `Error: ${e.message}`;
  } finally {
    tesSubmitBtn.disabled = false;
  }
});

refreshTestimonialsBtn?.addEventListener("click", loadTestimonialsHome);
loadTestimonialsHome();
