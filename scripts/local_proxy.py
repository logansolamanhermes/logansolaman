#!/usr/bin/env python3
"""Local HTTP/1.1 proxy for one storefront whose HTTP/2 is broken.

masterpesthk.com closes HTTP/2 streams (ERR_HTTP2_PROTOCOL_ERROR /
ERR_EMPTY_RESPONSE in Chromium) but answers fine over HTTP/1.1. Chromium's
--disable-http2 does not help. This serves the page and its same-origin assets
over plain local HTTP, fetched upstream with curl --http1.1.

Only used for screenshot capture. Not part of the deployed site.
"""
import http.server, subprocess, threading, urllib.parse, os, sys, time

UPSTREAM = "https://www.masterpesthk.com"


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path
        url = UPSTREAM + path if path.startswith("/") else path
        try:
            r = None
            for attempt in range(3):
                r = subprocess.run(["curl", "-sS", "-L", "--http1.1", "-m", "30",
                                    "-w", "\n__CT__%{content_type}", url],
                                   capture_output=True, timeout=40)
                if len(r.stdout) > 1000:
                    break
                time.sleep(3)
            raw = r.stdout
            marker = b"\n__CT__"
            ctype = "text/html; charset=utf-8"
            if marker in raw:
                body, ct = raw.rsplit(marker, 1)
                ctype = ct.decode("utf-8", "ignore").strip() or ctype
            else:
                body = raw
            if ctype.startswith("text/html"):
                body = body.replace(b"https://www.masterpesthk.com", b"http://127.0.0.1:8891")
                body = body.replace(b"https://masterpesthk.com", b"http://127.0.0.1:8891")
                body = body.replace(b"http://www.masterpesthk.com", b"http://127.0.0.1:8891")
                body = body.replace(b"http://masterpesthk.com", b"http://127.0.0.1:8891")
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            self.send_error(502, str(e)[:100])

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8891
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"proxy on http://127.0.0.1:{port} -> {UPSTREAM} (HTTP/1.1)", flush=True)
    srv.serve_forever()
