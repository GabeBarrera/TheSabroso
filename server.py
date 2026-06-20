#!/usr/bin/env python3
"""
Sabroso local dev server
Serves static files + a tiny REST API that writes back to data/*.json

Usage:
    python server.py          # port 8000
    python server.py 9000     # custom port

API (all under /api/):
    GET  /api/ping                → {"ok": true}
    GET  /api/restaurants         → restaurants.json array
    GET  /api/recipes             → recipes.json array
    GET  /api/notes               → notes.json array
    POST /api/restaurants         → body = full JSON array → overwrites data/restaurants.json
    POST /api/recipes             → body = full JSON array → overwrites data/recipes.json
    POST /api/notes               → body = full JSON array → overwrites data/notes.json

No pip installs required — stdlib only.
"""

import json
import os
import sys
import shutil
import tempfile
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


ROOT     = Path(__file__).parent.resolve()
DATA_DIR = ROOT / "data"


class Handler(SimpleHTTPRequestHandler):

    # ── Route dispatch ──────────────────────────────────────────────────────

    def do_OPTIONS(self):
        self._send_cors_preflight()

    def do_GET(self):
        clean = self.path.split("?")[0].rstrip("/")
        if clean.startswith("/api"):
            self._handle_api("GET", clean)
        else:
            super().do_GET()

    def do_POST(self):
        clean = self.path.split("?")[0].rstrip("/")
        if clean.startswith("/api"):
            self._handle_api("POST", clean)
        else:
            self._json(405, {"error": "method not allowed"})

    # ── API handler ─────────────────────────────────────────────────────────

    def _handle_api(self, method, path):
        # /api/ping
        if path == "/api/ping":
            return self._json(200, {"ok": True})

        # /api/restaurants  |  /api/recipes  |  /api/notes
        parts = [p for p in path.split("/") if p]   # ["api", "restaurants"]
        if len(parts) < 2 or parts[1] not in ("restaurants", "recipes", "notes"):
            return self._json(404, {"error": "unknown endpoint"})

        kind      = parts[1]                          # "restaurants" | "recipes" | "notes"
        file_path = DATA_DIR / f"{kind}.json"

        if method == "GET":
            data = self._read_json(file_path)
            self._json(200, data)

        elif method == "POST":
            try:
                body = self._read_body()
            except Exception as exc:
                return self._json(400, {"error": f"bad body: {exc}"})

            if not isinstance(body, list):
                return self._json(400, {"error": "body must be a JSON array"})

            self._write_json(file_path, body)
            self._json(200, {"ok": True, "count": len(body), "file": str(file_path.relative_to(ROOT))})
            print(f"  💾  wrote {len(body)} entries → {file_path.relative_to(ROOT)}")

        else:
            self._json(405, {"error": "method not allowed"})

    # ── Helpers ─────────────────────────────────────────────────────────────

    def _read_json(self, path):
        if not path.exists():
            return []
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _write_json(self, path, data):
        """Atomic write: write to a temp file then rename."""
        path.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            shutil.move(tmp, path)
        except Exception:
            try:
                os.unlink(tmp)
            except OSError:
                pass
            raise

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        raw    = self.rfile.read(length)
        return json.loads(raw)

    def _json(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Type",   "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_cors_preflight(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, fmt, *args):
        # suppress static-file noise; only show API calls and errors
        msg = fmt % args if args else fmt
        if "/api/" in msg or (args and str(args[1]) >= "400"):
            print(f"  {msg}")


# ── Entry point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    os.chdir(ROOT)   # serve files relative to this script's directory

    server = ThreadingHTTPServer(("", port), Handler)

    print(f"\n  🌮  Sabroso dev server")
    print(f"      http://localhost:{port}")
    print(f"      http://localhost:{port}/editor.html")
    print(f"  📁  data dir: {DATA_DIR}")
    print(f"  Ctrl+C to stop\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopped.")
