document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnDoLogin");
  const emailInput = document.getElementById("loginEmail");
  const passInput = document.getElementById("loginPass");
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

  btn.addEventListener("click", () => {
    const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
    if (!isValidImtEmail(email)) {
      if (emailInput) emailInput.focus();
      return;
    }

    const users = readJson(STORAGE.USERS, []);
    const pass = passInput ? passInput.value : "";

    if (users.length > 0) {
      const user = users.find((u) => (u.email || "").toLowerCase() === email);
      if (!user) {
        if (emailInput) emailInput.focus();
        return;
      }

      if (!user.verified) {
        return;
      }

      if (String(user.password || "") !== String(pass || "")) {
        if (passInput) passInput.focus();
        return;
      }
    }

    const fullName = deriveFullNameFromEmail(email);

    localStorage.setItem("userEmail", email);
    localStorage.setItem("userFullName", fullName);
    localStorage.setItem("isLoggedIn", "true");
    window.location.href = "../../Index.html";
  });
});
