const questionsMsg = document.getElementById("questionsMsg");
const questionsList = document.getElementById("questionsList");
const refreshQuestionsBtn = document.getElementById("refreshQuestionsBtn");

const qName = document.getElementById("qName");
const qMessage = document.getElementById("qMessage");
const qSubmitBtn = document.getElementById("qSubmitBtn");
const qSubmitMsg = document.getElementById("qSubmitMsg");

function escIndexQ(s = "") {
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

function fmtIndexQDate(ts) {
  try {
    return new Date(ts).toLocaleDateString();
  } catch {
    return String(ts || "");
  }
}

async function logQuestionActivity(message) {
  try {
    if (!message) return;
    await window.supabaseClient.from("activity_feed").insert({ message });
  } catch (e) {
    console.warn("Question activity log failed:", e);
  }
}

function renderQuestions(rows) {
  if (!rows || rows.length === 0) {
    questionsMsg.textContent = "No public questions yet. Be the first to ask.";
    questionsList.innerHTML = "";
    return;
  }

  questionsMsg.textContent = "";

  questionsList.innerHTML = rows
    .map(
      (q) => `
      <div class="card">
        <div style="font-size:18px; color:#1e5bff;">
          <i class="fa-solid fa-comment-dots"></i>
        </div>

        <p style="margin:10px 0 0; line-height:1.6; white-space:pre-wrap;">
          ${escIndexQ(q.message)}
        </p>

        <p style="margin:10px 0 0; font-weight:800;">
          — ${escIndexQ(q.name)}
        </p>

        <p class="muted" style="margin:6px 0 0; font-size:12px;">
          ${escIndexQ(fmtIndexQDate(q.created_at))}
        </p>
      </div>
    `,
    )
    .join("");
}

async function loadQuestionsHome() {
  questionsMsg.textContent = "Loading questions...";
  questionsList.innerHTML = "";

  try {
    const { data, error } = await window.supabaseClient
      .from("public_questions")
      .select("id,name,message,created_at")
      .eq("is_approved", true)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) throw error;

    renderQuestions(data || []);
  } catch (e) {
    console.error(e);
    questionsMsg.textContent =
      "Failed to load public questions. Please refresh the page.";
  }
}

qSubmitBtn?.addEventListener("click", async () => {
  const name = (qName.value || "").trim();
  const message = (qMessage.value || "").trim();

  qSubmitMsg.textContent = "";

  if (!name || !message) {
    qSubmitMsg.textContent = "Please enter your name and message.";
    return;
  }

  try {
    qSubmitBtn.disabled = true;
    qSubmitMsg.textContent = "Submitting...";

    const { error } = await window.supabaseClient
      .from("public_questions")
      .insert({
        name,
        message,
        is_approved: false,
        is_active: true,
      });

    if (error) throw error;

    await logQuestionActivity(`${name} asked a public question.`);

    qName.value = "";
    qMessage.value = "";

    qSubmitMsg.textContent =
      "✅ Submitted successfully. Your question will appear after admin approval.";
  } catch (e) {
    console.error(e);
    qSubmitMsg.textContent = `Error: ${e.message}`;
  } finally {
    qSubmitBtn.disabled = false;
  }
});

refreshQuestionsBtn?.addEventListener("click", loadQuestionsHome);
loadQuestionsHome();
