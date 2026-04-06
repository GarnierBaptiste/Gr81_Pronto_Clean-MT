function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatRemaining(seconds) {
  if (seconds <= 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function buildMachines() {
  const machines = [];

  for (let i = 1; i <= 10; i++) {
    machines.push({
      id: `W${i}`,
      type: "Lave-linge",
      remainingSeconds: i % 3 === 0 ? 0 : (i * 3) * 60,
    });
  }

  for (let i = 1; i <= 10; i++) {
    machines.push({
      id: `D${i}`,
      type: "Sèche-linge",
      remainingSeconds: i % 4 === 0 ? 0 : (i * 2) * 60,
    });
  }

  return machines;
}

function renderMachines() {
  const grid = document.getElementById("machinesGrid");
  if (!grid) return;

  const machines = buildMachines();
  grid.innerHTML = "";

  for (const m of machines) {
    const available = m.remainingSeconds <= 0;
    const chipClass = available ? "good" : "warn";
    const chipText = available ? "Disponible" : `Reste ${formatRemaining(m.remainingSeconds)}`;

    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="itemTop">
        <div class="itemTitle">${escapeHtml(m.id)}</div>
        <span class="chip ${chipClass}">${escapeHtml(chipText)}</span>
      </div>
    `;

    grid.appendChild(el);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderMachines();
});
