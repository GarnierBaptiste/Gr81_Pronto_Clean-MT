document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnDoLogin");
  const emailInput = document.getElementById("loginEmail");
  if (!btn) return;

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

    const fullName = deriveFullNameFromEmail(email);

    localStorage.setItem("userEmail", email);
    localStorage.setItem("userFullName", fullName);
    localStorage.setItem("isLoggedIn", "true");
    window.location.href = "../HomePage/HomePage.html";
  });
});
