/* LLIONTRI Supabase authentication */
const SUPABASE_URL = "https://ataruosnvbwhvdctshxv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_vzE6bS-KlTgvne2ZVAg7k_Q_RaR7KgbT";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

async function currentSession() {
  const { data, error } = await sb.auth.getSession();
  if (error) throw error;
  return data.session;
}

function showMessage(message, type = "error") {
  const el = document.getElementById("message");
  if (!el) return;
  el.textContent = message;
  el.dataset.type = type;
  el.hidden = false;
}

async function requireSession() {
  try {
    const session = await currentSession();
    if (!session) {
      const next = encodeURIComponent(location.pathname + location.search);
      location.replace("auth.html?next=" + next);
      return null;
    }
    return session;
  } catch (error) {
    showMessage("Could not verify your session. Refresh and try again.");
    return null;
  }
}

function safeNextPath() {
  const candidate = new URLSearchParams(location.search).get("next") || "account.html";
  // Only allow local relative paths, never external redirects.
  if (!/^(account\.html|index\.html)(\?.*)?$/.test(candidate)) return "account.html";
  return candidate;
}

document.addEventListener("DOMContentLoaded", async () => {
  const signInForm = document.getElementById("signin-form");
  const signUpForm = document.getElementById("signup-form");
  const switchLink = document.getElementById("switch-mode");
  const authPanel = document.getElementById("auth-panel");
  const accountName = document.getElementById("account-name");

  if (signInForm || signUpForm) {
    const { data: { session } } = await sb.auth.getSession();
    if (session) location.replace(safeNextPath());

    if (switchLink) switchLink.addEventListener("click", (event) => {
      event.preventDefault();
      const signup = signUpForm.hidden;
      signUpForm.hidden = !signup;
      signInForm.hidden = signup;
      switchLink.textContent = signup ? "I already have an account" : "Create an account";
      authPanel.querySelector("h1").textContent = signup ? "Create your account" : "Welcome back";
    });

    signInForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = signInForm.querySelector("button[type=submit]");
      button.disabled = true;
      try {
        const { error } = await sb.auth.signInWithPassword({
          email: signInForm.email.value.trim(),
          password: signInForm.password.value
        });
        if (error) throw error;
        location.replace(safeNextPath());
      } catch (error) {
        showMessage(error.message || "Sign in failed.");
      } finally { button.disabled = false; }
    });

    signUpForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = signUpForm.querySelector("button[type=submit]");
      button.disabled = true;
      try {
        const email = signUpForm.email.value.trim();
        const password = signUpForm.password.value;
        if (password.length < 8) throw new Error("Use a password with at least 8 characters.");
        const { data, error } = await sb.auth.signUp({
          email, password,
          options: { data: { full_name: signUpForm.full_name.value.trim() } }
        });
        if (error) throw error;
        if (data.session) location.replace(safeNextPath());
        else showMessage("Account created. Check your email to confirm your address, then sign in.", "success");
      } catch (error) {
        showMessage(error.message || "Account creation failed.");
      } finally { button.disabled = false; }
    });
  }

  if (accountName) {
    const session = await requireSession();
    if (!session) return;
    accountName.textContent = session.user.user_metadata?.full_name || session.user.email || "Your account";
    const email = document.getElementById("account-email");
    if (email) email.textContent = session.user.email || "";
    document.getElementById("signout")?.addEventListener("click", async () => {
      const { error } = await sb.auth.signOut();
      if (error) showMessage(error.message);
      else location.replace("index.html");
    });
  }

  const authLink = document.getElementById("auth-link");
  if (authLink) {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      authLink.textContent = "My account";
      authLink.href = "account.html";
    }
  }
});
