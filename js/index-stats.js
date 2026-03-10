const statBookings = document.getElementById("statBookings");
const statTestimonials = document.getElementById("statTestimonials");
const statQuestions = document.getElementById("statQuestions");
const statSuccess = document.getElementById("statSuccess");

function setStat(el, value) {
  if (!el) return;
  el.textContent = value;
}

async function loadStats() {
  try {
    const [bookingsRes, testimonialsRes, questionsRes, successRes] =
      await Promise.all([
        window.supabaseClient
          .from("bookings")
          .select("*", { count: "exact", head: true }),

        window.supabaseClient
          .from("testimonials")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),

        window.supabaseClient
          .from("public_questions")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),

        window.supabaseClient
          .from("success_wall")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
      ]);

    setStat(statBookings, bookingsRes.count || 0);
    setStat(statTestimonials, testimonialsRes.count || 0);
    setStat(statQuestions, questionsRes.count || 0);
    setStat(statSuccess, successRes.count || 0);
  } catch (e) {
    console.error("Stats load error:", e);
    if (statBookings) statBookings.textContent = "--";
    if (statTestimonials) statTestimonials.textContent = "--";
    if (statQuestions) statQuestions.textContent = "--";
    if (statSuccess) statSuccess.textContent = "--";
  }
}

loadStats();
setInterval(loadStats, 20000);
