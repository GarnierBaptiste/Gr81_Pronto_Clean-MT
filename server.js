const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());

// Serve static files so the app can be accessed via http://localhost:3000/Site/index.html
app.use(express.static(path.join(__dirname)));

const CSV_PATH = path.join(__dirname, "inscrit.csv");

const CSV_HEADER = "email,password,prenom,nom";

function ensureCsvHeader() {
  try {
    if (!fs.existsSync(CSV_PATH)) {
      fs.writeFileSync(CSV_PATH, `${CSV_HEADER}\n`, "utf8");
      return;
    }

    const content = fs.readFileSync(CSV_PATH, "utf8");
    if (!content.trim()) {
      fs.writeFileSync(CSV_PATH, `${CSV_HEADER}\n`, "utf8");
      return;
    }

    const lines = content.split(/\r?\n/);
    const firstLine = (lines[0] || "").trim();
    if (firstLine === CSV_HEADER) {
      return;
    }

    // Migration depuis l'ancien format AVEC colonne 'verified'
    if (firstLine === "email,password,prenom,nom,verified") {
      const migrated = [
        CSV_HEADER,
        ...lines
          .slice(1)
          .filter(Boolean)
          .map((l) => {
            const cols = parseCsvLine(l);
            const email = cols[0] ?? "";
            const password = cols[1] ?? "";
            const prenom = cols[2] ?? "";
            const nom = cols[3] ?? "";
            return `${escapeCsv(email)},${escapeCsv(password)},${escapeCsv(prenom)},${escapeCsv(nom)}`;
          }),
      ];

      fs.writeFileSync(CSV_PATH, migrated.join("\n") + "\n", "utf8");
    }
  } catch (e) {
    // Let request handlers surface errors
  }
}

ensureCsvHeader();

function escapeCsv(value) {
  const s = String(value ?? "");
  // Quote and double-up quotes to be safe.
  return `"${s.replaceAll('"', '""')}"`;
}

function derivePrenomNom(email) {
  const lower = String(email || "").trim().toLowerCase();
  const at = lower.indexOf("@");
  const local = at >= 0 ? lower.slice(0, at) : lower;
  const dot = local.indexOf(".");

  const prenom = dot >= 0 ? local.slice(0, dot) : local;
  const nom = dot >= 0 ? local.slice(dot + 1) : "";

  return {
    prenom,
    nom,
  };
}

function parseCsvLine(line) {
  const fields = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = line[i + 1];
        if (next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ',') {
        fields.push(cur);
        cur = "";
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }

  fields.push(cur);
  return fields;
}

function readUsersFromCsv() {
  ensureCsvHeader();
  const raw = fs.readFileSync(CSV_PATH, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return [];

  const users = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const email = String(cols[0] || "").trim().toLowerCase();
    const password = String(cols[1] || "");
    const prenom = String(cols[2] || "");
    const nom = String(cols[3] || "");
    if (!email) continue;
    users.push({ email, password, prenom, nom });
  }
  return users;
}

function writeUsersToCsv(users) {
  const safe = Array.isArray(users) ? users : [];
  const lines = [CSV_HEADER];
  for (const u of safe) {
    const email = String(u?.email || "").trim().toLowerCase();
    if (!email) continue;
    const password = String(u?.password || "");
    const prenom = String(u?.prenom || "");
    const nom = String(u?.nom || "");
    lines.push(`${escapeCsv(email)},${escapeCsv(password)},${escapeCsv(prenom)},${escapeCsv(nom)}`);
  }
  fs.writeFileSync(CSV_PATH, lines.join("\n") + "\n", "utf8");
}

app.post("/api/inscription", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: "missing_email_or_password" });
  }

  try {
    ensureCsvHeader();

    const users = readUsersFromCsv();
    const existing = users.find((x) => (x.email || "").toLowerCase() === email);
    if (existing) {
      return res.status(409).json({ ok: false, error: "email_already_exists" });
    }

    const { prenom, nom } = derivePrenomNom(email);
    const line = `${escapeCsv(email)},${escapeCsv(password)},${escapeCsv(prenom)},${escapeCsv(nom)}\n`;
    fs.appendFileSync(CSV_PATH, line, "utf8");

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "csv_write_failed" });
  }
});

app.post("/api/login", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: "missing_email_or_password" });
  }

  try {
    const users = readUsersFromCsv();
    const u = users.find((x) => (x.email || "").toLowerCase() === email);
    if (!u) return res.status(401).json({ ok: false, error: "invalid_credentials" });
    if (String(u.password || "") !== String(password || "")) {
      return res.status(401).json({ ok: false, error: "invalid_credentials" });
    }

    return res.json({ ok: true, prenom: u.prenom, nom: u.nom });
  } catch {
    return res.status(500).json({ ok: false, error: "csv_read_failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
  console.log(`Open: http://localhost:${PORT}/Site/index.html`);
});
