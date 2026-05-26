document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnDoLogin");
  const emailInput = document.getElementById("loginEmail");
  const passInput = document.getElementById("loginPass");
  const errorEl = document.getElementById("loginError");
  if (!btn) return;

  const STORAGE = {
    USERS: "pronto_users",
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

  function deriveFullNameFromEmail(email) {
    const beforeAt = String(email || "").split("@")[0] || "";
    const parts = beforeAt.split(".").filter(Boolean);
    if (parts.length < 2) return "Utilisateur";

    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const first = cap(parts[0].toLowerCase());
    const last = cap(parts.slice(1).join(" ").toLowerCase());
    return `${first} ${last}`;
  }

  function isValidImtEmail(email) {
    const trimmed = String(email || "").trim().toLowerCase();
    return /^[a-z]+\.[a-z-]+@imt-atlantique\.net$/.test(trimmed);
  }

  function showError(msg) {
    if (!errorEl) return;
    errorEl.style.display = "block";
    errorEl.textContent = msg;
  }

  function clearError() {
    if (!errorEl) return;
    errorEl.style.display = "none";
    errorEl.textContent = "";
  }

  btn.addEventListener("click", async () => {
    clearError();
    const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
    if (!isValidImtEmail(email)) {
      if (emailInput) emailInput.focus();
      return;
    }

    const pass = passInput ? passInput.value : "";

    try {
      const resp = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password: pass,
        }),
      });

      if (!resp.ok) {
        showError("L'adresse mail ou le mot de passe n'est pas reconnu");
        return;
      }
    } catch {
      showError("Serveur indisponible. Lance server.js puis réessaie.");
      return;
    }

    const fullName = deriveFullNameFromEmail(email);

    localStorage.setItem("userEmail", email);
    localStorage.setItem("userFullName", fullName);
    localStorage.setItem("isLoggedIn", "true");
    window.location.href = "../index.html";
  });
});
