document.addEventListener("DOMContentLoaded", () => {
  const hint = document.getElementById("verifyHint");
  const actions = document.getElementById("verifyActions");

  if (hint) hint.textContent = "La vérification d'adresse email a été supprimée.";
  if (actions) actions.style.display = "none";
});
