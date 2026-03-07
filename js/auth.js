// js/auth.js

const emailEl = document.getElementById("email");
const loginBtn = document.getElementById("loginBtn");
const msgEl = document.getElementById("message");

// read ?next=service.html?slug=...
const params = new URLSearchParams(window.location.search);
const nextUrl = params.get("next") || "index.html";

function safeNext(url) {
  // prevent external redirects
  if (!url) return "index.html";
  if (url.startsWith("http://") || url.startsWith("https://"))
    return "index.html";

  // strip leading slash ("/index.html" -> "index.html")
  if (url.startsWith("/")) return url.slice(1);

  return url; // "service.html?slug=..." or "index.html"
}

function buildRedirectTo() {
  // Always return a fully qualified URL (Supabase expects it)
  const nextSafe = safeNext(nextUrl);
  return new URL(nextSafe, window.location.origin).toString();
}

const DEFAULT_BTN_TEXT = "Send Magic Link";
const COOLDOWN_SECONDS = 60;
const COOLDOWN_KEY = "kas_magiclink_cooldown_until";
let sending = false;

function getCooldownUntil() {
  const v = localStorage.getItem(COOLDOWN_KEY);
  const n = v ? Number(v) : 0;
  return Number.isFinite(n) ? n : 0;
}

function setCooldown(seconds = COOLDOWN_SECONDS) {
  const until = Date.now() + seconds * 1000;
  localStorage.setItem(COOLDOWN_KEY, String(until));
  return until;
}

function clearCooldown() {
  localStorage.removeItem(COOLDOWN_KEY);
}

function secondsLeft() {
  const until = getCooldownUntil();
  const now = Date.now();
  if (until <= now) return 0;
  return Math.max(0, Math.ceil((until - now) / 1000));
}

function setBtn(text, disabled) {
  loginBtn.textContent = text;
  loginBtn.disabled = disabled;
}

function setMsg(text) {
  msgEl.textContent = text || "";
}

function updateCooldownUI() {
  if (sending) {
    setBtn("Sending...", true);
    return true;
  }

  const left = secondsLeft();
  if (left > 0) {
    setBtn(`Wait ${left}s...`, true);

    // Don’t overwrite real errors; only show the gentle cooldown message if empty
    if (!msgEl.textContent || msgEl.textContent.startsWith("Please wait")) {
      setMsg(`Please wait ${left}s before sending another link...`);
    }
    return true;
  }

  // cooldown ended
  clearCooldown();
  setBtn(DEFAULT_BTN_TEXT, false);
  if (msgEl.textContent.startsWith("Please wait")) setMsg("");
  return false;
}

async function redirectIfLoggedIn() {
  const { data, error } = await window.supabaseClient.auth.getSession();
  if (error) console.error("getSession error:", error);

  if (data?.session) {
    window.location.href = safeNext(nextUrl);
    return true;
  }
  return false;
}

/**
 * Handles cases where Supabase returns to this page with hash tokens.
 * In some configs, the magic link opens a URL that contains a session in the hash.
 * If a session is established, we redirect to next immediately.
 */
async function handleMagicLinkCallback() {
  // If URL contains a hash, Supabase may need to process it
  // We simply wait a tick and then check session.
  if (window.location.hash && window.location.hash.length > 1) {
    // Optional: remove hash from URL after processing (clean URL)
    // We'll check session first to avoid breaking flow.
    const ok = await redirectIfLoggedIn();
    if (ok) {
      // clean URL after session is confirmed
      history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
      return true;
    }
  }
  return false;
}

// If user already logged in, go back immediately
redirectIfLoggedIn();

// Run cooldown UI on load + every second
updateCooldownUI();
setInterval(updateCooldownUI, 1000);

// React instantly when auth state changes (magic link confirmed)
window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (session) {
    window.location.href = safeNext(nextUrl);
  }
});

// Try handle hash callback (if link opens this page directly)
handleMagicLinkCallback();

loginBtn.addEventListener("click", async () => {
  if (sending) return;
  if (updateCooldownUI()) return;

  const email = (emailEl.value || "").trim();
  if (!email) {
    setMsg("Enter your email first.");
    return;
  }

  sending = true;
  updateCooldownUI();
  setMsg("Sending magic link...");

  const redirectTo = buildRedirectTo();

  const { error } = await window.supabaseClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });

  sending = false;

  if (error) {
    const em = String(error.message || "");

    // If rate limited, enforce longer cooldown
    if (
      em.toLowerCase().includes("rate") &&
      em.toLowerCase().includes("limit")
    ) {
      setCooldown(120);
      setMsg(`Error: ${em} (wait 2 minutes and try again)`);
      updateCooldownUI();
      return;
    }

    setMsg(`Error: ${em}`);
    updateCooldownUI();
    return;
  }

  // Start cooldown after success
  setCooldown(COOLDOWN_SECONDS);
  setMsg("✅ Magic link sent. Check your email and open it to finish login.");
  updateCooldownUI();
});
