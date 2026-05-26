const STORAGE = {
  AUTH: "isLoggedIn",
  EMAIL: "userEmail",
  FULL_NAME: "userFullName",
  MSGS: "commimt_forum_messages",
  PHOTOS: "commimt_forum_photos",
};

function isLoggedIn() {
  return localStorage.getItem(STORAGE.AUTH) === "true";
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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

function setupReset() {
  const btn = document.getElementById("btnResetForums");
  if (!btn) return;

  btn.addEventListener("click", () => {
    localStorage.setItem(STORAGE.MSGS, JSON.stringify([]));
    localStorage.setItem(STORAGE.PHOTOS, JSON.stringify([]));
    renderMessages();
    renderPhotos();
  });
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatTime(ts) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function wrapMessage(text, limit = 50) {
  const t = String(text || "").trim();
  if (t.length <= limit) return t;
  if (t.includes("\n")) return t;

  const left = t.lastIndexOf(" ", limit);
  const right = t.indexOf(" ", limit);

  let cut = -1;
  if (left !== -1 && right !== -1) {
    cut = limit - left <= right - limit ? left : right;
  } else if (left !== -1) {
    cut = left;
  } else if (right !== -1) {
    cut = right;
  }

  if (cut === -1) {
    cut = limit;
  }

  const first = t.slice(0, cut).trimEnd();
  const second = t.slice(cut).trimStart();
  return `${first}\n${second}`;
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

function currentFullName() {
  const stored = localStorage.getItem(STORAGE.FULL_NAME);
  if (stored) return stored;
  const email = localStorage.getItem(STORAGE.EMAIL);
  if (email) return deriveFullNameFromEmail(email);
  return "Utilisateur";
}

function seedIfEmpty() {
  const msgs = readJson(STORAGE.MSGS, null);
  if (!msgs) {
    writeJson(STORAGE.MSGS, [
    ]);
  }

  const photos = readJson(STORAGE.PHOTOS, null);
  if (!photos) {
    writeJson(STORAGE.PHOTOS, [
    ]);
  }
}

function renderReadonly() {
  const logged = isLoggedIn();

  const msgInfo = document.getElementById("msgReadonly");
  const photoInfo = document.getElementById("photoReadonly");

  const msgText = document.getElementById("msgText");
  const btnMsg = document.getElementById("btnPostMsg");

  const photoTitle = document.getElementById("photoTitle");
  const photoText = document.getElementById("photoText");
  const photoFile = document.getElementById("photoFile");
  const btnPhoto = document.getElementById("btnPostPhoto");

  if (msgInfo) msgInfo.style.display = logged ? "none" : "block";
  if (photoInfo) photoInfo.style.display = logged ? "none" : "block";

  if (msgText) msgText.disabled = !logged;
  if (btnMsg) btnMsg.disabled = !logged;

  if (photoTitle) photoTitle.disabled = !logged;
  if (photoText) photoText.disabled = !logged;
  if (photoFile) photoFile.disabled = !logged;
  if (btnPhoto) btnPhoto.disabled = !logged;
}

function renderMessages() {
  const list = document.getElementById("msgList");
  if (!list) return;

  const msgs = readJson(STORAGE.MSGS, []).slice().sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  list.innerHTML = "";

  const me = isLoggedIn() ? currentFullName() : null;

  for (const m of msgs) {
    const author = m.author || "Utilisateur";
    const isOwn = me && author === me;

    const row = document.createElement("div");
    row.className = `postRow ${isOwn ? "own" : "other"}`;

    const el = document.createElement("div");
    el.className = `post ${isOwn ? "own" : "other"}`;
    el.innerHTML = `
      <div class="postTop">
        <div class="postAuthor">${escapeHtml(author)}</div>
        <div class="postTime">${escapeHtml(formatTime(m.createdAt || Date.now()))}</div>
      </div>
      <div class="postText">${escapeHtml(wrapMessage(m.text || ""))}</div>
    `;

    row.appendChild(el);
    list.appendChild(row);
  }

  list.scrollTop = list.scrollHeight;
}

function renderPhotos() {
  const list = document.getElementById("photoList");
  if (!list) return;

  const photos = readJson(STORAGE.PHOTOS, []).slice().sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  list.innerHTML = "";

  const me = isLoggedIn() ? currentFullName() : null;

  for (const p of photos) {
    const author = p.author || "Utilisateur";
    const isOwn = me && author === me;

    const row = document.createElement("div");
    row.className = `postRow ${isOwn ? "own" : "other"}`;

    const el = document.createElement("div");
    el.className = `post ${isOwn ? "own" : "other"}`;

    const title = p.title
      ? `<div class="postText" style="margin-top: 8px; font-weight: 900;">${escapeHtml(wrapMessage(p.title))}</div>`
      : "";
    const text = p.text ? `<div class="postText">${escapeHtml(wrapMessage(p.text))}</div>` : "";
    const photo = p.imgDataUrl
      ? `<div class="photo"><img src="${p.imgDataUrl}" alt="${escapeHtml(p.title || "Photo")}" /></div>`
      : "";

    el.innerHTML = `
      <div class="postTop">
        <div class="postAuthor">${escapeHtml(author)}</div>
        <div class="postTime">${escapeHtml(formatTime(p.createdAt || Date.now()))}</div>
      </div>
      ${title}
      ${text}
      ${photo}
    `;

    row.appendChild(el);
    list.appendChild(row);
  }

  list.scrollTop = list.scrollHeight;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function setupPosting() {
  const btnMsg = document.getElementById("btnPostMsg");
  const msgText = document.getElementById("msgText");

  if (btnMsg && msgText) {
    btnMsg.addEventListener("click", () => {
      if (!isLoggedIn()) return;
      const text = msgText.value.trim();
      if (!text) return;

      const msgs = readJson(STORAGE.MSGS, []);
      msgs.push({
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        author: currentFullName(),
        text,
        createdAt: Date.now(),
      });
      writeJson(STORAGE.MSGS, msgs);
      msgText.value = "";
      renderMessages();
    });
  }

  const btnPhoto = document.getElementById("btnPostPhoto");
  const photoTitle = document.getElementById("photoTitle");
  const photoText = document.getElementById("photoText");
  const photoFile = document.getElementById("photoFile");

  if (btnPhoto && photoTitle && photoText && photoFile) {
    btnPhoto.addEventListener("click", async () => {
      if (!isLoggedIn()) return;

      const title = photoTitle.value.trim();
      const text = photoText.value.trim();
      const file = photoFile.files && photoFile.files[0] ? photoFile.files[0] : null;

      if (!title && !text && !file) return;

      let imgDataUrl = null;
      if (file) {
        try {
          imgDataUrl = await fileToDataUrl(file);
        } catch {
          imgDataUrl = null;
        }
      }

      const photos = readJson(STORAGE.PHOTOS, []);
      photos.push({
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        author: currentFullName(),
        title: title || "Photo",
        text,
        imgDataUrl,
        createdAt: Date.now(),
      });
      writeJson(STORAGE.PHOTOS, photos);

      photoTitle.value = "";
      photoText.value = "";
      photoFile.value = "";
      renderPhotos();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  seedIfEmpty();
  renderReadonly();
  renderMessages();
  renderPhotos();
  setupPosting();
  setupReset();
});
