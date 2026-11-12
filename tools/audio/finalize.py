# Ergebnisse der Aufbereitung in die Seite übernehmen: Dauer und Zeitmarken je Clip (Konstante VOICE), Einblendzeiten der Ozean- und Kontinentnamen.
#
#   python tools/audio/finalize.py
#
# Liest work/res1.json und work/res2.json (Ausgaben von proc.py) und schreibt src/sonnensystem.html neu. Die Einleitung gibt es
# in zwei Fassungen (overview_a, overview_b); die besser erkannte wird zu public/voice/overview.mp3.
import json, os, re, shutil
R=(os.environ.get('SONNENSYSTEM_ROOT') or os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))+os.sep
SRC=R+'src/sonnensystem.html'
res={}
for f in ('res1.json','res2.json'):
    try: res.update(json.load(open(R+'work/'+f,encoding='utf-8')))
    except FileNotFoundError: print('fehlt:',f)
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
i=s.index('const VOICE = {'); j=s.index('\n',i)
s=s[:i]+'const VOICE = '+json.dumps(V,separators=(',',':'))+';'+s[j:]
# Namen der Ozeane und Kontinente erscheinen, wenn der Sprecher sie nennt
w=res['earth_geo']['words']; co=V['earth_geo']['cues']['oceans']; cc=V['earth_geo']['cues']['continents']
off=lambda word,base,lead=.15: round(max(0,w[word]-base-lead),2)
geo={'PAZIFIK':off('pazifik',co),'ATLANTIK':off('atlantik',co),'INDISCHER OZEAN':off('indische',co),'NORDPOLARMEER':off('eisigen',co),'SÜDPOLARMEER':round(off('eisigen',co)+.5,2),
     'ASIEN':off('asien',cc),'AFRIKA':off('afrika',cc),'NORDAMERIKA':off('nordamerika',cc),'SÜDAMERIKA':off('südamerika',cc),'ANTARKTIS':off('antarktis',cc),'EUROPA':off('europa',cc),'AUSTRALIEN':off('australien',cc)}
print('Namen:',geo)
for name,o in geo.items():
    m=re.search(r"\['"+re.escape(name)+r"',(-?\d+),(-?\d+),([01]),[\d.]+\]",s); assert m,name
    s=s[:m.start()]+"['%s',%s,%s,%s,%s]"%(name,m.group(1),m.group(2),m.group(3),o)+s[m.end():]
a="  const roverX = t => clamp(51.2+3.2*t,8,250);          // der Druckrover fährt auf der Piste nach Osten"
if a in s: s=s.replace(a,"  const roverX = t => clamp(215+3.2*(t-VOICE.mars_base.cues.rover-1.7),8,250);      // der Druckrover fährt auf der Piste nach Osten und ist zu seinem Stichwort im Bild")
open(SRC,'w',encoding='utf-8',newline='\n').write(s); print('Seite aktualisiert',len(s))
