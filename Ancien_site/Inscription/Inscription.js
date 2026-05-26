document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnDoSignup");
  const emailInput = document.getElementById("signupEmail");
  const pass1 = document.getElementById("signupPass");
  const pass2 = document.getElementById("signupPass2");
  const after = document.getElementById("signupAfter");

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

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function isValidImtEmail(email) {
    const trimmed = String(email || "").trim().toLowerCase();
    return /^[a-z]+\.[a-z-]+@imt-atlantique\.net$/.test(trimmed);
  }

  if (!btn) return;

  btn.addEventListener("click", async () => {
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

    try {
      const resp = await fetch("/api/inscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password: p1,
        }),
      });

      if (!resp.ok) {
        if (after) {
          after.style.display = "block";
          after.textContent = "Erreur: impossible d'enregistrer l'inscription (serveur).";
        }
        return;
      }
    } catch {
      if (after) {
        after.style.display = "block";
        after.textContent = "Erreur: serveur indisponible. Lance server.js puis réessaie.";
      }
      return;
    }

    users.push({
      email,
      password: p1,
      createdAt: Date.now(),
    });
    writeJson(STORAGE.USERS, users);

    if (after) {
      after.style.display = "block";
      after.textContent = "Compte créé. Tu peux maintenant te connecter.";
    }
  });
});
