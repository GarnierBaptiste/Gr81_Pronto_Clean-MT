from __future__ import annotations

import argparse
import sys
import time
import urllib.request

import serial


def post_line(url: str, line: str) -> None:
    data = line.encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "text/plain; charset=utf-8"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        _ = resp.read()


def main() -> int:
    p = argparse.ArgumentParser(description="Bridge MicroPython serial output to Flask /api/accel")
    p.add_argument("--port", required=True, help="Serial port (ex: COM3)")
    p.add_argument("--baud", type=int, default=115200, help="Baud rate (default: 115200)")
    p.add_argument(
        "--url",
        default="http://127.0.0.1:8000/api/accel",
        help="Flask endpoint receiving the raw lines",
    )
    p.add_argument("--print", action="store_true", help="Print received lines")
    args = p.parse_args()

    try:
        ser = serial.Serial(args.port, args.baud, timeout=1)
    except Exception as e:
        print(f"Unable to open serial port {args.port}: {e}", file=sys.stderr)
        return 2

    print(f"Listening on {args.port} @ {args.baud} baud")
    print(f"Forwarding to {args.url}")

    try:
        while True:
            raw = ser.readline()
            if not raw:
                continue

            try:
                line = raw.decode("utf-8", errors="replace").strip()
            except Exception:
                continue

            if not line:
                continue

            if args.print:
                print(line)

            try:
                post_line(args.url, line)
            except Exception as e:
                print(f"HTTP forward error: {e}", file=sys.stderr)
                time.sleep(0.5)

    except KeyboardInterrupt:
        return 0
    finally:
        try:
            ser.close()
        except Exception:
            pass


if __name__ == "__main__":
    raise SystemExit(main())
