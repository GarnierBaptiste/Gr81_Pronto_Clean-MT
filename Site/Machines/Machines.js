function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const STORAGE = {
  MACHINES: "pronto_machines_state",
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

function formatRemaining(seconds) {
  if (seconds <= 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function reserveMachine(machineId, seconds) {
  const saved = readJson(STORAGE.MACHINES, {});
  const prev = saved && saved[machineId] ? saved[machineId] : {};
  const next = {
    ...prev,
    remainingSeconds: seconds,
  };
  writeJson(STORAGE.MACHINES, {
    ...saved,
    [machineId]: next,
  });
}

function tickMachines() {
  const saved = readJson(STORAGE.MACHINES, {});
  let changed = false;

  for (const id of Object.keys(saved || {})) {
    const s = saved[id];
    if (!s || typeof s.remainingSeconds !== "number") continue;
    if (s.remainingSeconds <= 0) continue;

    const next = Math.max(0, s.remainingSeconds - 1);
    if (next !== s.remainingSeconds) {
      saved[id] = {
        ...s,
        remainingSeconds: next,
      };
      changed = true;
    }
  }

  if (changed) {
    writeJson(STORAGE.MACHINES, saved);
    renderMachines();
  }
}

function resetAllMachines() {
  const machines = buildMachines();
  const nextSaved = {};
  for (const m of machines) {
    nextSaved[m.id] = {
      remainingSeconds: 0,
      reservedByEmail: null,
    };
  }
  writeJson(STORAGE.MACHINES, nextSaved);
  renderMachines();
}

function buildMachines() {
  const machines = [];
  const saved = readJson(STORAGE.MACHINES, {});

  for (let i = 1; i <= 20; i++) {
    const id = `Machine ${i}`;
    const s = saved && saved[id] ? saved[id] : null;
    machines.push({
      id,
      type: "Lave-linge",
      remainingSeconds: typeof s?.remainingSeconds === "number" ? s.remainingSeconds : (i % 3 === 0 ? 0 : (i * 3) * 60),
      reservedByEmail: typeof s?.reservedByEmail === "string" ? s.reservedByEmail : null,
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
    el.id = `machine-${m.id}`;
    el.className = "item";
    el.innerHTML = `
      <div class="itemTop">
        <div class="itemTitle">${escapeHtml(m.id)}</div>
        <span class="chip ${chipClass}">${escapeHtml(chipText)}</span>
      </div>
      <div class="itemActions">
        <button type="button" class="btnMail" data-machine-id="${escapeHtml(m.id)}" ${available ? "" : "disabled"}>Réserver</button>
      </div>
    `;

    const btn = el.querySelector(".btnMail");
    if (btn) {
      btn.addEventListener("click", () => {
        if (m.remainingSeconds > 0) return;
        reserveMachine(m.id, 30 * 60);
        renderMachines();
      });
    }

    grid.appendChild(el);
  }

  const targetId = String(window.location.hash || "").replace(/^#/, "").trim();
  if (targetId) {
    const target = document.getElementById(`machine-${targetId}`);
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }
  }

  const nextSaved = {};
  for (const m of machines) {
    nextSaved[m.id] = {
      remainingSeconds: m.remainingSeconds,
      reservedByEmail: m.reservedByEmail,
    };
  }
  writeJson(STORAGE.MACHINES, nextSaved);
}

document.addEventListener("DOMContentLoaded", () => {
  renderMachines();
  setInterval(tickMachines, 1000);

  const btnReset = document.getElementById("btnResetAllMachines");
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      resetAllMachines();
    });
  }
});
