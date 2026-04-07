const AUTH_KEY = "isLoggedIn";
const USER_EMAIL_KEY = "userEmail";
const USER_FULL_NAME_KEY = "userFullName";

function isLoggedIn() {
  return localStorage.getItem(AUTH_KEY) === "true";
}

function setLoggedIn(value) {
  localStorage.setItem(AUTH_KEY, value ? "true" : "false");
}

function clearUserInfo() {
  localStorage.removeItem(USER_EMAIL_KEY);
  localStorage.removeItem(USER_FULL_NAME_KEY);
}

function applyAuthToLink(el) {
  if (!el) return;

  if (isLoggedIn()) {
    el.textContent = "Se déconnecter";

    if (el.tagName.toLowerCase() === "a") {
      el.setAttribute("href", "#");
      el.addEventListener("click", (e) => {
        e.preventDefault();
        setLoggedIn(false);
        clearUserInfo();
        window.location.href = "../../Index.html";
      });
    } else {
      el.addEventListener("click", () => {
        setLoggedIn(false);
        clearUserInfo();
        window.location.href = "../../Index.html";
      });
    }
  } else {
    el.textContent = "Se connecter";
    if (el.tagName.toLowerCase() === "a") {
      el.setAttribute("href", "../Connexion/Connexion.html");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applyAuthToLink(document.getElementById("btnConnexion"));
  applyAuthToLink(document.getElementById("btnAuth"));
});
