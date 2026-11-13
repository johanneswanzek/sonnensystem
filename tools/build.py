#!/usr/bin/env python3
"""Baut die Website.

    python tools/build.py              -> dist/   (das, was veröffentlicht wird)
    python tools/build.py --apache     -> dist/ mit .htaccess für einen Apache-Webspace (z. B. STRATO)
    python tools/build.py --test       -> .test/  (Seite mit Prüfhaken für tools/test/run.js)

Die Seite selbst steht vollständig in src/sonnensystem.html (Stil, Markup, Programm). Diese Datei ist zugleich
die Fassung für claude.ai-Artefakte und hat deshalb kein <html>/<head>/<body>. Hier wird daraus ein vollständiges
Dokument: Kopf dazu, Bibliotheken und Schriften aus public/vendor statt von fremden Servern, Modelle als GLB.
Alles unter public/ wird unverändert dazukopiert. Es gibt keine weiteren Abhängigkeiten als Python 3.
"""
import html, json, os, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def config():
    with open(os.path.join(ROOT, 'site.json'), encoding='utf-8') as f:
        return json.load(f)


def source():
    with open(os.path.join(ROOT, 'src', 'sonnensystem.html'), encoding='utf-8') as f:
        return f.read()


def swap(s, old, new):
    """Ersetzt genau ein Vorkommen; alles andere ist ein Fehler im Quelltext oder in diesem Skript."""
    if s.count(old) != 1:
        raise SystemExit('build.py: erwartet genau ein Vorkommen von %r, gefunden %d' % (old[:70], s.count(old)))
    return s.replace(old, new)


def page(cfg, test=False, desk=False):
    """Liefert das vollständige HTML-Dokument."""
    s = source()
    # Kopfzeilen der Artefakt-Fassung entfernen, Abhängigkeiten auf lokale Dateien umstellen
    s = swap(s, '<meta name="claude:viewport-fit-sides" content="cover">\n', '')
    s = swap(s, '<title>Sonnensystem Kamerafahrt</title>\n', '')
    i = s.index('<link rel="stylesheet" href="https://fonts.googleapis.com/')
    s = s[:i] + s[s.index('\n', i) + 1:]
    s = swap(s, '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>', '<script src="vendor/three.min.js"></script>')
    s = swap(s, '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>', '<script src="vendor/GLTFLoader.js"></script>')
    s = swap(s, "L.load('models/' + n + '.json',", "L.load('models/' + n + '.glb',")
    if 'https://' in s or 'http://' in s.replace('http://www.w3.org/', ''):
        raise SystemExit('build.py: die Seite verweist noch auf eine fremde Adresse')
    if test:
        s = hooks(s, desk)

    url = cfg['url'].rstrip('/') + '/'
    esc = lambda k: html.escape(cfg[k], quote=True)
    # Titel und Beschreibung der anderen Sprachen reicht die Seite selbst nach (window.SITE.i18n), der Kopf bleibt deutsch
    site = {'impressum': cfg.get('impressum', ''), 'datenschutz': cfg.get('datenschutz', ''), 'i18n': cfg.get('i18n', {})}
    alt = ''.join('<link rel="alternate" hreflang="%s" href="%s?lang=%s">\n' % (l, html.escape(url, quote=True), l) for l in ['de'] + sorted(cfg.get('i18n', {})))
    alt += '<link rel="alternate" hreflang="x-default" href="%s">\n' % html.escape(url, quote=True)
    head = '''<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>%(title)s</title>
<meta name="description" content="%(description)s">
<meta name="theme-color" content="#04060c">
<link rel="canonical" href="%(url)s">
%(alt)s<meta property="og:type" content="website">
<meta property="og:url" content="%(url)s">
<meta property="og:title" content="%(title)s">
<meta property="og:description" content="%(description)s">
<meta property="og:image" content="%(url)svorschau.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="vendor/fonts/fonts.css">
<script>window.SITE = %(site)s;</script>
<style>
html,body{margin:0}
[hidden]{display:none !important}
</style>
''' % {'title': esc('title'), 'description': esc('description'), 'url': html.escape(url, quote=True), 'site': json.dumps(site, ensure_ascii=False).replace('</', '<\\/'), 'alt': alt}
    i = s.index('<style>')
    j = s.index('</style>') + len('</style>')
    return (head + s[i:j] + '\n</head>\n<body>\n'
            '<noscript><p style="margin:24px;font:16px system-ui;color:#ece8dc">Diese Seite braucht JavaScript und WebGL.</p></noscript>\n'
            + s[j:].strip() + '\n</body>\n</html>\n')


