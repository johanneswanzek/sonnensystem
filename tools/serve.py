#!/usr/bin/env python3
"""Lokaler Entwicklungsserver.

    python tools/serve.py [Port]        -> http://localhost:8080

index.html wird bei jedem Aufruf frisch aus src/sonnensystem.html gebaut (ändern, speichern, neu laden),
alles andere kommt direkt aus public/. Ein Doppelklick auf eine HTML-Datei reicht nicht: Browser laden Ton,
Karten und Modelle nicht von der Festplatte.
"""
import http.server, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
PUBLIC = os.path.join(build.ROOT, 'public')


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = dict(http.server.SimpleHTTPRequestHandler.extensions_map,
                          **{'.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.js': 'text/javascript', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml'})

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC, **kwargs)

    def do_GET(self):
        if self.path.split('?')[0] in ('/', '/index.html'):
            try:
                body, status = build.page(build.config()).encode('utf-8'), 200
            except SystemExit as e:          # Fehlermeldung des Builds im Browser zeigen statt den Server zu beenden
                body, status = ('<pre>%s</pre>' % e).encode('utf-8'), 500
            self.send_response(status)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)
        else:
            super().do_GET()

    def log_message(self, fmt, *args):
        if args and str(args[1]) != '200':   # nur Auffälliges melden
            super().log_message(fmt, *args)


if __name__ == '__main__':
    with http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler) as srv:
        print('Sonnensystem läuft auf http://localhost:%d  (Strg+C beendet)' % PORT)
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            pass
