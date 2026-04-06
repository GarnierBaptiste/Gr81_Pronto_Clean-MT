// Pour pouvoir afficher les messages/photos récent de la communauté IMT et 
// pour afficher 6 machines aléatoirement parmi les machines qui sont fini ou 
// qui vont bientôt se finir

const STORAGE = {
  LOST: "pronto_lost_items",
  CHAT: "pronto_chat_messages",
  COMMIMT_MSGS: "commimt_forum_messages",
  COMMIMT_PHOTOS: "commimt_forum_photos",
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

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatRemaining(seconds) {
  if (seconds <= 0) return "Terminé";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function seedIfEmpty() {
  const lost = readJson(STORAGE.LOST, null);
  if (!lost) {
    writeJson(STORAGE.LOST, [
      {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        title: "Chaussette",
        desc: "Trouvée près des sèche-linge.",
        imgDataUrl: null,
        createdAt: Date.now() - 1000 * 60 * 60,
      },
      {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + 1),
        title: "Clés",
        desc: "Petit trousseau (2 clés).",
        imgDataUrl: null,
        createdAt: Date.now() - 1000 * 60 * 25,
      },
    ]);
  }

  const chat = readJson(STORAGE.CHAT, null);
  if (!chat) {
    writeJson(STORAGE.CHAT, [
      {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + 2),
        name: "Alex",
        text: "J'ai trouvé une pièce de 2€ près de W3.",
        createdAt: Date.now() - 1000 * 60 * 12,
      },
      {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + 3),
        name: "Sam",
        text: "Si quelqu'un a vu un gant noir, dites-moi !",
        createdAt: Date.now() - 1000 * 60 * 5,
      },
    ]);
  }
}

function buildDemoMachines() {
  return [
    { id: "W1", type: "Lave-linge", remainingSeconds: 0 },
    { id: "W2", type: "Lave-linge", remainingSeconds: 2 * 60 + 10 },
    { id: "W3", type: "Lave-linge", remainingSeconds: 6 * 60 + 5 },
    { id: "W4", type: "Lave-linge", remainingSeconds: 12 * 60 + 50 },
    { id: "D1", type: "Sèche-linge", remainingSeconds: 0 },
    { id: "D2", type: "Sèche-linge", remainingSeconds: 1 * 60 + 40 },
    { id: "D3", type: "Sèche-linge", remainingSeconds: 9 * 60 + 0 },
    { id: "D4", type: "Sèche-linge", remainingSeconds: 0 },
    { id: "W5", type: "Lave-linge", remainingSeconds: 3 * 60 + 25 },
    { id: "D5", type: "Sèche-linge", remainingSeconds: 0 },
  ];
}

function pickSixSoonest(machines) {
  return machines
    .slice()
    .sort((a, b) => (a.remainingSeconds || 0) - (b.remainingSeconds || 0))
    .slice(0, 6);
}

function renderMachines() {
  const container = document.getElementById("machinesList");
  if (!container) return;

  const machines = buildDemoMachines();
  const selection = pickSixSoonest(machines);

  container.innerHTML = "";
  for (const m of selection) {
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
    container.appendChild(el);
  }
}

function renderCommunity() {
  const container = document.getElementById("communityFeed");
  if (!container) return;

  const msgs = readJson(STORAGE.COMMIMT_MSGS, []);
  const photos = readJson(STORAGE.COMMIMT_PHOTOS, []);

  const lastMsg = msgs.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0] || null;
  const lastPhoto = photos.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0] || null;

  container.innerHTML = "";

  {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="itemTop">
        <div class="itemTitle">Forum messages</div>
        <span class="chip good">Message</span>
      </div>
      <div class="itemMeta">${lastMsg ? escapeHtml(lastMsg.text || "") : ""}</div>
    `;
    container.appendChild(el);
  }

  {
    const el = document.createElement("div");
    el.className = "item";

    const thumb = lastPhoto && lastPhoto.imgDataUrl
      ? `<img class="communityThumb" src="${lastPhoto.imgDataUrl}" alt="${escapeHtml(lastPhoto.title || "Photo")}" />`
      : "";

    el.innerHTML = `
      <div class="itemTop">
        <div class="itemTitle">Forum photos</div>
        <span class="chip warn">Photo</span>
      </div>
      <div class="itemMeta">${lastPhoto ? escapeHtml(lastPhoto.title || lastPhoto.text || "") : ""}</div>
      ${thumb}
    `;
    container.appendChild(el);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  seedIfEmpty();
  renderMachines();
  renderCommunity();
});