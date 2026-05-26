from __future__ import annotations

import csv
import os
import re
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory


BASE_DIR = Path(__file__).resolve().parent
CSV_PATH = BASE_DIR / "connexion.csv"
DONNEE_PATH = BASE_DIR / "donnee.csv"

app = Flask(__name__, static_folder=None)


SEUIL = 0.15
_calibration: dict[str, float] | None = None

_accel_logs: list[str] = []
_ACCEL_LOGS_MAX = 300
_machine1_override: str | None = None  # "running" | "reset" | None


def ensure_csv_exists() -> None:
    if CSV_PATH.exists() and CSV_PATH.stat().st_size > 0:
        return

    CSV_PATH.write_text("Mail;Mdp;Nom;Prenom\n", encoding="utf-8")


def read_users() -> list[dict[str, str]]:
    ensure_csv_exists()

    with CSV_PATH.open("r", encoding="utf-8", newline="") as f:
        reader = csv.reader(f, delimiter=";")
        rows = list(reader)

    if not rows:
        return []

    header = [h.strip() for h in rows[0]]
    users: list[dict[str, str]] = []

    for r in rows[1:]:
        if not r or all((c or "").strip() == "" for c in r):
            continue
        users.append(
            {
                "mail": (r[0] if len(r) > 0 else "").strip(),
                "mdp": (r[1] if len(r) > 1 else "").strip(),
                "nom": (r[2] if len(r) > 2 else "").strip(),
                "prenom": (r[3] if len(r) > 3 else "").strip(),
            }
        )

    return users


def append_user(mail: str, mdp: str, nom: str, prenom: str) -> None:
    ensure_csv_exists()

    with CSV_PATH.open("a", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, delimiter=";", lineterminator="\n")
        writer.writerow([mail, mdp, nom, prenom])


def ensure_donnee_exists() -> None:
    if DONNEE_PATH.exists() and DONNEE_PATH.stat().st_size > 0:
        return

    DONNEE_PATH.write_text("timestamp,x_g,y_g,f_g\n", encoding="utf-8")


def append_donnee_row(timestamp: str, x_g: float, y_g: float, f_g: float) -> None:
    ensure_donnee_exists()
    with DONNEE_PATH.open("a", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, delimiter=",", lineterminator="\n")
        writer.writerow([timestamp, f"{x_g:.4f}", f"{y_g:.4f}", f"{f_g:.4f}"])


def format_timestamp(dt: datetime) -> str:
    # Format attendu côté front: année-jour-moisTHH:mm:ss.sss
    ms = int(dt.microsecond / 1000)
    return (
        f"{dt.year:04d}-{dt.day:02d}-{dt.month:02d}T"
        f"{dt.hour:02d}:{dt.minute:02d}:{dt.second:02d}.{ms:03d}"
    )


def parse_accel_line(line: str) -> tuple[float, float, float] | None:
    # Exemple: Accel: x=0.52g  y=-0.09g  z=0.98g
    m = re.search(
        r"Accel:\s*x=([+-]?(?:\d+\.?\d*|\d*\.?\d+))g\s*y=([+-]?(?:\d+\.?\d*|\d*\.?\d+))g\s*z=([+-]?(?:\d+\.?\d*|\d*\.?\d+))g",
        line,
        flags=re.IGNORECASE,
    )
    if not m:
        return None
    return (float(m.group(1)), float(m.group(2)), float(m.group(3)))


def _push_accel_log(msg: str) -> None:
    _accel_logs.append(msg)
    if len(_accel_logs) > _ACCEL_LOGS_MAX:
        del _accel_logs[: len(_accel_logs) - _ACCEL_LOGS_MAX]


@app.get("/")
def root():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/<path:filename>")
def static_files(filename: str):
    # Sert tous tes fichiers HTML/CSS/CSV/images depuis le dossier du projet.
    return send_from_directory(BASE_DIR, filename)


@app.post("/api/inscription")
def api_inscription():
    data = request.get_json(silent=True) or {}

    mail = str(data.get("mail", "")).strip()
    mdp = str(data.get("password", "")).strip()

    if not mail or not mdp:
        return jsonify({"ok": False, "error": "mail_et_mdp_obligatoires"}), 400

    users = read_users()
    mail_lower = mail.lower()
    if any(u["mail"].lower() == mail_lower for u in users):
        return jsonify({"ok": False, "error": "mail_deja_inscrit"}), 409

    # Déduire prenom/nom depuis le mail (format prenom.nom@...)
    local = mail.split("@", 1)[0]
    parts = local.split(".")
    prenom = parts[0] if len(parts) >= 1 else ""
    nom = parts[1] if len(parts) >= 2 else ""

    append_user(mail, mdp, nom, prenom)

    return jsonify({"ok": True, "user": {"mail": mail, "nom": nom, "prenom": prenom}})


@app.post("/api/accel")
def api_accel():
    global _calibration

    x: float | None = None
    y: float | None = None
    z: float | None = None

    data = request.get_json(silent=True)
    if isinstance(data, dict) and all(k in data for k in ("x", "y", "z")):
        try:
            x = float(data.get("x"))
            y = float(data.get("y"))
            z = float(data.get("z"))
        except (TypeError, ValueError):
            return jsonify({"ok": False, "error": "valeurs_invalides"}), 400

        _push_accel_log(f"JSON: x={x:.2f}g y={y:.2f}g z={z:.2f}g")
    else:
        raw = request.get_data(cache=False, as_text=True) or ""
        if raw.strip():
            _push_accel_log(raw.strip())
        parsed = parse_accel_line(raw)
        if not parsed:
            # On accepte aussi les logs qui ne sont pas des mesures (boot, messages MicroPython, etc.)
            # et on ne met pas à jour la calibration / le CSV dans ce cas.
            return jsonify({"ok": True, "ignored": True})
        x, y, z = parsed

    if _calibration is None:
        _calibration = {"x": x, "y": y, "z": z}

    dx = abs(x - _calibration["x"])
    dy = abs(y - _calibration["y"])
    dz = abs(z - _calibration["z"])

    is_free = dx <= SEUIL and dy <= SEUIL and dz <= SEUIL
    f_g = 1.0 if is_free else 0.0

    ts = format_timestamp(datetime.now())
    append_donnee_row(ts, x, y, f_g)

    return jsonify(
        {
            "ok": True,
            "timestamp": ts,
            "calibration": _calibration,
            "threshold": SEUIL,
            "diff": {"x": dx, "y": dy, "z": dz},
            "is_free": is_free,
            "f_g": f_g,
        }
    )


@app.get("/api/accel/logs")
def api_accel_logs():
    return jsonify({"ok": True, "logs": _accel_logs})


if __name__ == "__main__":
    # Lancer: python server.py
    # Puis ouvrir: http://127.0.0.1:8000/
    port = int(os.environ.get("PORT", "8000"))
    app.run(host="0.0.0.0", port=port, debug=False)


@app.post("/api/machine1/start")
def api_machine1_start():
    global _machine1_override
    _machine1_override = "running"
    return jsonify({"ok": True, "state": "running"})


@app.post("/api/machine1/reset")
def api_machine1_reset():
    global _machine1_override, _calibration
    _machine1_override = "reset"
    # Réinitialise aussi la calibration pour que le prochain envoi recalibre
    _calibration = None
    return jsonify({"ok": True, "state": "reset"})


@app.get("/api/machine1/state")
def api_machine1_state():
    return jsonify({"ok": True, "override": _machine1_override})
