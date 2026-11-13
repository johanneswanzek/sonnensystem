# Ergebnisse der Aufbereitung in die Seite übernehmen: Dauer und Zeitmarken je Clip (Konstanten VOICE_DE, VOICE_EN, VOICE_PL)
# und die Einblendzeiten der Ozean- und Kontinentnamen (GEO_T_DE, GEO_T_EN, GEO_T_PL).
#
#   python tools/audio/finalize.py [--lang en|pl]
#
# Deutsch: liest work/res1.json und work/res2.json (Ausgaben von proc.py). Die Einleitung gibt es dort in zwei Fassungen
# (overview_a, overview_b); die besser erkannte wird zu public/voice/overview.mp3.
# Andere Sprachen: liest alle Dateien work/res.<Sprache>*.json (Ausgaben von proc.py --lang <Sprache>).
# Geschrieben wird jeweils nur die Zeile der gewählten Sprache in src/sonnensystem.html.
import glob, json, os, shutil, sys
R=(os.environ.get('SONNENSYSTEM_ROOT') or os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))+os.sep
SRC=R+'src/sonnensystem.html'
LANG=sys.argv[2] if len(sys.argv)>2 and sys.argv[1]=='--lang' else 'de'
res={}
for f in ([R+'work/res1.json',R+'work/res2.json'] if LANG=='de' else sorted(glob.glob(R+'work/res.'+LANG+'*.json'))):
    try: res.update(json.load(open(f,encoding='utf-8')))
    except FileNotFoundError: print('fehlt:',f)
if LANG=='de':
    best=max(('overview_a','overview_b'),key=lambda k:(res[k]['ratio'],-res[k]['d'])); print('Einleitung: Fassung',best,{k:(res[k]['ratio'],res[k]['d']) for k in ('overview_a','overview_b')})
    shutil.copy(R+'public/voice/'+best+'.mp3',R+'public/voice/overview.mp3'); res['overview']=res[best]
ids=['overview','sun','mercury','venus','earth','earth_geo','earth_core','mars','mars_base','belt','jupiter','saturn','uranus','neptune','outro']
V={}
for k in ids:
    r=res[k]; cues={c:t for c,t in r['cues'].items()}
    assert all(t is not None for t in cues.values()),(k,cues)
    ts=list(cues.values()); assert ts==sorted(ts),(k,cues)
    V[k]={'d':r['d'],'cues':cues}
    print('%-11s %6.2fs  Übereinstimmung %.3f  %s'%(k,r['d'],r['ratio'],cues if cues else ''))
s=open(SRC,encoding='utf-8').read()
def line(name,value):
    """Ersetzt die Zeile 'const <name> = ...;' in der Seite."""
    global s
    i=s.index('const '+name+' = '); j=s.index('\n',i)
    s=s[:i]+'const '+name+' = '+value+';'+s[j:]
line('VOICE_'+LANG.upper(),json.dumps(V,separators=(',',':')))
# Namen der Ozeane und Kontinente erscheinen, wenn der Sprecher sie nennt. proc.py liefert die Zeitpunkte von elf Wörtern in fester
# Reihenfolge: Pazifik, Atlantik, Indischer Ozean, die eisigen Meere (für beide Polarmeere), dann die sieben Kontinente.
w=list(res['earth_geo']['words'].values()); assert len(w)==11 and all(t is not None for t in w),w
co=V['earth_geo']['cues']['oceans']; cc=V['earth_geo']['cues']['continents']
off=lambda t,base,lead=.15: round(max(0,t-base-lead),2)
sea=[off(t,co) for t in w[:4]]; geo=sea+[round(sea[3]+.5,2)]+[off(t,cc) for t in w[4:]]
print('Namen:',geo)
line('GEO_T_'+LANG.upper(),json.dumps(geo,separators=(',',':')))
open(SRC,'w',encoding='utf-8',newline='\n').write(s); print('Seite aktualisiert',len(s))