def hooks(s, desk):
    """Prüfhaken für tools/test/run.js: Zugriff auf Fokus, Zeit und Kamera. Nur in der Testseite, nie in dist/."""
    s = swap(s, 'boot().catch',
             "window.__t = {focus, setStage, step, seek: x => { narStart = performance.now()-x*1000; }, "
             "pr: x => { PR.v = [x,x]; PR.hi = [x,x]; PR.lo = x; PR.fix = true; setPR(); }, "
             "get st(){ return {cur,stage,trans,surfOn,veil,grp,mbT,pr:PR.v[surfOn ? 1 : 0],ui,wide,topH,botH,dwell,durCur}; }, get PR(){ return PR; }};\n"
             "boot().catch")
    # Marsbasis: freie Kamera (window.__cam = [x,y,z, lx,ly,lz]), feste Erzählzeit (window.__mbt) und feste Uhr (window.__clk)
    a = "cam.lookAt(v1.x+Math.sin(v2.x)*cp*50,v1.y+Math.sin(v2.y)*50,v1.z+Math.cos(v2.x)*cp*50);"
    s = swap(s, a, a + " if (window.__cam) { const c = window.__cam; cam.position.set(c[0],c[1],c[2]); cam.lookAt(c[3],c[4],c[5]); }")
    s = swap(s, "MB.update(mbT,dt,clock,reduced)", "MB.update(mbT,dt,window.__clk != null ? window.__clk : clock,reduced)")
    s = swap(s, "if (down) mbT = narT();", "if (down) mbT = window.__mbt != null ? window.__mbt : narT();")
    if not desk:
        # Ohne Grafikkarte dauert die volle Desktop-Ausstattung (große Schattenkarte, mehr Steine) Sekunden je Bild
        s = swap(s, "const DESKTOP = !!(window.matchMedia", "const DESKTOP = false && !!(window.matchMedia")
    return s


HTACCESS = '''# Dateitypen, Komprimierung und Cache für Apache. Jeder Block greift nur, wenn das Modul vorhanden ist.
<IfModule mod_mime.c>
  AddType model/gltf-binary .glb
  AddType font/woff2 .woff2
  AddType audio/mpeg .mp3
  AddType image/svg+xml .svg
</IfModule>
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript image/svg+xml model/gltf-binary
</IfModule>
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 10 minutes"
  ExpiresByType text/css "access plus 7 days"
  ExpiresByType text/javascript "access plus 7 days"
  ExpiresByType application/javascript "access plus 7 days"
  ExpiresByType audio/mpeg "access plus 7 days"
  ExpiresByType image/jpeg "access plus 7 days"
  ExpiresByType model/gltf-binary "access plus 7 days"
  ExpiresByType font/woff2 "access plus 1 year"
</IfModule>
'''


def build(out, apache=False, test=False, desk=False):
    cfg = config()
    dst = os.path.join(ROOT, out)
    shutil.rmtree(dst, ignore_errors=True)
    if test:
        os.makedirs(dst)                 # die Testseite liest public/ direkt, es wird nichts kopiert
    else:
        shutil.copytree(os.path.join(ROOT, 'public'), dst)
    with open(os.path.join(dst, 'index.html'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(page(cfg, test, desk))
    if apache:
        with open(os.path.join(dst, '.htaccess'), 'w', encoding='utf-8', newline='\n') as f:
            f.write(HTACCESS)
    n = size = 0
    for d, _, files in os.walk(dst):
        for name in files:
            n += 1
            size += os.path.getsize(os.path.join(d, name))
    print('%s: %d Dateien, %.1f MB' % (out, n, size / 1048576))


if __name__ == '__main__':
    args = sys.argv[1:]
    unknown = [a for a in args if a not in ('--apache', '--test', '--desk')]
    if unknown:
        raise SystemExit(__doc__)
    if '--test' in args:
        build('.test', test=True, desk='--desk' in args)
    else:
        build('dist', apache='--apache' in args)
