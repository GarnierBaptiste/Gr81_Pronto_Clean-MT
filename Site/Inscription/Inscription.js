document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnDoSignup");
  const emailInput = document.getElementById("signupEmail");
  const pass1 = document.getElementById("signupPass");
  const pass2 = document.getElementById("signupPass2");
  const after = document.getElementById("signupAfter");

  const STORAGE = {
    USERS: "pronto_users",
    PENDING: "pronto_pending_email_verification",
  };

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function isValidImtEmail(email) {
    const trimmed = String(email || "").trim().toLowerCase();
    return /^[a-z]+\.[a-z-]+@imt-atlantique\.net$/.test(trimmed);
  }

  function makeToken() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function buildVerificationLink(token) {
    const url = new URL("../Verification/Verification.html", window.location.href);
    url.searchParams.set("token", token);
    return url.toString();
  }

  function buildMailto(email, verifyUrl) {
    const subject = "Clean'MT - Vérification de ton adresse mail";
    const body =
      `Bonjour,%0D%0A%0D%0A` +
      `Clique sur ce lien pour vérifier ton adresse mail Clean'MT :%0D%0A` +
      `${encodeURIComponent(verifyUrl)}%0D%0A%0D%0A` +
      `Si tu n'es pas à l'origine de cette demande, ignore ce message.%0D%0A`;

    return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${body}`;
  }

  if (!btn) return;

  btn.addEventListener("click", () => {
    const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
    const p1 = pass1 ? pass1.value : "";
    const p2 = pass2 ? pass2.value : "";

    if (!isValidImtEmail(email)) {
      if (emailInput) emailInput.focus();
      return;
    }

    if (!p1 || p1.length < 4) {
      if (pass1) pass1.focus();
      return;
    }

    if (p1 !== p2) {
      if (pass2) pass2.focus();
      return;
    }

    const users = readJson(STORAGE.USERS, []);
    const existing = users.find((u) => (u.email || "").toLowerCase() === email);
    if (existing) {
      return;
    }

    const token = makeToken();

    users.push({
      email,
      password: p1,
      verified: false,
      createdAt: Date.now(),
    });
    writeJson(STORAGE.USERS, users);

    writeJson(STORAGE.PENDING, {
      token,
      email,
      createdAt: Date.now(),
    });

    const verifyUrl = buildVerificationLink(token);
    const href = buildMailto(email, verifyUrl);

    if (after) {
      after.style.display = "block";
      after.textContent = "Compte créé. Un email de vérification va être préparé.";
    }

    window.location.href = href;
  });
});
