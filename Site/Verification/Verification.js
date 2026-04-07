document.addEventListener("DOMContentLoaded", () => {
  const hint = document.getElementById("verifyHint");
  const actions = document.getElementById("verifyActions");

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

  function getTokenFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("token");
  }

  const token = getTokenFromUrl();
  if (!token) {
    if (hint) hint.textContent = "Lien de vérification invalide.";
    return;
  }

  const pending = readJson(STORAGE.PENDING, null);
  if (!pending || pending.token !== token) {
    if (hint) hint.textContent = "Ce lien n'est plus valide (ou déjà utilisé).";
    return;
  }

  const email = (pending.email || "").toLowerCase();
  const users = readJson(STORAGE.USERS, []);
  const idx = users.findIndex((u) => (u.email || "").toLowerCase() === email);
  if (idx === -1) {
    if (hint) hint.textContent = "Compte introuvable.";
    return;
  }

  users[idx] = {
    ...users[idx],
    verified: true,
    verifiedAt: Date.now(),
  };
  writeJson(STORAGE.USERS, users);
  localStorage.removeItem(STORAGE.PENDING);

  if (hint) hint.textContent = "Adresse email vérifiée. Tu peux maintenant te connecter.";
  if (actions) actions.style.display = "block";
});
