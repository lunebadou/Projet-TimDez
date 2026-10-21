# Sert le dossier frontend/ sur le reseau Wi-Fi (port 8080) pour le telephone.
# - Remplace a la volee "http://127.0.0.1:5000" dans les .js par l'adresse du PC,
#   donc AUCUN fichier existant n'est modifie sur le disque.
# - Transmet les appels /api/... a Flask (127.0.0.1:5000).
# Uniquement la bibliotheque standard Python : rien a installer.
import os
import socket
import sys
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = 8080
FLASK = "http://127.0.0.1:5000"
HERE = os.path.dirname(os.path.abspath(__file__))
FRONTEND = os.path.join(HERE, "frontend")


def ip_locale():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    # ---------- API -> Flask ----------
    def proxy(self):
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else None
        headers = {k: v for k, v in self.headers.items()
                   if k.lower() not in ("host", "connection", "content-length", "origin", "referer")}
        req = urllib.request.Request(FLASK + self.path, data=body, headers=headers, method=self.command)
        try:
            resp = urllib.request.urlopen(req, timeout=30)
            status, rheaders, data = resp.status, resp.headers, resp.read()
        except urllib.error.HTTPError as e:
            status, rheaders, data = e.code, e.headers, e.read()
        except urllib.error.URLError:
            status, rheaders = 502, {}
            data = b'{"success": false, "message": "Flask ne repond pas. Est-il lance ?"}'
        self.send_response(status)
        self.send_header("Content-Type", rheaders.get("Content-Type", "application/json"))
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path.startswith("/api/"):
            return self.proxy()
        chemin = self.translate_path(self.path.split("?")[0])
        if chemin.endswith(".js") and os.path.isfile(chemin):
            with open(chemin, "rb") as f:
                data = f.read().replace(FLASK.encode(), b"")
            self.send_response(200)
            self.send_header("Content-Type", "application/javascript; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        return super().do_GET()

    def do_POST(self):
        self.proxy()

    def do_PUT(self):
        self.proxy()

    def do_DELETE(self):
        self.proxy()

    def do_OPTIONS(self):
        self.proxy()


if __name__ == "__main__":
    if not os.path.isdir(FRONTEND):
        sys.exit("Dossier 'frontend' introuvable a cote de ce script : " + FRONTEND)
    ip = ip_locale()
    print()
    print("=" * 60)
    print("  Sur le telephone (meme Wi-Fi), ouvrir :")
    print()
    print("      http://%s:%d/index.html" % (ip, PORT))
    print()
    print("  Laisser cette fenetre ouverte. Ctrl+C pour arreter.")
    print("=" * 60)
    print()
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
