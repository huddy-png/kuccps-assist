const statusText = document.getElementById("status");
const logoutBtn = document.getElementById("logoutBtn");
const loginLink = document.getElementById("loginLink");
const adminLink = document.getElementById("adminLink");

async function checkSessionAndRole() {
  const { data, error } = await window.supabaseClient.auth.getSession();
  if (error) console.error("Session error:", error);

  const session = data?.session;

  if (!session) {
    statusText.innerText = "Not logged in.";
    logoutBtn.style.display = "none";
    loginLink.style.display = "inline-block";
    adminLink.style.display = "none";
    return;
  }

  statusText.innerText = `Logged in as: ${session.user.email}`;
  logoutBtn.style.display = "inline-block";
  loginLink.style.display = "none";

  // Check if logged-in user is an admin
  const { data: adminRow, error: adminErr } = await window.supabaseClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (adminErr) {
    console.error("Admin check error:", adminErr);
    adminLink.style.display = "none";
    return;
  }

  adminLink.style.display = adminRow ? "inline-block" : "none";
}

logoutBtn.addEventListener("click", async () => {
  await window.supabaseClient.auth.signOut();
  await checkSessionAndRole();
});

checkSessionAndRole();
