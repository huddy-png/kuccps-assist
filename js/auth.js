// js/auth.js

const emailEl = document.getElementById("email");
const loginBtn = document.getElementById("loginBtn");
const msgEl = document.getElementById("message");

// read ?next=service.html?slug=...
const params = new URLSearchParams(window.location.search);
const nextUrl = params.get("next") || "index.html";

const DEFAULT_BTN_TEXT = "Send Magic Link";
const COOLDOWN_SECONDS = 60;
const COOLDOWN_KEY = "kas_magiclink_cooldown_until";

let sending = false;

function safeNext(url) {
  if (!url) return "index.html";

  const trimmed = String(url).trim();

  // prevent external redirects
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("//")
  ) {
    return "index.html";
  }

  // strip leading slash ("/index.html" -> "index.html")
  if (trimmed.startsWith("/")) return trimmed.slice(1);

  return trimmed;
}

function buildRedirectTo() {
  // IMPORTANT:
  // The magic link should return to login.html first,
  // so this file can finish auth and then redirect to `next`.
  const nextSafe = safeNext(nextUrl);
  const callbackUrl = new URL("login.html", window.location.origin);
  callbackUrl.searchParams.set("next", nextSafe);
  return callbackUrl.toString();
}

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
  if (!loginBtn) return;
  loginBtn.textContent = text;
  loginBtn.disabled = disabled;
}

function setMsg(text) {
  if (!msgEl) return;
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

    if (!msgEl.textContent || msgEl.textContent.startsWith("Please wait")) {
      setMsg(`Please wait ${left}s before sending another link...`);
    }
    return true;
  }

  clearCooldown();
  setBtn(DEFAULT_BTN_TEXT, false);

  if (msgEl.textContent.startsWith("Please wait")) {
    setMsg("");
  }

  return false;
}

function redirectToNext() {
  window.location.href = safeNext(nextUrl);
}

async function redirectIfLoggedIn() {
  const { data, error } = await window.supabaseClient.auth.getSession();
  if (error) console.error("getSession error:", error);

  if (data?.session) {
    redirectToNext();
    return true;
  }

  return false;
}

async function handleMagicLinkCallback() {
  // Supabase may return tokens in the hash or query string.
  // We simply check session after page load.
  const hasHash = window.location.hash && window.location.hash.length > 1;
  const hasCode = new URLSearchParams(window.location.search).has("code");

  if (hasHash || hasCode) {
    const ok = await redirectIfLoggedIn();

    if (ok) {
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

// If already logged in, redirect immediately
redirectIfLoggedIn();

// Run cooldown UI on load + every second
updateCooldownUI();
setInterval(updateCooldownUI, 1000);

// React instantly when auth state changes
window.supabaseClient.auth.onAuthStateChange(async (_event, session) => {
  if (session) {
    redirectToNext();
  }
});

// Try handle callback if user came back from magic link
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
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  sending = false;

  if (error) {
    const em = String(error.message || "");

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

  setCooldown(COOLDOWN_SECONDS);
  setMsg("✅ Magic link sent. Check your email and open it to finish login.");
  updateCooldownUI();
});
