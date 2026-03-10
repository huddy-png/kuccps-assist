const qRefreshBtn = document.getElementById("qRefreshBtn");
const qMsg = document.getElementById("qMsg");
const qList = document.getElementById("qList");

function escQ(s = "") {
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

function fmtQ(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts || "");
  }
}

let qBusy = false;

function setQBusy(state) {
  qBusy = state;
  qRefreshBtn.disabled = state;
  qList
    .querySelectorAll("button[data-q-action]")
    .forEach((b) => (b.disabled = state));
}

function setQMsg(text, type = "info") {
  qMsg.textContent = text || "";
  qMsg.style.color =
    type === "error" ? "#b91c1c" : type === "success" ? "#166534" : "";
}

async function loadQuestions() {
  setQMsg("Loading questions...");
  qList.innerHTML = "";

  const { data, error } = await window.supabaseClient
    .from("public_questions")
    .select("id,name,message,is_approved,is_active,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    setQMsg(`Error: ${error.message}`, "error");
    return;
  }

  if (!data || data.length === 0) {
    setQMsg("No questions yet.");
    return;
  }

  setQMsg("");

  qList.innerHTML = data
    .map(
      (q) => `
      <div class="card">
        <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
          <div style="min-width:240px; flex:1;">
            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
              <span class="badge">${q.is_approved ? "Approved" : "Pending"}</span>
              <span style="padding:4px 8px;border-radius:999px;background:rgba(2,6,23,0.06);font-size:12px;">
                ${q.is_active ? "Active" : "Hidden"}
              </span>
            </div>

            <h2 style="margin:10px 0 0; font-size:16px;">${escQ(q.name)}</h2>
            <p style="margin:10px 0 0; white-space:pre-wrap; line-height:1.6;">
              ${escQ(q.message)}
            </p>

            <p class="muted" style="margin-top:10px; font-size:12px;">
              Submitted: ${escQ(fmtQ(q.created_at))}
            </p>
          </div>

          <div class="actions" style="align-items:flex-start; display:flex; flex-direction:column; gap:8px; min-width:180px;">
            <button data-q-action="toggle_approve" data-id="${q.id}">
              ${q.is_approved ? "Unapprove" : "Approve"}
            </button>

            <button data-q-action="toggle_active" data-id="${q.id}">
              ${q.is_active ? "Hide" : "Make Active"}
            </button>

            <button data-q-action="delete" data-id="${q.id}">
              Delete
            </button>
          </div>
        </div>
      </div>
    `,
    )
    .join("");

  qList.querySelectorAll("button[data-q-action]").forEach((btn) => {
    btn.addEventListener("click", () =>
      handleQuestionAction(btn.dataset.qAction, btn.dataset.id),
    );
  });
}

async function handleQuestionAction(action, id) {
  if (qBusy) return;

  try {
    setQBusy(true);
    setQMsg("");

    const { data: row, error: rowErr } = await window.supabaseClient
      .from("public_questions")
      .select("id,is_approved,is_active")
      .eq("id", id)
      .maybeSingle();

    if (rowErr) throw rowErr;
    if (!row) {
      setQMsg("Question not found.", "error");
      return;
    }

    if (action === "toggle_approve") {
      setQMsg("Saving...");
      const { error } = await window.supabaseClient
        .from("public_questions")
        .update({ is_approved: !row.is_approved })
        .eq("id", id);

      if (error) throw error;

      setQMsg("✅ Approval updated.", "success");
      await loadQuestions();
      return;
    }

    if (action === "toggle_active") {
      setQMsg("Saving...");
      const { error } = await window.supabaseClient
        .from("public_questions")
        .update({ is_active: !row.is_active })
        .eq("id", id);

      if (error) throw error;

      setQMsg("✅ Visibility updated.", "success");
      await loadQuestions();
      return;
    }

    if (action === "delete") {
      const ok = confirm("Delete this question permanently?");
      if (!ok) return;

      setQMsg("Deleting...");
      const { error } = await window.supabaseClient
        .from("public_questions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setQMsg("✅ Question deleted.", "success");
      await loadQuestions();
    }
  } catch (e) {
    console.error(e);
    setQMsg(`Error: ${e.message}`, "error");
  } finally {
    setQBusy(false);
  }
}

qRefreshBtn?.addEventListener("click", loadQuestions);
loadQuestions();
