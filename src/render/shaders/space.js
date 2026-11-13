// render/shaders/space – GLSL der Weltraumszene: Planeten, Wolken, Schnitt, Halo, Sonne, Ringe, Bahnen.
// Exporte: CLOUD_FS, HALO_FS, LAYER_FS, ORBIT_FS, ORBIT_VS, PLANET_FS, RING_FS, SUN_FS, VS
// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.

/* ---------- Shader ---------- */
const VS = `
varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vP;
void main(){ vUv=uv; vP=position; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
// Planetenoberfläche: Relief aus der Höhenkarte, weicher Terminator, Meeresglanz, Atmosphärensaum, Stadtlichter, Ringschatten.
// EARTH: echte Karten (Höhe, Wasser und Wolken in einer Hilfstextur); cut = Mittelwinkel und halbe Öffnung des Keils für den Querschnitt
const CUT_GLSL = `if(cut.y>0.001){ float ca=atan(vP.z,vP.x); if(abs(mod(ca-cut.x+3.14159265,6.2831853)-3.14159265)<cut.y) discard; }`;
const PLANET_FS = `
uniform sampler2D map; uniform sampler2D nmap; uniform sampler2D aux; uniform float nightK; uniform float specK; uniform float bumpK; uniform float gas; uniform vec2 texel;
uniform vec4 atmo; uniform vec3 center; uniform vec3 ringN; uniform vec3 ringR; uniform vec2 cut; uniform vec2 cloud;
varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vP;
#ifdef EARTH
#define HGT(c) texture2D(aux,c).r
#else
#define HGT(c) texture2D(map,c).a
#endif
void main(){
  ` + CUT_GLSL + `
  vec3 N=normalize(vN); vec3 L=normalize(-vW); vec3 V=normalize(cameraPosition-vW);
  vec4 tx=texture2D(map,vUv);
  float d0=dot(N,L); float relief=1.0;
  vec3 T=cross(ringN,N); float cl=length(T); T/=max(cl,0.0001); vec3 B=cross(N,T);
  if(bumpK>0.0){
    float hu=HGT(vUv+vec2(texel.x,0.0))-HGT(vUv-vec2(texel.x,0.0));
    float hv=HGT(vUv+vec2(0.0,texel.y))-HGT(vUv-vec2(0.0,texel.y));
    vec3 Nb=normalize(N-bumpK*(hu/max(cl,0.2)*T+hv*B));
    relief=clamp(1.0+1.7*(dot(Nb,L)-d0),0.3,1.7);
  }
  float day=smoothstep(-0.1,0.45,d0);
  float sh=1.0;
  if(ringR.z>0.5){
    float dn=dot(L,ringN);
    if(abs(dn)>0.0001){
      float t=dot(center-vW,ringN)/dn;
      if(t>0.0){ float r=length(vW+L*t-center); sh=1.0-0.62*smoothstep(ringR.x,ringR.x*1.06,r)*(1.0-smoothstep(ringR.y*0.96,ringR.y,r)); }
    }
  }
#ifdef EARTH
  float ocean=texture2D(aux,vUv).g; vec3 night=max(texture2D(nmap,vUv).rgb-0.05,0.0)*1.8; vec3 base=tx.rgb*1.25;
  // Schatten der Wolkendecke: die Wolke, die diesen Punkt verdeckt, liegt ein Stück in Richtung Sonne
  vec2 cuv=vec2(vUv.x+cloud.x,vUv.y)+vec2(dot(L,T)/max(cl,0.2),dot(L,B))*0.006;
  sh*=1.0-0.5*texture2D(aux,cuv).b*cloud.y;
  base=mix(base,base*vec3(0.92,1.0,1.08),ocean*0.5);
#else
  vec4 nt=texture2D(nmap,vUv); float ocean=nt.a; vec3 night=nt.rgb; vec3 base=tx.rgb;
#endif
  vec3 col=base*(0.02+1.08*day*relief*sh);
  col*=mix(1.0,0.55+0.45*pow(max(dot(N,V),0.0),0.45),gas);
  col+=vec3(1.0,0.93,0.78)*pow(max(dot(N,normalize(L+V)),0.0),70.0)*ocean*specK*day*0.6;
  float rim=pow(1.0-max(dot(N,V),0.0),2.5);
  vec3 ac=mix(vec3(1.0,0.42,0.18),atmo.rgb,smoothstep(-0.08,0.3,d0));
  col+=ac*atmo.a*rim*0.7*(0.06+0.94*smoothstep(-0.25,0.35,d0));
  col+=night*nightK*(1.0-smoothstep(-0.14,0.06,d0));
  gl_FragColor=vec4(col,1.0);
}`;
const CLOUD_FS = `
uniform sampler2D map; uniform float op; uniform vec2 cut; varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vP;
void main(){
  ` + CUT_GLSL + `
  vec3 N=normalize(vN); vec3 L=normalize(-vW); float d=dot(N,L); float day=smoothstep(-0.1,0.45,d);
  vec3 c=mix(vec3(1.0,0.55,0.32),vec3(1.0),smoothstep(0.0,0.3,d));
#ifdef EARTH
  float a=texture2D(map,vUv).b;
#else
  float a=texture2D(map,vUv).a;
#endif
  gl_FragColor=vec4(c*(0.03+0.97*day),a*0.95*op); }`;
// Schnittfläche durch die Erde: Schichten nach ihrem Radius, selbstleuchtend, mit strömender Konvektion.
// Grenzen als Anteil des Erdradius: innerer Kern 0,19 · äußerer Kern 0,545 · unterer Mantel 0,895 · Kruste ab 0,975 (überhöht)
const LAYER_FS = `
uniform float time; uniform float R; uniform vec4 lit; varying vec3 vP;
float h2(vec2 p){ p=fract(p*vec2(0.1031,0.1030)); p+=dot(p,p.yx+33.33); return fract((p.x+p.y)*p.y); }
float n2(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h2(i),h2(i+vec2(1.0,0.0)),f.x),mix(h2(i+vec2(0.0,1.0)),h2(i+vec2(1.0,1.0)),f.x),f.y); }
float fb(vec2 p){ return 0.55*n2(p)+0.3*n2(p*2.1+3.7)+0.15*n2(p*4.3+9.1); }
void main(){
  float r=length(vP.xy)/R; float ang=atan(vP.y,vP.x);
  float n=fb(vec2(ang*3.0,r*14.0-time*0.06));
  vec3 cInner=vec3(1.0,0.96,0.80)*(0.92+0.08*sin(time*1.6));
  vec3 cOuter=mix(vec3(1.0,0.50,0.06),vec3(1.0,0.82,0.28),fb(vec2(ang*5.0+time*0.3,r*22.0-time*0.2)));
  vec3 cLow=mix(vec3(0.58,0.11,0.03),vec3(0.90,0.30,0.07),n);
  vec3 cUp=mix(vec3(0.80,0.30,0.07),vec3(1.0,0.55,0.16),n);
  vec3 cCrust=vec3(0.42,0.34,0.28);
  float e=0.005;
  vec3 col=mix(cInner,cOuter,smoothstep(0.19-e,0.19+e,r));
  col=mix(col,cLow,smoothstep(0.545-e,0.545+e,r));
  col=mix(col,cUp,smoothstep(0.895-e,0.895+e,r));
  col=mix(col,cCrust,smoothstep(0.975-e,0.975+e,r));
  float bl=min(min(abs(r-0.19),abs(r-0.545)),min(abs(r-0.895),abs(r-0.975)));
  col*=0.5+0.5*smoothstep(0.0,0.007,bl);
  float L=lit.x*(1.0-step(0.19,r))+lit.y*step(0.19,r)*(1.0-step(0.545,r))+lit.z*step(0.545,r)*(1.0-step(0.975,r))+lit.w*step(0.975,r);
  col*=0.3+0.8*L;
  gl_FragColor=vec4(col,1.0);
}`;
// Leuchtender Saum: Rückseite einer etwas größeren Kugel, hell am Planetenrand, nach außen auslaufend
const HALO_FS = `
uniform vec3 color; uniform float k; uniform float edge; uniform float self;
varying vec3 vN; varying vec3 vW;
void main(){ vec3 N=normalize(vN); vec3 V=normalize(cameraPosition-vW); vec3 L=normalize(-vW);
  float f=pow(clamp(-dot(N,V)/edge,0.0,1.0),2.6);
  float lit=mix(0.05+0.95*smoothstep(-0.35,0.3,dot(N,L)),1.0,self);
  gl_FragColor=vec4(color*f*k*lit,1.0); }`;
// Sonnenoberfläche: fließende Granulation aus 3D-Rauschen, Randverdunkelung
const SUN_FS = `
uniform float time; varying vec3 vP; varying vec3 vN; varying vec3 vW;
float h(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
float n3(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h(i),h(i+vec3(1.0,0.0,0.0)),f.x),mix(h(i+vec3(0.0,1.0,0.0)),h(i+vec3(1.0,1.0,0.0)),f.x),f.y),
             mix(mix(h(i+vec3(0.0,0.0,1.0)),h(i+vec3(1.0,0.0,1.0)),f.x),mix(h(i+vec3(0.0,1.0,1.0)),h(i+vec3(1.0,1.0,1.0)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=0.5; float s=0.0; for(int i=0;i<6;i++){ s+=a*n3(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=0.5; } return s; }
void main(){
  vec3 p=normalize(vP); float t=time*0.06;
  float a=fbm(p*2.2+vec3(0.0,t,0.0));
  float b=fbm(p*6.0+vec3(a*2.0)+vec3(t*1.3,0.0,-t));
  float g=fbm(p*22.0-vec3(0.0,t*2.5,t));
  float v=b*0.7+g*0.45;
  vec3 col=mix(vec3(0.80,0.20,0.02),vec3(1.0,0.60,0.10),smoothstep(0.35,0.58,v));
  col=mix(col,vec3(1.0,0.93,0.66),smoothstep(0.55,0.80,v));
  col=mix(col,vec3(0.35,0.06,0.0),smoothstep(0.30,0.22,a)*0.75);
  vec3 N=normalize(vN); vec3 V=normalize(cameraPosition-vW); float mu=max(dot(N,V),0.0);
  col*=0.5+0.62*pow(mu,0.4);
  col+=vec3(1.0,0.45,0.12)*pow(1.0-mu,3.0)*0.55;
  gl_FragColor=vec4(col,1.0);
}`;
// Saturnringe mit Schatten des Planeten
const RING_FS = `
uniform sampler2D map; uniform vec3 center; uniform float R; varying vec2 vUv; varying vec3 vW;
void main(){ vec4 t=texture2D(map,vUv); vec3 L=normalize(-vW); vec3 oc=center-vW; float tca=dot(oc,L); float sh=1.0;
  if(tca>0.0){ float d=sqrt(max(dot(oc,oc)-tca*tca,0.0)); sh=0.08+0.92*smoothstep(R*0.96,R*1.04,d); }
  gl_FragColor=vec4(t.rgb*sh,t.a); }`;
// Bahnlinie mit Leuchtspur hinter dem Körper
const ORBIT_VS = `attribute float u; varying float vU; varying float vD; void main(){ vU=u; vec4 mv=modelViewMatrix*vec4(position,1.0); vD=-mv.z; gl_Position=projectionMatrix*mv; }`;
const ORBIT_FS = `uniform float head; uniform vec3 color; uniform float base; uniform float trail; uniform float gap; uniform float nearF; varying float vU; varying float vD;
void main(){ float t=fract(head-vU); float f=smoothstep(gap,gap*2.2,min(t,1.0-t))*smoothstep(nearF*0.9,nearF*1.6,vD); gl_FragColor=vec4(color*(base+trail*pow(1.0-t,5.0))*f,1.0); }`;

export { CLOUD_FS, HALO_FS, LAYER_FS, ORBIT_FS, ORBIT_VS, PLANET_FS, RING_FS, SUN_FS, VS };
