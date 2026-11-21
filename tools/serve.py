"""Serve web/ locally for testing, with caching switched off so the browser never mixes old and new files.

  .venv/bin/python tools/serve.py          # then open http://localhost:8000
  .venv/bin/python tools/serve.py 8080
"""
import functools
import http.server
import sys
from pathlib import Path

WEB = Path(__file__).resolve().parents[1] / "web"


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(NoCache, directory=str(WEB)))
    print(f"Innstilt: http://localhost:{port}  (Ctrl+C to stop)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
