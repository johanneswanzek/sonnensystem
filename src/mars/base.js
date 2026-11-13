// mars/base – Marsbasis (MB): eigene Szene auf der Oberfläche in Metern – Gelände, Bauten, Fahrzeuge, Kamerafahrt, Teilchen.
// Exporte: MB; initBase
// Hängt ab von: core/device.js, core/util.js, data/voice.js, i18n/index.js, mars/sky-shader.js, render/canvas-textures.js, render/renderer.js, render/scene.js, core/state.js
// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.

import * as THREE from 'three';
import { S } from '../core/state.js';
import { DESKTOP } from '../core/device.js';
import { TAU, clamp, ss } from '../core/util.js';
import { VOICE } from '../data/voice.js';
import { tr } from '../i18n/index.js';
import { SKY_FS } from './sky-shader.js';
import { hash, vnoise } from '../render/canvas-textures.js';
import { renderer } from '../render/renderer.js';
import { rockGeo } from '../render/scene.js';

// Belegt in initBase() (Reihenfolge des Starts, siehe main.js)
let MB;

export function initBase(){
MB = (function(){
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(46,1,.5,14000);
  const lin = h => new THREE.Color(h).convertSRGBToLinear();
  const sunDir = new THREE.Vector3(.73,.41,.55).normalize(), up = new THREE.Vector3(0,1,0);      // tief stehende Sonne von der Seite: lange Schatten
  const FLAT = [[120,-40,420],[430,-40,115]];                                // eingeebnete Flächen: x, z, Radius
  // Bauten, über die die Kamera steigt, statt hindurchzufahren: x, z, Radius, Höhe
  const OBST = [[12,-30,6,5],[0,0,9.5,10.5],[-18,-4,7.5,8.5],[15,-11,7.5,8.5],[3,18,7.5,8.5],[42,17,16,5.5],[-46,38,9,7.5],[-30,-25,11,6.5],[-9,-36,11,6.5],[430,-40,10,15],[275,-85,16,14],[62,-72,9,12],[90,-94,2,15.5],[30,-58,9,8]];
  const HAB = [[-18,-4,.35],[15,-11,2.7],[3,18,-1.35]];                       // Wohnmodule um die Kuppel: x, z, Drehung
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), s4 = new THREE.Vector3();
  let ready = false, sunL = null, knots = null, frameN = 0, M = null, roverLabel = null;
  const movers = [], blink = [];
  // Bewegtes: jede Funktion bekommt (t, dt, clk); t ist die Uhr des Sprechers, clk läuft frei
  const anim = [], padLights = [];
  let puffs = null, skyU = null, lander = null, shadowEvery = 4;
  const DUST = [.64,.44,.29], STEAM = [.8,.8,.84];
  const AST_YAW = 0, ROVER_YAW = 0;                 // Blickrichtung des Astronauten-Modells gegenüber der Laufrichtung
  // Krater: x, z, Radius, Tiefe
  const CRATERS = [[-185,-150,46,9],[150,235,58,11],[560,190,85,15],[-380,300,70,13],[420,-470,60,11],[-90,520,95,16]];
  // Stationen: Stichwort des Sprechers, Ankerpunkt (Höhe über Grund), Name, Kennzeile
  const labels = [['hab',[0,10,0],'WOHNMODULE','DRUCKKABINEN · TUNNEL · SCHLEUSEN'],['berm',[-20,5,-30],'STRAHLENSCHUTZ','2 BIS 3 M MARSBODEN ALS SCHILD'],
    ['green',[42,5.5,17],'GEWÄCHSHÄUSER','NAHRUNG UND SAUERSTOFF'],['solar',[-10,5,95],'SOLARFELD','SONNE 43 % SO STARK WIE AUF DER ERDE'],
    ['reactor',[300,9,-250],'KERNREAKTOREN','JE 10 KW · AUCH IM STAUBSTURM'],['isru',[275,13,-85],'TREIBSTOFFANLAGE','WASSER · SAUERSTOFF · METHAN'],
    ['pad',[430,14,-40],'LANDEPLATZ','430 M ABSTAND · SCHUTZWÄLLE'],['rover',[8,5.5,38],'DRUCKROVER','MEHRTÄGIGE FAHRTEN'],
    ['comm',[62,10.5,-72],'FUNKANLAGE','SIGNAL ZUR ERDE: 3 BIS 22 MIN']].map(l => ({cue:l[0], v:new THREE.Vector3(l[1][0],l[1][1],l[1][2]), n:tr(l[2]), f:tr(l[3])}));

  function hgt(x,z){
    let f = 1;
    for (const a of FLAT) f = Math.min(f, ss(a[2]*.75,a[2]*1.7,Math.hypot(x-a[0],z-a[1])));
    const far = Math.hypot(x,z);
    let h = f*((vnoise(x*.0017+11,7.3,z*.0017+3)-.5)*44+(vnoise(x*.007,2.1,z*.007)-.5)*8+(vnoise(x*.04,5.5,z*.04)-.5)*.9)+ss(700,2200,far)*vnoise(x*.0011+5,9,z*.0011)*190;
    h += 150*ss(.56,.64,vnoise(x*.00055+2,4,z*.00055+7))*ss(1100,1900,far);       // Tafelberge am Horizont
    for (const c of CRATERS) {                                                     // Mulde mit aufgeworfenem Rand
      const d = Math.hypot(x-c[0],z-c[1])/c[2];
      if (d < 1.6) h += c[3]*(.38*Math.exp(-Math.pow((d-1)/.2,2))-(d < 1 ? 1-d*d : 0));
    }
    return h;
  }
  function add(geo,mat,x,y,z,parent){ const m = new THREE.Mesh(geo,mat); m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true; (parent || sc).add(m); return m; }
  function grp(x,z,ry){ const g = new THREE.Group(); g.position.set(x,hgt(x,z),z); g.rotation.y = ry || 0; sc.add(g); return g; }
  function along(m,dx,dy,dz){ m.quaternion.setFromUnitVectors(up,v1.set(dx,dy,dz).normalize()); return m; }      // Zylinderachse in eine Richtung legen
  // Aufgeschütteter Marsboden: flach auslaufende Kuppe, die Bodentextur von oben aufgelegt, damit sie zum Gelände passt
  function mound(x,z,sx,sy,sz,ry,sink){
    const g = new THREE.SphereGeometry(1,44,14,0,TAU,0,Math.PI/2), p = g.attributes.position, uv = g.attributes.uv, c = Math.cos(ry || 0), s = Math.sin(ry || 0);
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), n = 1+.14*(vnoise(p.getX(i)*2.3+x,y*2.3,p.getZ(i)*2.3+z)-.5), lx = p.getX(i)*sx*n, lz = p.getZ(i)*sz*n;
      p.setXYZ(i,lx,y*y*sy*n,lz); uv.setXY(i,(x+lx*c+lz*s)/36,(z-lx*s+lz*c)/36);
    }
    g.computeVertexNormals();
    const m = add(g,M.soil,x,hgt(x,z)-(sink || 0),z); m.rotation.y = ry || 0;
    return m;
  }
  // Abstand eines Punkts zu einer Strecke
  function seg(x,z,x1,z1,x2,z2){ const dx = x2-x1, dz = z2-z1, u = clamp(((x-x1)*dx+(z-z1)*dz)/(dx*dx+dz*dz),0,1); return Math.hypot(x-x1-dx*u,z-z1-dz*u); }
  // flacher Streifen auf dem Boden: Fahrspur oder Kabel
  function strip(x1,z1,x2,z2,w,mat,y){
    const r = glow(new THREE.PlaneGeometry(Math.hypot(x2-x1,z2-z1),w),mat,(x1+x2)/2,hgt((x1+x2)/2,(z1+z2)/2)+y,(z1+z2)/2);
    r.rotation.x = -Math.PI/2; r.rotation.z = -Math.atan2(z2-z1,x2-x1); r.receiveShadow = true;
  }
  function glow(geo,mat,x,y,z,parent){ const m = add(geo,mat,x,y,z,parent); m.castShadow = false; m.receiveShadow = false; return m; }
  // Staub und Dampf: weiche Scheiben, die sich zur Kamera drehen. Alle Teilchen werden in jedem Bild neu aus der Zeit berechnet.
  function Puffs(n,fogC){
    const g = new THREE.InstancedBufferGeometry(), q = new THREE.PlaneGeometry(1,1);
    g.index = q.index; g.setAttribute('position',q.attributes.position); g.setAttribute('uv',q.attributes.uv);
    const pos = new Float32Array(n*3), sa = new Float32Array(n*3), col = new Float32Array(n*3);
    const aP = new THREE.InstancedBufferAttribute(pos,3), aS = new THREE.InstancedBufferAttribute(sa,3), aC = new THREE.InstancedBufferAttribute(col,3);
    g.setAttribute('iPos',aP); g.setAttribute('iSA',aS); g.setAttribute('iCol',aC);
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({uniforms:{fogC:{value:fogC}}, transparent:true, depthWrite:false,
      vertexShader:`attribute vec3 iPos; attribute vec3 iSA; attribute vec3 iCol; varying vec2 vU; varying vec3 vC; varying float vA; varying float vF;
        void main(){ vU=uv; vC=iCol; vA=iSA.y; vec4 mv=viewMatrix*vec4(iPos,1.0); vF=smoothstep(280.0,5600.0,-mv.z); mv.xy+=position.xy*vec2(iSA.x,iSA.x*iSA.z); gl_Position=projectionMatrix*mv; }`,
      fragmentShader:`uniform vec3 fogC; varying vec2 vU; varying vec3 vC; varying float vA; varying float vF;
        void main(){ float a=smoothstep(1.0,0.1,length(vU-0.5)*2.0); gl_FragColor=vec4(mix(vC,fogC,vF),a*a*vA);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
        }`}));
    m.frustumCulled = false; m.renderOrder = 6; sc.add(m);
    let k = 0;
    return {
      begin(){ k = 0; },
      put(x,y,z,size,alpha,c,flat){ if (k >= n || alpha < .004) return; pos[k*3] = x; pos[k*3+1] = y; pos[k*3+2] = z; sa[k*3] = size; sa[k*3+1] = alpha; sa[k*3+2] = flat || 1; col[k*3] = c[0]; col[k*3+1] = c[1]; col[k*3+2] = c[2]; k++; },
      end(){ g.instanceCount = k; m.visible = k > 0; aP.needsUpdate = aS.needsUpdate = aC.needsUpdate = true; }
    };
  }
  // Kleine Kistenstapel
  function crates(x,z,n,seed){
    for (let i = 0; i < n; i++) {
      const w = 1+1.4*hash(i,1,seed), h = .7+.9*hash(i,2,seed), px = x+(hash(i,3,seed)-.5)*7, pz = z+(hash(i,4,seed)-.5)*5;
      add(new THREE.BoxGeometry(w,h,w*.8),[M.white,M.orange,M.worn,M.metal][i%4],px,hgt(px,pz)+h/2,pz).rotation.y = hash(i,5,seed)*1.5;
    }
  }

  function build(groundTex){
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Himmel, Dunst, Licht
    const hor = lin(0xd0a680), sky = new THREE.Mesh(new THREE.SphereGeometry(9000,32,16), new THREE.ShaderMaterial({
      uniforms:(skyU = {sun:{value:sunDir}, hor:{value:hor}, zen:{value:lin(0x7b5c47)}, time:{value:0}}),
      vertexShader:`varying vec3 vD; void main(){ vD=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`, fragmentShader:SKY_FS, side:THREE.BackSide, depthWrite:false}));
    sc.add(sky);
    try { const es = new THREE.Scene(); es.add(sky.clone()); const pm = new THREE.PMREMGenerator(renderer); sc.environment = pm.fromScene(es,0,1,12000).texture; pm.dispose(); } catch (e) {}
    sc.fog = new THREE.Fog(hor,280,5600);
    puffs = Puffs(320,hor);
    sc.add(new THREE.HemisphereLight(lin(0xdcb894),lin(0x6a4c3a),.62));
    sunL = new THREE.DirectionalLight(lin(0xffeedd),2.7); sunL.position.copy(sunDir).multiplyScalar(520).add(v1.set(205,0,-70)); sunL.target.position.set(205,0,-70);
    shadowEvery = DESKTOP ? 2 : 4;
    sunL.castShadow = true; sunL.shadow.mapSize.set(DESKTOP ? 4096 : 2048,DESKTOP ? 4096 : 2048); sunL.shadow.bias = -.0005; sunL.shadow.normalBias = .3; sunL.shadow.autoUpdate = false;
    const sca = sunL.shadow.camera; sca.left = -310; sca.right = 310; sca.top = 310; sca.bottom = -310; sca.near = 10; sca.far = 1400;
    sc.add(sunL,sunL.target);

    // Boden: dieselbe Textur in drei Maßstäben gegen sichtbare Wiederholung, im Nahbereich Relief aus der feinen Struktur, in der Ferne eine ruhige Fläche
    const soilDetail = m => {
      m.onBeforeCompile = sh => {
        sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>',
          'float dv=length(vViewPosition); vec4 texelColor=mapTexelToLinear(texture2D(map,vUv)); vec4 wide=mapTexelToLinear(texture2D(map,vUv*0.131+0.37,2.5)); vec4 fine=mapTexelToLinear(texture2D(map,vUv*5.7+0.11));' +
          'texelColor=mix(texelColor,wide*1.06,0.38+0.5*smoothstep(50.0,520.0,dv)); texelColor.rgb*=mix(1.0,clamp(dot(fine.rgb,vec3(0.3,0.5,0.2))/0.13,0.5,1.7),0.6*(1.0-smoothstep(5.0,60.0,dv)));' +
          'texelColor.rgb=mix(texelColor.rgb,vec3(0.235,0.1,0.045),0.7*smoothstep(380.0,1700.0,dv)); diffuseColor*=texelColor;')
          .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n{ float hF=dot(texture2D(map,vUv*5.7+0.11).rgb,vec3(0.333)); vec3 gsx=dFdx(-vViewPosition), gsy=dFdy(-vViewPosition); vec3 gra=cross(gsy,normal), grb=cross(normal,gsx); float gdet=dot(gsx,gra);' +
          ' normal=normalize(abs(gdet)*normal-0.06*(1.0-smoothstep(4.0,40.0,length(vViewPosition)))*sign(gdet)*(dFdx(hF)*gra+dFdy(hF)*grb)); }');
      };
      return m;
    };
    M = {
      white:new THREE.MeshStandardMaterial({color:lin(0xe8e4dc), roughness:.55, metalness:.05}),
      worn:new THREE.MeshStandardMaterial({color:lin(0xc9bfb0), roughness:.85, side:THREE.DoubleSide}),
      metal:new THREE.MeshStandardMaterial({color:lin(0x9aa0a6), roughness:.32, metalness:.9}),
      dark:new THREE.MeshStandardMaterial({color:lin(0x2a2c30), roughness:.6, metalness:.4}),
      gold:new THREE.MeshStandardMaterial({color:lin(0xc09a45), roughness:.38, metalness:.85}),
      soil:soilDetail(new THREE.MeshStandardMaterial({map:groundTex, bumpMap:groundTex, bumpScale:.22, color:lin(0xf4f0ec), roughness:1, metalness:0})),
      bed:new THREE.MeshStandardMaterial({color:lin(0x3a271c), roughness:1}),
      frost:new THREE.MeshStandardMaterial({color:lin(0xdfeaf2), roughness:.35, metalness:.1}),
      orange:new THREE.MeshStandardMaterial({color:lin(0xd2702c), roughness:.6}),
      glass:new THREE.MeshStandardMaterial({color:lin(0xc6e8f0), roughness:.06, metalness:0, transparent:true, opacity:.24, side:THREE.DoubleSide, depthWrite:false, envMapIntensity:1.8}),
      pad:new THREE.MeshStandardMaterial({color:lin(0x3d312b), roughness:.92}),
      paint:new THREE.MeshStandardMaterial({color:lin(0xe6dcc6), roughness:.8}),
      road:new THREE.MeshStandardMaterial({color:lin(0x5a3828), roughness:1, transparent:true, opacity:.6, polygonOffset:true, polygonOffsetFactor:-2, depthWrite:false}),
      leaf:new THREE.MeshStandardMaterial({color:lin(0x3f7d2c), roughness:.85}),
      warm:new THREE.MeshBasicMaterial({color:0xffd9a0}), pink:new THREE.MeshBasicMaterial({color:0xff6ad5}), red:new THREE.MeshBasicMaterial({color:0xff4030})
    };

    // Gelände: Gitter zur Mitte hin verdichtet, Höhen aus Rauschen, an den Bauplätzen eingeebnet
    const N = 220, geo = new THREE.PlaneGeometry(2,2,N,N), pa = geo.attributes.position, ua = geo.attributes.uv, col = new Float32Array(pa.count*3);
    for (let i = 0; i < pa.count; i++) {
      const u = pa.getX(i), w = pa.getY(i), x = Math.sign(u)*Math.pow(Math.abs(u),1.9)*2600, z = -Math.sign(w)*Math.pow(Math.abs(w),1.9)*2600;
      pa.setXYZ(i,x,hgt(x,z),z); ua.setXY(i,x/36,z/36);
      const t = .78+.34*vnoise(x*.004+3,1,z*.004)+.12*vnoise(x*.03,4,z*.03);
      col[i*3] = t; col[i*3+1] = t*(.94+.1*vnoise(x*.002,8,z*.002)); col[i*3+2] = t*.9;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col,3)); geo.computeVertexNormals();
    const gm = soilDetail(new THREE.MeshStandardMaterial({map:groundTex, bumpMap:groundTex, bumpScale:.22, roughness:1, metalness:0, vertexColors:true}));
    const ground = new THREE.Mesh(geo,gm);
    ground.receiveShadow = true; sc.add(ground);

    // Steine, verstreut außerhalb der Bauplätze; jeder mit eigener Tönung. Dazu Kiesel rund um die Basis.
    const free = (x,z) => !(Math.hypot(x,z-10) < 75 || Math.hypot(x-430,z+40) < 60 || seg(x,z,-45,38,255,38) < 8 || seg(x,z,255,38,392,-30) < 8 || Math.hypot(x-275,z+85) < 36 ||
      (Math.abs(x+10) < 40 && Math.abs(z-95) < 26) || seg(x,z,270,-280,330,-220) < 22 || seg(x,z,178,-284,334,-128) < 22 || Math.hypot(x-62,z+72) < 14 || Math.hypot(x-30,z+58) < 12);
    const yard = (x,z) => OBST.every(o => Math.hypot(x-o[0],z-o[1]) > o[2]+1.2) && seg(x,z,-45,38,255,38) > 5 && seg(x,z,-10,41,-10,74) > 4 && !(Math.abs(x+10) < 34 && Math.abs(z-95) < 21) && Math.hypot(x-12,z+30) > 7;
    const scatter = (n,seed,place,size,ok) => {
      const im = new THREE.InstancedMesh(rockGeo(seed,1), new THREE.MeshStandardMaterial({color:0xffffff, roughness:1, metalness:0}), n), tint = new THREE.Color();
      let k = 0;
      for (let i = 0; k < n && i < n*9; i++) {
        const p = place(i); if (!(ok || free)(p[0],p[1])) continue;
        const sz = size(i);
        v1.set(p[0],hgt(p[0],p[1])+sz*.22,p[1]); e4.set(hash(i,4,seed)*6,hash(i,5,seed)*6,hash(i,6,seed)*6); q4.setFromEuler(e4); s4.set(sz*(.7+.6*hash(i,7,seed)),sz*.7,sz);
        im.setMatrixAt(k,m4.compose(v1,q4,s4));
        const v = .75+.5*hash(i,8,seed); im.setColorAt(k++,tint.setRGB(.19*v,.085*v*(.9+.3*hash(i,9,seed)),.045*v));
      }
      im.count = k; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; sc.add(im);
    };
    scatter(DESKTOP ? 1300 : 800,81, i => { const a = hash(i,1,81)*TAU, r = 26+Math.pow(hash(i,2,81),1.7)*1100; return [Math.cos(a)*r,Math.sin(a)*r]; }, i => .25+2.2*Math.pow(hash(i,3,81),3.2));
    scatter(DESKTOP ? 2200 : 1000,83, i => { const a = hash(i,1,83)*TAU, r = 14+Math.pow(hash(i,2,83),1.3)*210; return [70+Math.cos(a)*r*1.5,10+Math.sin(a)*r]; }, i => .07+.3*Math.pow(hash(i,3,83),2.4));
    scatter(DESKTOP ? 1700 : 800,85, i => { const a = hash(i,1,85)*TAU, r = 9+Math.pow(hash(i,2,85),.8)*125; return [8+Math.cos(a)*r,18+Math.sin(a)*r]; }, i => .05+.2*Math.pow(hash(i,3,85),2.6), yard);

    // Zentrale Kuppel aus gedrucktem Marsboden, mit sichtbaren Druckschichten
    const stripe = (() => { const c = document.createElement('canvas'); c.width = 8; c.height = 64; const x = c.getContext('2d'); for (let i = 0; i < 64; i++) { const v = Math.round(150+80*Math.sin(i/64*TAU*8)); x.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; x.fillRect(0,i,8,1); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1,3); return t; })();
    const hub = grp(0,0,0);
    M.print = new THREE.MeshStandardMaterial({color:lin(0xa9704a), roughness:.95, bumpMap:stripe, bumpScale:.1, side:THREE.DoubleSide});
    add(new THREE.SphereGeometry(7.5,48,20,0,TAU,0,Math.PI/2),M.print,0,0,0,hub);
    add(new THREE.CylinderGeometry(7.7,7.9,.7,48),M.white,0,.35,0,hub);
    add(new THREE.SphereGeometry(1.4,20,10,0,TAU,0,Math.PI/2),M.glass,0,7.3,0,hub).castShadow = false;
    for (let k = 0; k < 7; k++) { const a = k/7*TAU+.4; glow(new THREE.CircleGeometry(.5,16),M.warm,Math.sin(a)*7.38,1.6,Math.cos(a)*7.38,hub).rotation.y = a; }
    // Tunnel von der Kuppel zu den Wohnmodulen
    HAB.forEach(h => {
      const d = Math.hypot(h[0],h[1]), ux = h[0]/d, uz = h[1]/d, len = d-8;
      along(add(new THREE.CylinderGeometry(1.15,1.15,len,18),M.white,ux*(6.8+len/2),1.35,uz*(6.8+len/2),hub),ux,0,uz);
      for (let k = 0; k < 3; k++) add(new THREE.TorusGeometry(1.2,.07,6,18),M.metal,ux*(7.6+k*(len-1.6)/2),1.35,uz*(7.6+k*(len-1.6)/2),hub).rotation.y = Math.atan2(ux,uz);
    });
    // Unter Marsboden begrabene Module: nur die Schleuse schaut heraus
    [[-30,-25,.9],[-9,-36,.2]].forEach(p => {
      const g = grp(p[0],p[1],p[2]);
      mound(p[0],p[1],11,4.6,7,p[2],.15);
      add(new THREE.CylinderGeometry(1.7,1.7,3.2,24),M.white,0,1.5,5.6,g).rotation.x = Math.PI/2;
      glow(new THREE.CircleGeometry(1.25,24),M.dark,0,1.5,7.22,g);
      glow(new THREE.BoxGeometry(1.2,.12,.05),M.warm,0,3,7.23,g);
    });
    // Gewächshäuser: Glastunnel mit Spanten, Pflanzbeeten und Pflanzenlicht
    const greenhouse = (x,z) => {
      const g = grp(x,z,0), L = 24, R = 3.4;
      const arch = add(new THREE.CylinderGeometry(R,R,L,32,1,true,0,Math.PI),M.glass,0,0,0,g); arch.rotation.z = Math.PI/2; arch.castShadow = false;
      for (let k = 0; k <= 8; k++) add(new THREE.TorusGeometry(R+.02,.08,6,22,Math.PI),M.white,-L/2+k*L/8,0,0,g).rotation.y = Math.PI/2;
      for (const sx of [-1,1]) { const e = add(new THREE.CircleGeometry(R,24,0,Math.PI),M.glass,sx*L/2,0,0,g); e.rotation.y = sx*Math.PI/2; e.castShadow = false; add(new THREE.BoxGeometry(.25,2.4,1.5),M.white,sx*(L/2+.1),1.2,0,g); }
      add(new THREE.BoxGeometry(L,.2,R*2-.2),M.dark,0,.1,0,g);
      const pl = new THREE.InstancedMesh(new THREE.SphereGeometry(.36,7,5),M.leaf,150); let n = 0;
      for (const rz of [-19,0,19]) {
        add(new THREE.BoxGeometry(L-2,.5,1.1),M.bed,0,.45,rz/10,g);
        for (let k = 0; k < 50; k++) { v1.set(-L/2+1.3+k*(L-2.6)/49,.85+.25*hash(k,rz+30,3),rz/10+(hash(k,7,rz+30)-.5)*.5); s4.set(1,.7+1.1*hash(k,9,rz+30),1); pl.setMatrixAt(n++,m4.compose(v1,q4.identity(),s4)); }
      }
      g.add(pl);
      for (const rz of [-1,1]) glow(new THREE.BoxGeometry(L-2,.07,.22),M.pink,0,2.95,rz,g);
      // Pflegeroboter fährt an einer Schiene über die Beete
      add(new THREE.BoxGeometry(L-1.5,.08,.12),M.metal,0,2.6,0,g);
      const bot = new THREE.Group(); bot.position.y = 2.2; g.add(bot);
      add(new THREE.BoxGeometry(.7,.45,3.9),M.orange,0,0,0,bot); for (const rz of [-1.9,0,1.9]) add(new THREE.CylinderGeometry(.05,.05,.9,6),M.metal,0,-.55,rz,bot);
      const ph = z*.37; anim.push((t,dt,clk) => { bot.position.x = (L/2-2)*Math.sin(clk*.22+ph); });
    };
    greenhouse(42,12); greenhouse(42,22);
    // Solarfeld: zur Sonne geneigte Module auf Pfosten
    const pt = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#14275c'; x.fillRect(0,0,128,64); x.strokeStyle = '#3d5aa3'; x.lineWidth = 1; for (let i = 0; i <= 128; i += 16) { x.beginPath(); x.moveTo(i+.5,0); x.lineTo(i+.5,64); x.stroke(); } for (let i = 0; i <= 64; i += 16) { x.beginPath(); x.moveTo(0,i+.5); x.lineTo(128,i+.5); x.stroke(); } const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; })();
    const pq = new THREE.Quaternion().setFromUnitVectors(up,v2.set(sunDir.x*.55,1,sunDir.z*.55).normalize());
    const panels = new THREE.InstancedMesh(new THREE.BoxGeometry(5.6,.12,2.9), new THREE.MeshStandardMaterial({map:pt, roughness:.2, metalness:.55, envMapIntensity:1.4}),48);
    const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(.09,.09,2.2,6),M.metal,48);
    for (let r = 0, n = 0; r < 6; r++) for (let c = 0; c < 8; c++, n++) {
      const x = -10+(c-3.5)*7.6, z = 95+(r-2.5)*6.2, y = hgt(x,z);
      panels.setMatrixAt(n,m4.compose(v1.set(x,y+2.3,z),pq,s4.set(1,1,1))); posts.setMatrixAt(n,m4.compose(v1.set(x,y+1.1,z),q4.identity(),s4.set(1,1,1)));
    }
    panels.castShadow = panels.receiveShadow = true; posts.castShadow = true; sc.add(panels,posts);
    // Kernreaktoren weit draußen hinter einem Wall: Kern im Boden, darüber der Schirm, der die Abwärme abstrahlt
    mound(256,-206,110,8,18,-Math.PI/4,.2);
    const rad = new THREE.MeshStandardMaterial({color:lin(0xd9d6cf), roughness:.5, metalness:.3, side:THREE.DoubleSide});
    [-1.5,-.5,.5,1.5].forEach(k => {
      const g = grp(300+k*18.4,-250+k*18.4,0);
      add(new THREE.CylinderGeometry(1.2,1.5,1.4,16),M.dark,0,.7,0,g); add(new THREE.CylinderGeometry(.14,.14,5.2,8),M.metal,0,3.9,0,g);
      add(new THREE.ConeGeometry(3.4,1.1,14,1,true),rad,0,6.6,0,g).rotation.x = Math.PI;
      blink.push(glow(new THREE.SphereGeometry(.16,8,6),M.red,0,7.4,0,g));
    });
    strip(34,-28,292,-242,.5,M.dark,.06);
    // Treibstoffanlage: Kältetanks, Kugeltanks, Verdichter, Leitungen, Bagger
    const is = grp(275,-85,0);
    for (const x of [-9,0]) { add(new THREE.CylinderGeometry(3,3,8,28),M.frost,x,5.2,-6,is); add(new THREE.SphereGeometry(3,28,12,0,TAU,0,Math.PI/2),M.frost,x,9.2,-6,is); add(new THREE.CylinderGeometry(3.2,3.4,1.2,28),M.dark,x,.6,-6,is); }
    for (const x of [-4,6]) { add(new THREE.SphereGeometry(3.3,28,18),M.white,x,4.6,8,is); for (let k = 0; k < 4; k++) { const a = k*Math.PI/2+.6; add(new THREE.CylinderGeometry(.14,.14,4.2,6),M.metal,x+Math.cos(a)*2.4,2.1,8+Math.sin(a)*2.4,is); } }
    add(new THREE.BoxGeometry(6,2.4,3),M.worn,10,1.2,-1,is);
    for (let k = 0; k < 6; k++) add(new THREE.BoxGeometry(.12,1.8,2.6),M.metal,7.6+k*.9,3.3,-1,is);
    add(new THREE.CylinderGeometry(.2,.2,22,8),M.metal,0,1.1,1,is).rotation.z = Math.PI/2;
    add(new THREE.CylinderGeometry(.2,.2,14,8),M.orange,-4.5,1.1,1,is).rotation.x = Math.PI/2;
    add(new THREE.CylinderGeometry(.18,.3,11,8),M.metal,15,5.5,6,is); blink.push(glow(new THREE.SphereGeometry(.2,8,6),M.red,15,11.2,6,is));
    const ex = grp(247,-120,.7);
    add(new THREE.BoxGeometry(3.2,1.1,2),M.orange,0,1.1,0,ex); add(new THREE.CylinderGeometry(.9,.9,2.2,14),M.metal,2.3,.95,0,ex).rotation.x = Math.PI/2;
    for (const z of [-1.1,1.1]) for (const x of [-1,1]) add(new THREE.CylinderGeometry(.55,.55,.4,14),M.dark,x,.55,z,ex).rotation.x = Math.PI/2;
    glow(new THREE.CircleGeometry(9,28),M.road,256,hgt(256,-114)+.07,-114).rotation.x = -Math.PI/2;
    // Landeplatz mit Markierung und Lichtern, darauf die Landefähre
    const pd = grp(430,-40,0);
    add(new THREE.CylinderGeometry(30,31.5,.5,64),M.pad,0,.25,0,pd);
    glow(new THREE.RingGeometry(23.4,24.6,64),M.paint,0,.52,0,pd).rotation.x = -Math.PI/2;
    for (const a of [0,Math.PI/2]) glow(new THREE.BoxGeometry(14,.03,.9),M.paint,0,.52,0,pd).rotation.y = a;
    for (let k = 0; k < 8; k++) { const a = k/8*TAU, x = Math.cos(a)*28.5, z = Math.sin(a)*28.5; add(new THREE.CylinderGeometry(.08,.08,2.4,6),M.metal,x,1.6,z,pd); const b = glow(new THREE.SphereGeometry(.26,8,6),k%2 ? M.warm : M.red,x,2.9,z,pd); padLights.push(b); if (k%2 === 0) blink.push(b); }
    const ln = new THREE.Group(); ln.position.y = .5; pd.add(ln);
    add(new THREE.CylinderGeometry(4.6,5,2.6,8),M.gold,0,3.3,0,ln);
    for (let k = 0; k < 4; k++) {
      const a = k*Math.PI/2+Math.PI/4, cx = Math.cos(a), cz = Math.sin(a);
      along(add(new THREE.CylinderGeometry(.16,.16,5.4,8),M.metal,cx*5.6,2,cz*5.6,ln),cx*.55,-1,cz*.55);
      add(new THREE.CylinderGeometry(.9,.9,.18,14),M.metal,cx*7.1,.09,cz*7.1,ln);
      add(new THREE.SphereGeometry(1.25,16,12),M.gold,Math.cos(a+Math.PI/4)*3.6,3.3,Math.sin(a+Math.PI/4)*3.6,ln);
    }
    add(new THREE.ConeGeometry(1.5,1.8,20,1,true),M.dark,0,1.3,0,ln);
    add(new THREE.CylinderGeometry(2.7,3.2,3.8,28),M.white,0,6.5,0,ln);
    add(new THREE.ConeGeometry(2.7,2.4,28),M.white,0,9.6,0,ln);
    add(new THREE.CylinderGeometry(.9,.9,.5,18),M.metal,0,10.9,0,ln);
    for (let k = 0; k < 3; k++) { const a = k*TAU/3+.5; glow(new THREE.CircleGeometry(.5,16),M.dark,Math.sin(a)*2.98,7,Math.cos(a)*2.98,ln).rotation.y = a; }
    for (const a of [2.5,Math.PI,3.78]) mound(430+Math.cos(a)*47,-40+Math.sin(a)*47,8,5.5,22,-a,.2);
    for (let k = 0; k < 5; k++) add(new THREE.BoxGeometry(6,2.6,2.5),k%2 ? M.orange : M.white,416+k*.4,hgt(416,-80)+1.3+(k > 2 ? 2.6 : 0),-80+(k%3)*3.1);
    // Antennenhügel, Funkmast, Fahrzeughalle
    mound(62,-72,11,1.9,11,0,.1);
    add(new THREE.CylinderGeometry(.16,.3,15,8),M.metal,90,hgt(90,-94)+7.5,-94); blink.push(glow(new THREE.SphereGeometry(.22,8,6),M.red,90,hgt(90,-94)+15.2,-94));
    const ga = grp(-46,38,.5);
    add(new THREE.CylinderGeometry(5.6,5.6,14,28,1,true,0,Math.PI),M.worn,0,0,0,ga).rotation.z = Math.PI/2; add(new THREE.BoxGeometry(14,.15,11),M.pad,0,.08,0,ga);
    // Fahrspuren und Wegelichter
    strip(-40,38,255,38,7,M.road,.09); strip(252,39.5,392,-30,7,M.road,.09); strip(-10,41,-10,74,5,M.road,.09); strip(292,20,279,-62,4.5,M.road,.09);
    const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(.13,8,6),M.warm,26), bollards = new THREE.InstancedMesh(new THREE.CylinderGeometry(.06,.08,.5,6),M.dark,26);
    for (let k = 0; k < 13; k++) for (const sz of [0,1]) {
      const x = 30+k*18, z = 38+(sz*2-1)*4.4, y = hgt(x,z);
      lamps.setMatrixAt(k*2+sz,m4.compose(v1.set(x,y+.56,z),q4.identity(),s4.set(1,1,1))); bollards.setMatrixAt(k*2+sz,m4.compose(v1.set(x,y+.25,z),q4.identity(),s4.set(1,1,1)));
    }
    bollards.castShadow = true; sc.add(lamps,bollards);
    // Radspuren auf den Pisten
    M.rut = new THREE.MeshStandardMaterial({color:lin(0x3f2619), roughness:1, transparent:true, opacity:.5, polygonOffset:true, polygonOffsetFactor:-3, depthWrite:false});
    for (const o of [-1.35,1.35]) { strip(-40,38+o,255,38+o,.55,M.rut,.11); strip(252.6+o*.45,39.5+o*.9,392.6+o*.45,-30+o*.9,.55,M.rut,.11); }
    // Kisten, Tankgestelle, Kabel vom Solarfeld, Treibstoffleitung zum Landeplatz, Lichtmasten
    crates(24,-22,7,31); crates(58,44,5,32); crates(262,-60,6,33); crates(-38,48,4,34);
    for (let k = 0; k < 5; k++) add(new THREE.CylinderGeometry(.45,.45,3.2,14),k%2 ? M.frost : M.white,56,hgt(56,4)+.55+Math.floor(k/3)*.95,2+(k%3)*1.05).rotation.z = Math.PI/2;
    strip(-10,76,-6,22,.35,M.dark,.07); strip(-6,22,2,9,.35,M.dark,.07);
    { const x1 = 289, z1 = -78, x2 = 402, z2 = -46, len = Math.hypot(x2-x1,z2-z1), ux = (x2-x1)/len, uz = (z2-z1)/len;
      along(add(new THREE.CylinderGeometry(.22,.22,len,10),M.metal,(x1+x2)/2,hgt((x1+x2)/2,(z1+z2)/2)+.85,(z1+z2)/2),ux,0,uz);
      for (let k = 0; k <= 12; k++) { const px = x1+ux*len*k/12, pz = z1+uz*len*k/12; add(new THREE.BoxGeometry(.3,.75,.3),M.dark,px,hgt(px,pz)+.38,pz); } }
    for (const p of [[250,-58],[302,-104],[396,-8],[396,-74],[20,34],[-24,30]]) {
      const y = hgt(p[0],p[1]); add(new THREE.CylinderGeometry(.09,.14,9,8),M.metal,p[0],y+4.5,p[1]); add(new THREE.BoxGeometry(1.5,.2,.5),M.dark,p[0],y+9,p[1]);
      glow(new THREE.BoxGeometry(1.3,.06,.36),M.warm,p[0],y+8.88,p[1]);
    }
    // Baustelle: ein neues Modul wird aus Marsboden gedruckt, der Ausleger kreist über der wachsenden Wand
    { const b = grp(30,-58,0);
      add(new THREE.CylinderGeometry(6,6.2,2.6,48,1,true),M.print,0,1.3,0,b); add(new THREE.CylinderGeometry(.28,.34,7,10),M.metal,0,3.5,0,b);
      const arm = new THREE.Group(); arm.position.y = 6.6; b.add(arm);
      add(new THREE.BoxGeometry(7.4,.3,.34),M.orange,2.6,0,0,arm); add(new THREE.BoxGeometry(.7,.7,.7),M.dark,6,-.45,0,arm); add(new THREE.CylinderGeometry(.1,.16,3.2,8),M.metal,6,-2.35,0,arm);
      add(new THREE.BoxGeometry(1.6,1.1,1.1),M.dark,-1.9,0,0,arm);
      anim.push((t,dt,clk) => { arm.rotation.y = clk*.32; });
      mound(41,-64,3.2,1.5,2.6,.4,.05); }
    // Bagger an der Abbaustelle fährt vor und zurück und wirft Staub auf
    anim.push((t,dt,clk) => {
      const o = 6*Math.sin(clk*.22), c7 = Math.cos(.7), s7 = Math.sin(.7), x = 247+o*c7, z = -120-o*s7;
      ex.position.set(x,hgt(x,z),z);
      const mv = Math.abs(Math.cos(clk*.22));
      for (let i = 0; i < 10; i++) { const a = (clk*.5+i/10)%1; puffs.put(x+2.6*c7+(hash(i,1,91)-.5)*2,hgt(x,z)+.5+a*2.4,z-2.6*s7+(hash(i,2,91)-.5)*2,1.2+a*3,.44*mv*(1-a)*ss(0,.15,a),DUST); }
    });
    // Dampf aus dem Kamin der Treibstoffanlage
    anim.push((t,dt,clk) => {
      for (let i = 0; i < 14; i++) { const a = (clk*.16+i/14)%1; puffs.put(290+a*a*9+(hash(i,1,92)-.5)*a*2,hgt(290,-79)+11.4+a*9,-79-a*a*6,.7+a*3.4,.34*(1-a)*ss(0,.1,a),STEAM); }
    });
    // Staubschleier, die mit dem Wind dicht über den Boden ziehen; sie bleiben um die Kamera herum
    anim.push((t,dt,clk) => {
      const S = 360, cx = cam.position.x, cz = cam.position.z;
      for (let i = 0; i < (DESKTOP ? 42 : 26); i++) {
        const x = cx+((hash(i,1,93)*S-clk*7-cx)%S+S)%S-S/2, z = cz+((hash(i,2,93)*S+clk*4.5-cz)%S+S)%S-S/2, d = Math.hypot(x-cx,z-cz);
        puffs.put(x,hgt(x,z)+1+2*hash(i,3,93),z,34+40*hash(i,4,93),(.05+.06*hash(i,5,93))*ss(18,70,d)*(1-ss(S*.36,S*.5,d)),DUST,.2);
      }
    });
    // Staubteufel in der Ferne: schlanker, sich wiegender Schlauch aus wirbelndem Staub
    { const nz = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), im = x.createImageData(128,128);
        for (let i = 0; i < 128*128; i++) { const u = (i%128)/128*6, w = Math.floor(i/128)/128*6, a = Math.PI*2/6;      // nahtlos kachelbar: Rauschen auf einem Torus
          const v = vnoise(Math.cos(u*a)*1.6+3,Math.sin(u*a)*1.6+5,Math.cos(w*a)*1.6)+.5*vnoise(Math.cos(u*a)*3.4,Math.sin(w*a)*3.4+2,Math.sin(u*a)*3.4); im.data[i*4] = im.data[i*4+1] = im.data[i*4+2] = Math.min(255,v/1.5*255); im.data[i*4+3] = 255; }
        x.putImageData(im,0,0); const tx = new THREE.CanvasTexture(c); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; return tx; })();
      const mk = (h,r) => { const g = new THREE.CylinderGeometry(r,r*.16,h,24,14,true); g.translate(0,h/2,0);
        const m = new THREE.Mesh(g, new THREE.ShaderMaterial({uniforms:{nz:{value:nz}, time:{value:0}, hh:{value:h}, col:{value:new THREE.Vector3(DUST[0]*1.15,DUST[1]*1.15,DUST[2]*1.15)}, fogC:{value:hor}}, transparent:true, depthWrite:false, side:THREE.DoubleSide,
          vertexShader:`uniform float time; uniform float hh; varying vec2 vU; varying float vF; varying float vE;
            void main(){ vU=uv; vec3 p=position; float k=p.y/hh; p.x+=sin(k*5.0+time*0.9)*hh*0.07*k; p.z+=cos(k*4.0+time*0.7)*hh*0.05*k;
              vec4 mv=modelViewMatrix*vec4(p,1.0); vF=smoothstep(280.0,5600.0,-mv.z); vec3 n=normalize(normalMatrix*normal); vE=abs(n.z); gl_Position=projectionMatrix*mv; }`,
          fragmentShader:`uniform sampler2D nz; uniform float time; uniform vec3 col; uniform vec3 fogC; varying vec2 vU; varying float vF; varying float vE;
            void main(){ float n=texture2D(nz,vec2(vU.x*2.0+time*0.22+vU.y*1.3,vU.y*1.6-time*0.12)).r; float a=smoothstep(0.25,0.75,n)*smoothstep(0.0,0.08,vU.y)*(1.0-smoothstep(0.55,1.0,vU.y))*(0.25+0.75*vE)*0.5;
              gl_FragColor=vec4(mix(col,fogC,vF),a);
              #include <tonemapping_fragment>
              #include <encodings_fragment>
            }`}));
        m.frustumCulled = false; m.renderOrder = 5; sc.add(m); return m; };
      const d1 = mk(95,13), d2 = mk(70,9);
      anim.push((t,dt,clk) => {
        const u1 = .5+.5*Math.sin(clk*.035), x1 = 40+u1*110, z1 = -440+u1*40, u2 = .5+.5*Math.sin(clk*.028+2), x2 = -330+u2*90, z2 = 90-u2*120;
        d1.position.set(x1,hgt(x1,z1),z1); d2.position.set(x2,hgt(x2,z2),z2); d1.material.uniforms.time.value = d2.material.uniforms.time.value = clk;
        for (let i = 0; i < 8; i++) { const a = (clk*.3+i/8)%1, an = hash(i,1,94)*TAU+clk; puffs.put(x1+Math.cos(an)*(4+a*10),hgt(x1,z1)+1+a*5,z1+Math.sin(an)*(4+a*10),9+a*14,.3*(1-a),DUST); puffs.put(x2+Math.cos(an)*(3+a*8),hgt(x2,z2)+1+a*4,z2+Math.sin(an)*(3+a*8),7+a*10,.28*(1-a),DUST); }
      }); }
    // Landefähre: sie sinkt zum Stichwort des Sprechers auf den Platz, das Triebwerk wirbelt Staub auf
    { const cv = document.createElement('canvas'); cv.width = 8; cv.height = 64; const cx = cv.getContext('2d'), gr = cx.createLinearGradient(0,0,0,64);
      gr.addColorStop(0,'rgba(255,246,228,.95)'); gr.addColorStop(.16,'rgba(255,214,150,.6)'); gr.addColorStop(.5,'rgba(255,150,80,.22)'); gr.addColorStop(1,'rgba(255,110,40,0)'); cx.fillStyle = gr; cx.fillRect(0,0,8,64);
      const fl = new THREE.Mesh(new THREE.ConeGeometry(1.9,11,20,1,true), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv), transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide, fog:false}));
      fl.position.y = 1.4-5.5; ln.add(fl);
      const light = new THREE.PointLight(0xffb070,0,170,1.5); light.position.y = -2; ln.add(light);
      const pc = VOICE.mars_base.cues.pad, ta = pc-1.6, tb = pc+5.6, px = 430, pz = -40, py = hgt(px,pz);
      lander = t => {
        const u = clamp((t-ta)/(tb-ta),0,1), alt = t < ta ? 0 : 130*Math.pow(1-u,1.7), on = t >= ta && t < tb+.25;
        ln.visible = t >= ta; ln.position.set(16*Math.pow(1-u,2),.5+alt,-9*Math.pow(1-u,2));
        fl.visible = on; if (on) { const f = .82+.3*hash(Math.floor(t*40),2,95); fl.scale.set(f,(.75+.25*ss(0,25,alt))*f,f); }
        light.intensity = on ? (5+4*hash(Math.floor(t*30),3,95))*ss(140,20,alt) : 0;
        // Anflugbefeuerung läuft während der Landung im Kreis
        if (t > ta-5 && t < tb+1.5) { const k0 = Math.floor(t*7); padLights.forEach((b,k) => { b.visible = (k+k0)%8 < 3; }); }
        else padLights.forEach((b,k) => { if (k%2) b.visible = true; });
        // Staub: je tiefer die Fähre, desto mehr; nach dem Aufsetzen zieht die Wolke ab
        for (let i = 0; i < 110; i++) {
          const life = 4.5+3.5*hash(i,1,96), age = ((t-ta+hash(i,2,96)*life)%life+life)%life, born = t-age, ub = clamp((born-ta)/(tb-ta),0,1), ab = 130*Math.pow(1-ub,1.7);
          const e = born < ta ? 0 : born < tb ? ss(55,3,ab) : 1-ss(tb,tb+1.2,born); if (e <= 0) continue;
          const a = age/life, th = hash(i,3,96)*TAU, r = 4+(22+34*hash(i,4,96))*(1-Math.exp(-age/2.1));
          puffs.put(px+Math.cos(th)*r,py+.8+(2+10*hash(i,5,96))*Math.pow(a,.7),pz+Math.sin(th)*r,5+17*a,.62*e*ss(0,.12,a)*(1-ss(.35,1,a)),DUST);
        }
      }; }
    // Tankwagen pendelt auf der Piste zwischen Treibstoffanlage und Landeplatz
    { const tk = new THREE.Group(); sc.add(tk);
      add(new THREE.BoxGeometry(6.6,.45,2.3),M.dark,0,1.05,0,tk);
      add(new THREE.CylinderGeometry(1.12,1.12,3.6,20),M.frost,-1,2.42,0,tk).rotation.z = Math.PI/2;
      for (const x of [-2.8,.8]) add(new THREE.SphereGeometry(1.12,20,12),M.frost,x,2.42,0,tk);
      for (const x of [-2.2,.2]) add(new THREE.TorusGeometry(1.15,.07,6,20),M.metal,x,2.42,0,tk).rotation.y = Math.PI/2;
      add(new THREE.BoxGeometry(1.7,1.5,2.1),M.white,2.5,2.05,0,tk); glow(new THREE.BoxGeometry(.06,.6,1.7),M.dark,3.36,2.3,0,tk);
      for (const x of [-2.4,0,2.4]) for (const z of [-1.25,1.25]) add(new THREE.CylinderGeometry(.62,.62,.45,14),M.dark,x,.62,z,tk).rotation.x = Math.PI/2;
      for (const z of [-.75,.75]) glow(new THREE.SphereGeometry(.13,8,6),M.warm,3.38,1.55,z,tk);
      blink.push(glow(new THREE.SphereGeometry(.15,8,6),M.red,2.5,2.95,0,tk));
      const x1 = 266, z1 = 32.6, x2 = 386, z2 = -27, len = Math.hypot(x2-x1,z2-z1), yaw = Math.atan2(z1-z2,x2-x1);
      anim.push((t,dt,clk) => {
        // hin und zurück, an den Enden wird gewendet
        const ph = (clk*4.2/len/1.25+.35)%2, u = .5-.5*Math.cos(Math.PI*ph), x = x1+(x2-x1)*u, z = z1+(z2-z1)*u, y = hgt(x,z);
        const back = ph < 1.5 ? (ph < .06 ? 1-ss(-.06,.06,ph) : ss(.94,1.06,ph)) : 1-ss(1.94,2.06,ph), ry = yaw+Math.PI*back, bx = Math.cos(ry), bz = -Math.sin(ry), v = Math.abs(Math.sin(Math.PI*ph));
        tk.position.set(x,y,z); tk.rotation.y = ry;
        for (let i = 0; i < 14; i++) { const a = (clk*.45+i/14)%1, age = a*2.6; puffs.put(x-bx*(3.4+age*3)+(hash(i,1,98)-.5),y+.4+age*.8,z-bz*(3.4+age*3)+(hash(i,2,98)-.5)*2,1+age*1.8,.46*v*(1-a)*ss(0,.1,a),DUST); }
      }); }
    // Wartungsroboter fährt zwischen den Reihen des Solarfelds
    { const rb = new THREE.Group(); sc.add(rb);
      add(new THREE.BoxGeometry(1.5,.5,1),M.orange,0,.62,0,rb); add(new THREE.CylinderGeometry(.05,.05,1.5,6),M.metal,.3,1.6,0,rb); add(new THREE.BoxGeometry(.2,.2,1.9),M.dark,.3,2.3,0,rb);
      for (const x of [-.5,.5]) for (const z of [-.55,.55]) add(new THREE.CylinderGeometry(.3,.3,.2,10),M.dark,x,.3,z,rb).rotation.x = Math.PI/2;
      blink.push(glow(new THREE.SphereGeometry(.09,8,6),M.warm,-.5,1.05,0,rb));
      anim.push((t,dt,clk) => { const x = -10+27*Math.sin(clk*.045); rb.position.set(x,hgt(x,95),95); rb.rotation.y = Math.cos(clk*.045) > 0 ? 0 : Math.PI; }); }
    // Wetterstation mit Windmesser, Radiatoren für die Abwärme, Antennen an der Kuppel
    { const ws = grp(-9,27,0);
      add(new THREE.CylinderGeometry(.05,.07,4.2,8),M.metal,0,2.1,0,ws); add(new THREE.BoxGeometry(.35,.45,.3),M.white,0,1.5,.14,ws);
      for (let k = 0; k < 3; k++) { const a = k*TAU/3; along(add(new THREE.CylinderGeometry(.03,.03,2,6),M.metal,Math.cos(a)*.55,.9,Math.sin(a)*.55,ws),Math.cos(a)*.6,-1,Math.sin(a)*.6); }
      add(new THREE.BoxGeometry(.95,.04,.6),panels.material,0,2.7,-.3,ws).quaternion.copy(pq);
      const an = new THREE.Group(); an.position.y = 4.25; ws.add(an);
      for (let k = 0; k < 3; k++) { const a = k*TAU/3; add(new THREE.BoxGeometry(.5,.03,.03),M.metal,Math.cos(a)*.25,0,Math.sin(a)*.25,an).rotation.y = -a; add(new THREE.SphereGeometry(.09,8,6),M.dark,Math.cos(a)*.5,0,Math.sin(a)*.5,an); }
      anim.push((t,dt,clk) => { an.rotation.y = clk*5; }); }
    { const g = grp(12,-30,.5);
      add(new THREE.BoxGeometry(5.4,.3,3.6),M.dark,0,.15,0,g);
      for (let k = 0; k < 6; k++) add(new THREE.BoxGeometry(.07,2.3,3),rad,(k-2.5)*.9,1.75,0,g);
      add(new THREE.CylinderGeometry(.12,.12,5.4,8),M.metal,0,.55,1.7,g).rotation.z = Math.PI/2;
      strip(9,-24,4,-9,.3,M.dark,.07); }
    add(new THREE.CylinderGeometry(.05,.07,5.2,6),M.metal,5.4,3,-5.4,hub); add(new THREE.CylinderGeometry(.03,.03,3.4,6),M.metal,6.3,2.2,-4.4,hub);
    add(new THREE.SphereGeometry(.75,18,8,0,TAU,0,1.05),M.white,5.4,5.1,-5.4,hub).rotation.set(2.2,0,.5);
    blink.push(glow(new THREE.SphereGeometry(.12,8,6),M.red,5.4,5.75,-5.4,hub));
    for (const l of labels) l.v.y += hgt(l.v.x,l.v.z);
    roverLabel = labels.find(l => l.cue === 'rover');
    // Kamerafahrt: je Station eine Ankunft und eine Abfahrt, dazwischen driftet die Kamera langsam; Zeiten hängen an den Stichworten des Sprechers.
    // Ort und Blickwinkel werden getrennt überblendet, so bleiben die Schwenks gleichmäßig. Die Route hält die Sonne seitlich, damit Schatten und Formen sichtbar sind.
    const c = VOICE.mars_base.cues, end = VOICE.mars_base.d, tA = c.rover+1.7, tD = c.comm-.2;
    knots = [[-3,[-560,440,720],[0,0,0]],[c.intro+2.3,[-170,78,214],[6,6,0]],
      [c.hab+1.2,[-52,17,56],[0,5,-2]],[c.berm-.5,[-58,15,42],[-4,5,-6]],
      [c.berm+1.3,[-66,11,-4],[-20,2,-29]],[c.green-.9,[-60,10,-16],[-19,2,-31]],
      [c.green+1.5,[20,8,52],[42,2.5,17]],[c.solar-1.1,[8,10,60],[42,2.5,17]],
      [c.solar+1.4,[-60,15,134],[-10,2,95]],[c.reactor-.2,[-56,16,130],[-8,2,93]],
      [c.reactor+3.9,[130,34,-70],[300,3,-250]],[c.isru+.2,[150,32,-92],[300,3,-250]],
      [c.isru+4.1,[215,13,-70],[275,6,-85]],[c.pad-.5,[224,12,-56],[275,6,-85]],
      [c.pad+2.5,[330,18,-22],[430,6,-40]],[c.rover-1.7,[318,17,-8],[430,6,-40]],
      [tA,[175,6,50],[roverX(tA),2,38]],[tD,[171,6.5,52],[roverX(tD),2,38]],
      [c.comm+3,[48,5,-30],[62,9.5,-72]],[c.end-.3,[43,5.5,-22],[62,9.5,-72]],
      [c.end+3.7,[-300,115,310],[20,0,0]],[end+10,[-440,200,440],[20,0,0]]]
      .map(k => { const dx = k[2][0]-k[1][0], dy = k[2][1]-k[1][1], dz = k[2][2]-k[1][2];
        return {t:k[0], p:new THREE.Vector3(k[1][0],k[1][1],k[1][2]), a:new THREE.Vector3(Math.atan2(dx,dz),Math.atan2(dy,Math.hypot(dx,dz)),0), mp:new THREE.Vector3(), ma:new THREE.Vector3()}; });
    for (let i = 1; i < knots.length; i++) {
      const a = knots[i].a, b = knots[i-1].a;
      while (a.x-b.x > Math.PI) a.x -= TAU; while (a.x-b.x < -Math.PI) a.x += TAU;      // Schwenks auf dem kürzeren Weg
      knots[i].t = Math.max(knots[i].t,knots[i-1].t+.4);
    }
    slopes('p','mp'); slopes('a','ma');
    sunL.shadow.needsUpdate = true;
    ready = true;
  }
  // NASA-Modelle einsetzen: auf den Boden stellen, skalieren, bei Bedarf mehrfach
  function putModel(src,x,z,ry,s,y){
    const o = src.clone(true), inner = new THREE.Group(), g = new THREE.Group();
    o.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(o), c = box.getCenter(new THREE.Vector3());
    inner.position.set(-c.x,-box.min.y,-c.z); inner.add(o); g.add(inner);
    g.scale.setScalar(s); g.position.set(x,hgt(x,z)+(y || 0),z); g.rotation.y = ry; sc.add(g);
    return g;
  }
  function addModel(n,o){
    if (!ready) return;
    o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    if (n === 'hdu1') HAB.forEach(h => putModel(o,h[0],h[1],h[2],.03));
    else if (n === 'sev') { putModel(o,66,54,-.9,1); movers.push(putModel(o,8,38,Math.PI/2,1)); }
    else if (n === 'astronaut') {
      [[70,57,-2],[412,-70,-1],[36,-52,2.4]].forEach(a => putModel(o,a[0],a[1],a[2],.0245));
      // Astronauten unterwegs: Kuppel–Gewächshaus, am Fahrzeugplatz, im Solarfeld, an der Treibstoffanlage
      [[8,14,28,29,1.1,0],[58,63,86,60,1,.7],[-32,82.6,12,82.6,.9,1.3],[254,-64,263,-76,.8,.4],[-14,30,-40,36,1.05,1.7]].forEach(w => {
        const g = putModel(o,w[0],w[1],0,.0245), len = Math.hypot(w[2]-w[0],w[3]-w[1]), yaw = Math.atan2(w[2]-w[0],w[3]-w[1]);
        anim.push((t,dt,clk) => {
          // hin und zurück, an den Enden wird gewendet
          const ph = (clk*w[4]/len/1.25+w[5])%2, u = .5-.5*Math.cos(Math.PI*ph), x = w[0]+(w[2]-w[0])*u, z = w[1]+(w[3]-w[1])*u;
          const back = ph < 1.5 ? (ph < .06 ? 1-ss(-.06,.06,ph) : ss(.94,1.06,ph)) : 1-ss(1.94,2.06,ph);
          g.position.set(x,hgt(x,z)+.05*Math.abs(Math.sin(clk*w[4]*3.3)),z); g.rotation.y = yaw+AST_YAW+Math.PI*back;
        });
      });
    }
    else if (n === 'dish') { const g = putModel(o,62,-72,.8,.09,1.3); anim.push((t,dt,clk) => { g.rotation.y = .8+.55*Math.sin(clk*.06); }); }
    else if (n === 'rover') {
      putModel(o,77,63,2.2,1);
      // Ein zweiter Rover fährt die Kabeltrasse zu den Reaktoren ab
      const g = putModel(o,128,-102,0,1), x1 = 128.3, z1 = -102.4, x2 = 216.9, z2 = -175.9, len = Math.hypot(x2-x1,z2-z1), yaw = Math.atan2(x2-x1,z2-z1);
      anim.push((t,dt,clk) => {
        const ph = (clk*1.9/len/1.25+.2)%2, u = .5-.5*Math.cos(Math.PI*ph), x = x1+(x2-x1)*u, z = z1+(z2-z1)*u, y = hgt(x,z);
        const back = ph < 1.5 ? (ph < .06 ? 1-ss(-.06,.06,ph) : ss(.94,1.06,ph)) : 1-ss(1.94,2.06,ph), ry = yaw+ROVER_YAW+Math.PI*back, v = Math.abs(Math.sin(Math.PI*ph));
        g.position.set(x,y,z); g.rotation.y = ry;
        const bx = Math.sin(ry-ROVER_YAW), bz = Math.cos(ry-ROVER_YAW);
        for (let i = 0; i < 8; i++) { const a = (clk*.4+i/8)%1, age = a*2.4; puffs.put(x-bx*(1.6+age*1.6)+(hash(i,1,99)-.5)*.6,y+.3+age*.5,z-bz*(1.6+age*1.6)+(hash(i,2,99)-.5)*.6,.8+age*1.2,.4*v*(1-a)*ss(0,.1,a),DUST); }
      });
    }
    else if (n === 'heli') {
      // Der Helikopter kreist über der Basis; die Rotoren verschwimmen zu einer Scheibe
      const g = putModel(o,82,68,.4,2.3), disc = new THREE.Mesh(new THREE.CircleGeometry(.95,24), new THREE.MeshBasicMaterial({color:0x1c1c20, transparent:true, opacity:.2, depthWrite:false, side:THREE.DoubleSide}));
      disc.rotation.x = -Math.PI/2; disc.position.y = 1.02; g.add(disc);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(1.86,.012,.07), new THREE.MeshBasicMaterial({color:0x101014, transparent:true, opacity:.55})); blade.position.y = 1.03; g.add(blade);
      const strobe = new THREE.Mesh(new THREE.SphereGeometry(.07,8,6),M.red); strobe.position.y = .25; g.add(strobe); blink.push(strobe);
      anim.push((t,dt,clk) => {
        const a = -2.2+t*.11, x = 25+62*Math.cos(a), z = 15+62*Math.sin(a);
        g.position.set(x,Math.max(hgt(x,z),0)+16+2.2*Math.sin(clk*.5),z); g.rotation.set(.08,-a,.1*Math.sin(clk*.7),'YXZ'); blade.rotation.y = clk*31;
      });
    }
    sunL.shadow.needsUpdate = true;
  }
  const roverX = t => clamp(215+3.2*(t-VOICE.mars_base.cues.rover-1.7),8,250);      // der Druckrover fährt auf der Piste nach Osten und ist zu seinem Stichwort im Bild
  // Steigungen an den Stützpunkten nach Fritsch und Carlson: kein Überschwingen, an den Haltepunkten läuft die Fahrt weich aus
  function slopes(key,mk){
    const K = knots, n = K.length;
    for (const ax of ['x','y','z']) for (let i = 0; i < n; i++) {
      let m = 0;
      if (i > 0 && i < n-1) {
        const h0 = K[i].t-K[i-1].t, h1 = K[i+1].t-K[i].t, d0 = (K[i][key][ax]-K[i-1][key][ax])/h0, d1 = (K[i+1][key][ax]-K[i][key][ax])/h1;
        if (d0*d1 > 0) { const w1 = 2*h1+h0, w2 = h1+2*h0; m = (w1+w2)/(w1/d0+w2/d1); }
      }
      K[i][mk][ax] = m;
    }
  }
  function sample(t,key,mk,out){
    const K = knots, n = K.length;
    if (t <= K[0].t) return out.copy(K[0][key]);
    if (t >= K[n-1].t) return out.copy(K[n-1][key]);
    let i = 0; while (t > K[i+1].t) i++;
    const a = K[i], b = K[i+1], h = b.t-a.t, u = (t-a.t)/h, u2 = u*u, u3 = u2*u;
    return out.set(0,0,0).addScaledVector(a[key],2*u3-3*u2+1).addScaledVector(a[mk],(u3-2*u2+u)*h).addScaledVector(b[key],-2*u3+3*u2).addScaledVector(b[mk],(u3-u2)*h);
  }
  return {
    get ready(){ return ready; },
    labels, build, addModel,
    // t = Sekunden seit Beginn des Sprechertexts
    update(t,dt,clk,snap){
      if (snap) { let i = 1; while (i+1 < knots.length-1 && knots[i+1].t <= t) i++; t = knots[i].t; }      // ohne Bewegung: Schnitt von Einstellung zu Einstellung
      sample(t,'p','mp',v1); sample(t,'a','ma',v2);
      // Mindesthöhe über dem Gelände und über den Bauten
      let minY = hgt(v1.x,v1.z)+2.4;
      for (const o of OBST) minY = Math.max(minY,(o[3]+1.5)*ss(o[2]+8,o[2],Math.hypot(v1.x-o[0],v1.z-o[1])));
      v1.y = Math.max(v1.y,minY);
      cam.position.copy(v1);
      const cp = Math.cos(v2.y);
      cam.lookAt(v1.x+Math.sin(v2.x)*cp*50,v1.y+Math.sin(v2.y)*50,v1.z+Math.cos(v2.x)*cp*50); if (import.meta.env.MODE === 'test' && window.__cam) { const c = window.__cam; cam.position.set(c[0],c[1],c[2]); cam.lookAt(c[3],c[4],c[5]); }
      // Der Druckrover fährt auf der Piste zum Landeplatz; sein Ort hängt an der Uhr des Sprechers, damit er zum Stichwort im Bild ist
      const mx = roverX(t), my = hgt(mx,38);
      for (const g of movers) g.position.set(mx,my,38);
      roverLabel.v.set(mx,my+5.5,38);
      skyU.time.value = clk;
      puffs.begin();
      // Staubfahne hinter dem fahrenden Druckrover
      if (mx > 8.5 && mx < 249.5) for (let i = 0; i < 26; i++) { const a = (clk*.4+i/26)%1, age = a*2.8; puffs.put(mx-2.4-age*3.2+(hash(i,1,97)-.5)*.8,my+.4+age*.75,38+(hash(i,2,97)-.5)*2.6,1+age*1.7,.52*(1-a)*ss(0,.1,a),DUST); }
      const on = Math.floor(clk*1.3)%2 === 0; for (const b of blink) b.visible = on;
      lander(t);
      for (const f of anim) f(t,dt,clk);
      puffs.end();
      if (frameN++%shadowEvery === 0) sunL.shadow.needsUpdate = true;
    },
    render(shiftY){
      cam.aspect = S.W/S.H; cam.fov = 46-11*ss(1,1.7,S.W/S.H); cam.setViewOffset(S.W,S.H,0,shiftY,S.W,S.H);
      const tm = renderer.toneMapping, oe = renderer.outputEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95; renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.render(sc,cam);
      renderer.toneMapping = tm; renderer.outputEncoding = oe;
    },
    project(v,out){ v2.copy(v).project(cam); out.x = (v2.x*.5+.5)*S.W; out.y = (-v2.y*.5+.5)*S.H; out.z = v2.z; return out; }
  };
})();
}

export { MB };
