// render/post – Nachbearbeitung (POST): HDR-Ziel mit MSAA, Bloom in Stufen, Belichtung, Tonemapping, Vignette, Korn.
// Exporte: POST; initPost
// Hängt ab von: core/device.js, render/renderer.js, render/scene.js, render/shaders/post.js
// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.

import * as THREE from 'three';
import { DESKTOP } from '../core/device.js';
import { renderer } from './renderer.js';
import { blackTex } from './scene.js';
import { VSQ } from './shaders/post.js';

// Belegt in initPost() (Reihenfolge des Starts, siehe main.js)
let POST;

export function initPost(){
// Nachbearbeitung: Szene in ein HDR-Ziel (HalfFloat, mit MSAA unter WebGL2), Bloom über eine Kette halbierter Stufen
// (Dual-Filter: Hell-Pass, Abwärts- und Aufwärtsfiltern), dann Tonemapping, sRGB, Vignette und Korn in einem Schritt.
// lin:0 Weltraum (Werte wie bisher fürs Display gedacht, nur Lichter über 1 laufen weich aus), lin:1 Marsoberfläche (linear, ACES, sRGB).
// Ohne HalfFloat-Ziele oder bei sehr niedriger Auflösung zeichnet POST direkt wie früher.
POST = (() => {
  const gl = renderer.getContext(), wgl2 = renderer.capabilities.isWebGL2;
  const mk = (fs,u) => new THREE.ShaderMaterial({uniforms:u, vertexShader:VSQ, fragmentShader:fs, depthTest:false, depthWrite:false, blending:THREE.NoBlending});
  const sc = new THREE.Scene(), cm = new THREE.Camera(), quad = new THREE.Mesh(new THREE.PlaneGeometry(2,2)); quad.frustumCulled = false; sc.add(quad);
  // Hell-Pass mit weichem Knie, 4 Abtastungen (halbe Auflösung)
  const pre = mk(`uniform sampler2D t; uniform vec2 px; uniform vec3 thr; varying vec2 vUv;
    vec3 q(vec2 o){ vec3 c=texture2D(t,vUv+o*px).rgb; float b=max(c.r,max(c.g,c.b)); float s=clamp(b-thr.x+thr.y,0.0,2.0*thr.y); s=s*s/(4.0*thr.y+1e-4);
      return c*max(s,b-thr.x)/max(b,1e-4); }
    void main(){ vec3 c=q(vec2(-0.5,-0.5))+q(vec2(0.5,-0.5))+q(vec2(-0.5,0.5))+q(vec2(0.5,0.5)); gl_FragColor=vec4(min(c*0.25*thr.z,vec3(60.0)),1.0); }`,
    {t:{value:null}, px:{value:new THREE.Vector2()}, thr:{value:new THREE.Vector3(1,.5,1)}});
  const down = mk(`uniform sampler2D t; uniform vec2 px; varying vec2 vUv;
    void main(){ vec3 c=texture2D(t,vUv).rgb*4.0+texture2D(t,vUv+px*vec2(-1.0,-1.0)).rgb+texture2D(t,vUv+px*vec2(1.0,-1.0)).rgb
      +texture2D(t,vUv+px*vec2(-1.0,1.0)).rgb+texture2D(t,vUv+px).rgb; gl_FragColor=vec4(c/8.0,1.0); }`,
    {t:{value:null}, px:{value:new THREE.Vector2()}});
  const up = mk(`uniform sampler2D t; uniform sampler2D b; uniform vec2 px; uniform float k; varying vec2 vUv;
    void main(){ vec3 c=(texture2D(t,vUv+px*vec2(-2.0,0.0)).rgb+texture2D(t,vUv+px*vec2(2.0,0.0)).rgb+texture2D(t,vUv+px*vec2(0.0,-2.0)).rgb+texture2D(t,vUv+px*vec2(0.0,2.0)).rgb
      +2.0*(texture2D(t,vUv+px*vec2(-1.0,-1.0)).rgb+texture2D(t,vUv+px*vec2(1.0,-1.0)).rgb+texture2D(t,vUv+px*vec2(-1.0,1.0)).rgb+texture2D(t,vUv+px).rgb))/12.0;
      gl_FragColor=vec4(texture2D(b,vUv).rgb+c*k,1.0); }`,
    {t:{value:null}, b:{value:null}, px:{value:new THREE.Vector2()}, k:{value:.85}});
  // Zusammensetzen: Bloom dazu, Belichtung, Tonemapping, sRGB, Vignette, Korn gegen Farbstufen
  const fin = mk(`uniform sampler2D t; uniform sampler2D bl; uniform float bk; uniform float ex; uniform float lin; uniform float vig; uniform float grn; uniform float seed; uniform vec2 asp; varying vec2 vUv;
    vec3 rrt(vec3 v){ vec3 a=v*(v+0.0245786)-0.000090537; vec3 b=v*(0.983729*v+0.4329510)+0.238081; return a/b; }
    vec3 aces(vec3 c){ const mat3 mi=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777));
      const mat3 mo=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602));
      c*=1.0/0.6; return clamp(mo*rrt(mi*c),0.0,1.0); }
    vec3 srgb(vec3 c){ return mix(c*12.92,1.055*pow(c,vec3(0.41666))-0.055,step(0.0031308,c)); }
    float sh(float x){ const float k=0.72; return x<k ? x : k+(1.0-k)*(1.0-exp(-(x-k)/(1.0-k))); }
    float hh(vec2 p){ vec3 q=fract(vec3(p.xyx)*0.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
    void main(){
      vec3 c=texture2D(t,vUv).rgb+texture2D(bl,vUv).rgb*bk; c*=ex;
      if(lin>0.5){ c=srgb(aces(c)); }
      else { float m=max(c.r,max(c.g,c.b)); if(m>0.72){ float s=sh(m); c=mix(c*s/m,vec3(s),smoothstep(1.6,9.0,m)*0.6); } }
      vec2 d=(vUv-0.5)*asp; c*=1.0-vig*smoothstep(0.2,1.0,dot(d,d)*2.6);
      float n=hh(gl_FragCoord.xy+seed*vec2(71.3,113.7))+hh(gl_FragCoord.xy*1.37+seed*vec2(19.1,7.3))-1.0;
      c+=n*grn/255.0;
      gl_FragColor=vec4(c,1.0); }`,
    {t:{value:null}, bl:{value:null}, bk:{value:.5}, ex:{value:1}, lin:{value:0}, vig:{value:.22}, grn:{value:1.6}, seed:{value:0}, asp:{value:new THREE.Vector2(1,1)}});
  const opt = {minFilter:THREE.LinearFilter, magFilter:THREE.LinearFilter, format:THREE.RGBAFormat, type:THREE.HalfFloatType, depthBuffer:false, stencilBuffer:false};
  let ok = false, main = null, bd = [], bu = [], w = 0, h = 0, frameN = 0;
  // Probe: lässt sich in ein HalfFloat-Ziel zeichnen?
  try {
    if (wgl2 ? renderer.extensions.has('EXT_color_buffer_float') : (renderer.extensions.has('OES_texture_half_float') && renderer.extensions.has('OES_texture_half_float_linear') && renderer.extensions.has('EXT_color_buffer_half_float'))) {
      const t = new THREE.WebGLRenderTarget(4,4,opt);
      renderer.setRenderTarget(t); ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE; renderer.setRenderTarget(null); t.dispose();
    }
  } catch (e) { ok = false; }
  const _v = new THREE.Vector2();
  function size(){
    renderer.getDrawingBufferSize(_v); const nw = Math.max(1,_v.x|0), nh = Math.max(1,_v.y|0);
    if (nw === w && nh === h && main) return;
    w = nw; h = nh;
    if (main) main.dispose(); bd.forEach(t => t.dispose()); bu.forEach(t => t.dispose()); bd = []; bu = [];
    const o = Object.assign({}, opt, {depthBuffer:true});
    if (wgl2 && THREE.WebGLMultisampleRenderTarget) { main = new THREE.WebGLMultisampleRenderTarget(w,h,o); main.samples = DESKTOP ? 4 : 2; }
    else main = new THREE.WebGLRenderTarget(w,h,o);
    // Bloom ab halber Auflösung, Stufen bis etwa 16 Bildpunkte
    const n = DESKTOP ? 6 : 4;                                 // Handy: eine Stufe weniger
    let lw = w, lh = h;
    for (let i = 0; i < n; i++) { lw = Math.max(1,lw >> 1); lh = Math.max(1,lh >> 1); if (i > 2 && Math.min(lw,lh) < 12) break; bd.push(new THREE.WebGLRenderTarget(lw,lh,opt)); bu.push(new THREE.WebGLRenderTarget(lw,lh,opt)); }
  }
  function pass(m,target){ quad.material = m; renderer.setRenderTarget(target); renderer.render(sc,cm); }
  const P = {
    get ok(){ return ok; },
    // o: {lin, exposure, bloom (Stärke), thr (Schwelle), knee, vig, scatter}
    render(scene_,cam_,o){
      o = o || {};
      const lin = o.lin ? 1 : 0;
      if (!ok || renderer.getPixelRatio() < .45) {
        const tm = renderer.toneMapping, oe = renderer.outputEncoding;
        if (lin) { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = o.exposure || 1; renderer.outputEncoding = THREE.sRGBEncoding; }
        renderer.setRenderTarget(null); renderer.render(scene_,cam_);
        renderer.toneMapping = tm; renderer.outputEncoding = oe;
        return;
      }
      size();
      const tm = renderer.toneMapping, oe = renderer.outputEncoding;
      renderer.toneMapping = THREE.NoToneMapping; renderer.outputEncoding = THREE.LinearEncoding;
      renderer.setRenderTarget(main); renderer.render(scene_,cam_);
      const bk = o.bloom == null ? .5 : o.bloom;
      if (bk > 0 && bd.length) {
        pre.uniforms.t.value = main.texture; pre.uniforms.px.value.set(1/w,1/h); pre.uniforms.thr.value.set(o.thr == null ? 1 : o.thr, o.knee == null ? .5 : o.knee, o.pre == null ? 1 : o.pre);
        pass(pre,bd[0]);
        for (let i = 1; i < bd.length; i++) { down.uniforms.t.value = bd[i-1].texture; down.uniforms.px.value.set(1/bd[i-1].width,1/bd[i-1].height); pass(down,bd[i]); }
        let src = bd[bd.length-1];
        for (let i = bd.length-2; i >= 0; i--) {
          up.uniforms.t.value = src.texture; up.uniforms.b.value = bd[i].texture; up.uniforms.px.value.set(.5/src.width,.5/src.height); up.uniforms.k.value = o.scatter == null ? .85 : o.scatter;
          pass(up,bu[i]); src = bu[i];
        }
        fin.uniforms.bl.value = src.texture;
      } else fin.uniforms.bl.value = blackTex;
      const u = fin.uniforms;
      u.t.value = main.texture; u.bk.value = bk/Math.max(1,bd.length*.5); u.ex.value = o.exposure == null ? 1 : o.exposure; u.lin.value = lin;
      u.vig.value = o.vig == null ? .22 : o.vig; u.seed.value = (frameN++ % 64); u.asp.value.set(w/Math.max(w,h),h/Math.max(w,h));
      pass(fin,null);
      renderer.toneMapping = tm; renderer.outputEncoding = oe;
    }
  };
  return P;
})();
}

export { POST };
