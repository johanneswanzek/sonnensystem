// render/surfaces – SURF: prozedurale Oberflächen der Himmelskörper als Shader-Bausteine.
// Exporte: SURF; initSurfaces
// Hängt ab von: render/shaders/bake.js
// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.

import { EARTH_GEO } from './shaders/bake.js';

// Belegt in initSurfaces() (Reihenfolge des Starts, siehe main.js)
let SURF;

export function initSurfaces(){
SURF = {
  mercury: `vec4 surf(vec3 p,float lat,float lon){
    float n=fbm(p*2.5+3.0,7);
    float cr=craters(p,4.0,0.55)*0.5+craters(p,9.0,0.65)*0.3+craters(p,19.0,0.7)*0.16+craters(p,41.0,0.7)*0.08;
    float m=fbm(p*1.3+9.0,4);
    vec3 col=mix(vec3(0.34,0.32,0.31),vec3(0.66,0.63,0.60),smoothstep(0.3,0.7,n));
    col=mix(col,vec3(0.27,0.26,0.26),smoothstep(0.52,0.66,m)*0.6);
    col*=0.9+0.5*cr;
    col+=0.10*smoothstep(0.62,0.78,fbm(p*14.0,4));
    return vec4(clamp(col,0.0,1.0),clamp(0.55+0.3*(n-0.5)+0.5*cr+grain(p),0.0,1.0)); }`,
  moon: `vec4 surf(vec3 p,float lat,float lon){
    float n=fbm(p*2.0+5.0,6);
    float cr=craters(p,3.5,0.6)*0.5+craters(p,8.0,0.7)*0.3+craters(p,18.0,0.7)*0.15;
    float mare=smoothstep(0.52,0.62,fbm(p*1.2+2.0,4));
    vec3 col=mix(vec3(0.62,0.61,0.58),vec3(0.84,0.83,0.80),n);
    col=mix(col,vec3(0.36,0.36,0.38),mare*0.8); col*=0.85+0.6*cr*(1.0-mare*0.5);
    return vec4(clamp(col,0.0,1.0),1.0); }`,
  venus: `vec4 surf(vec3 p,float lat,float lon){
    float w=fbm(p*1.6,5); float sh=lon+lat*lat*1.8; float cl=cos(lat);
    vec3 q=vec3(cos(sh)*cl,sin(lat)*4.5,sin(sh)*cl)*1.6;
    float n=fbm(q+w*1.6,8); float f=fbm(p*vec3(6.0,22.0,6.0)+w*2.0,5);
    vec3 col=mix(vec3(0.64,0.47,0.25),vec3(0.96,0.88,0.68),smoothstep(0.28,0.72,n*0.75+f*0.25));
    col=mix(col,vec3(0.98,0.93,0.80),smoothstep(0.9,1.4,abs(lat))*0.5);
    return vec4(col,0.5); }`,
  earth: EARTH_GEO + `vec4 surf(vec3 p,float lat,float lon){
    float n,e,land,m,ice,dry; geo(p,lat,n,e,land,m,ice,dry); float al=abs(lat);
    vec3 sea=mix(vec3(0.012,0.06,0.20),vec3(0.05,0.27,0.50),smoothstep(0.40,0.515,n));
    sea=mix(sea,vec3(0.10,0.42,0.52),smoothstep(0.503,0.517,n)*0.6);
    vec3 lc=mix(vec3(0.06,0.22,0.07),vec3(0.27,0.39,0.15),m);
    lc=mix(lc,vec3(0.78,0.66,0.42),dry);
    lc=mix(lc,vec3(0.34,0.36,0.25),smoothstep(0.75,1.05,al)*0.8);
    lc=mix(lc,vec3(0.42,0.36,0.30),smoothstep(0.5,0.8,e));
    lc=mix(lc,vec3(0.93,0.94,0.96),smoothstep(0.82,0.98,e+smoothstep(0.6,1.2,al)*0.3));
    vec3 col=mix(sea,lc,land);
    col=mix(col,vec3(0.95,0.96,0.98),ice);
    float h=mix(0.45,0.5+0.45*e+(m-0.5)*0.08,land); h=mix(h,0.62,ice*0.5);
    return vec4(col,clamp(h+grain(p),0.0,1.0)); }`,
  earthNight: EARTH_GEO + `vec4 surf(vec3 p,float lat,float lon){
    float n,e,land,m,ice,dry; geo(p,lat,n,e,land,m,ice,dry);
    float l=smoothstep(0.56,0.74,fbm(p*22.0+3.0,5))*smoothstep(0.44,0.62,fbm(p*3.5+9.0,3));
    l*=land*(1.0-ice)*(1.0-smoothstep(0.55,0.9,e))*(1.0-dry*0.7)*(0.5+0.8*(1.0-smoothstep(0.0,0.35,e)));
    return vec4(vec3(1.0,0.74,0.40)*l*1.4,(1.0-land)*(1.0-ice)); }`,
  earthClouds: `vec4 surf(vec3 p,float lat,float lon){
    float w=fbm(p*2.0+4.0,5);
    vec3 q=p*vec3(3.0,5.5,3.0)+vec3(11.0,2.0,7.0)+vec3(w*1.7,w*0.6,-w*1.3);
    float c=fbm(q,8); float fine=fbm(p*17.0+w*3.0,5); float band=0.5+0.5*cos(lat*5.5);
    float a=smoothstep(0.50,0.70,c*0.82+band*0.10+(fine-0.5)*0.16);
    a*=0.55+0.45*smoothstep(0.35,0.65,fine);
    return vec4(1.0,1.0,1.0,a); }`,
  mars: `vec4 surf(vec3 p,float lat,float lon){
    float n=fbm(p*2.2+2.0,8); float dk=fbm(p*1.3+8.0,5);
    float cr=craters(p,6.0,0.4)*0.5+craters(p,13.0,0.5)*0.28+craters(p,29.0,0.55)*0.14;
    float cz=lat+0.14+0.05*sin(lon*3.0)+(fbm(p*9.0,5)-0.5)*0.07;
    float canyon=(1.0-smoothstep(0.0,0.04,abs(cz)))*smoothstep(2.5,2.8,lon)*(1.0-smoothstep(4.0,4.3,lon));
    vec2 ov=vec2((lon-1.2)*cos(lat),lat-0.32); float om=1.0-smoothstep(0.0,0.14,length(ov));
    vec2 tv=vec2((lon-2.0)*cos(lat),lat-0.03); float th=0.0;
    for(int k=0;k<3;k++){ th+=1.0-smoothstep(0.0,0.07,length(tv-vec2(float(k)*0.12,float(k)*0.10-0.1))); }
    float h=0.5+0.34*(n-0.5)+0.4*cr-0.3*canyon+0.3*om*om-0.25*(1.0-smoothstep(0.0,0.03,length(ov)))+0.18*th;
    vec3 col=mix(vec3(0.58,0.26,0.13),vec3(0.87,0.54,0.31),smoothstep(0.3,0.7,n));
    col=mix(col,vec3(0.30,0.16,0.11),smoothstep(0.50,0.66,dk)*0.78);
    col=mix(col,vec3(0.24,0.11,0.08),canyon*0.65);
    col*=0.92+0.35*cr;
    col=mix(col,vec3(0.90,0.62,0.42),om*0.35);
    float cap=smoothstep(1.27,1.40,abs(lat)+(n-0.5)*0.3);
    col=mix(col,vec3(0.96,0.94,0.92),cap); h=mix(h,0.6,cap);
    return vec4(clamp(col,0.0,1.0),clamp(h+grain(p),0.0,1.0)); }`,
  // Mars und Jupiter: NASA-Karte als Grundlage, darüber berechnete Feinstruktur und Relief
  marsReal: `vec4 surf(vec3 p,float lat,float lon){
    vec3 real=texture2D(src,vUv).rgb;
    float cr=craters(p,13.0,0.5)*0.45+craters(p,29.0,0.55)*0.3+craters(p,60.0,0.6)*0.18;
    float n=fbm(p*9.0+2.0,6);
    float lum=dot(real,vec3(0.3,0.5,0.2));
    vec3 col=real*1.14*(0.9+0.28*cr)*(0.92+0.16*(n-0.5)*2.0);
    float h=0.5+0.22*(lum-0.45)+0.42*cr+0.12*(n-0.5);
    return vec4(clamp(col,0.0,1.0),clamp(h+grain(p),0.0,1.0)); }`,
  jupiterReal: `vec4 surf(vec3 p,float lat,float lon){
    float t=fbm(p*2.0,5);
    float wv=fbm(vec3(p.x*3.0,p.y*11.0,p.z*3.0)+t*1.5,6)-0.5;
    float st=fbm(vec3(p.x*5.0,p.y*52.0,p.z*5.0)+wv*3.0,6);
    float ed=fbm(vec3(p.x*14.0,p.y*30.0,p.z*14.0)+t*4.0,6);
    vec3 real=texture2D(src,vUv+vec2(wv*0.006,wv*0.003)).rgb;
    vec3 col=real*1.12*(0.82+0.36*st)*(0.93+0.14*ed);
    col=mix(col,vec3(dot(col,vec3(0.33))),0.18);
    col=mix(col,vec3(0.46,0.40,0.36),smoothstep(1.05,1.45,abs(lat))*0.8);
    return vec4(clamp(col,0.0,1.0),0.5); }`,
  // Marsboden aus der Nähe: Staub, dunklere Flecken, Kiesel
  ground: `vec4 surf2(vec2 uv){
    vec3 p=vec3(uv*7.0,1.7);
    float n=fbm(p,6); float g=fbm(p*4.0+3.0,5); float peb=smoothstep(0.64,0.74,fbm(p*18.0+9.0,4));
    vec3 col=mix(vec3(0.43,0.27,0.18),vec3(0.66,0.46,0.31),smoothstep(0.3,0.7,n));
    col=mix(col,vec3(0.36,0.23,0.16),smoothstep(0.52,0.72,g)*0.42);
    col=mix(col,vec3(0.74,0.53,0.37),smoothstep(0.58,0.80,fbm(p*1.3+5.0,4))*0.4);
    col=mix(col,vec3(0.27,0.18,0.14),peb*0.6);
    float h=0.45+0.35*(g-0.5)+0.4*peb;
    return vec4(col*(0.8+0.4*h),1.0); }`,
  jupiter: `vec4 surf(vec3 p,float lat,float lon){
    float t=fbm(p*2.0,5);
    float wv=fbm(vec3(p.x*3.0,p.y*11.0,p.z*3.0)+t*1.5,6)-0.5;
    float y=lat+wv*0.10;
    float b=sin(y*13.5)*0.5+0.5; b=mix(b,sin(y*29.0+1.3)*0.5+0.5,0.28);
    float st=fbm(vec3(p.x*5.0,p.y*52.0,p.z*5.0)+wv*3.0,6);
    float ed=fbm(vec3(p.x*14.0,p.y*30.0,p.z*14.0)+t*4.0,6);
    vec3 col=mix(vec3(0.56,0.34,0.20),vec3(0.94,0.88,0.78),smoothstep(0.15,0.85,b));
    col=mix(col,vec3(0.82,0.64,0.45),clamp((st-0.5)*1.7+0.18,0.0,1.0));
    col=mix(col,vec3(0.47,0.27,0.16),smoothstep(0.6,0.78,ed)*(1.0-b)*0.7);
    col=mix(col,vec3(0.97,0.95,0.90),smoothstep(0.66,0.8,ed)*b*0.5);
    col=mix(col,vec3(0.42,0.36,0.33),smoothstep(0.95,1.45,abs(lat))*0.75);
    vec2 q=vec2((lon-3.6)*cos(lat),lat+0.38)/vec2(0.25,0.115); float r=length(q);
    float ang=atan(q.y,q.x)+r*2.6; float sw=fbm(vec3(cos(ang)*r*2.2,sin(ang)*r*2.2,3.0),5);
    float gm=1.0-smoothstep(0.72,1.05,r+(sw-0.5)*0.3);
    col=mix(col,vec3(0.93,0.87,0.78),(1.0-smoothstep(1.0,1.5,r))*(1.0-gm)*0.55);
    col=mix(col,mix(vec3(0.62,0.20,0.11),vec3(0.86,0.46,0.27),sw),gm);
    for(int k=0;k<4;k++){ vec2 o=vec2((lon-(0.9+float(k)*1.35))*cos(lat),lat+0.60)/vec2(0.06,0.04); col=mix(col,vec3(0.96,0.93,0.86),(1.0-smoothstep(0.6,1.0,length(o)))*0.85); }
    return vec4(col,0.5); }`,
  saturn: `vec4 surf(vec3 p,float lat,float lon){
    float t=fbm(p*2.0,4); float wv=fbm(vec3(p.x*2.5,p.y*9.0,p.z*2.5)+t,5)-0.5; float y=lat+wv*0.05;
    float b=sin(y*17.0)*0.5+0.5; b=mix(b,sin(y*41.0+0.7)*0.5+0.5,0.3);
    float st=fbm(vec3(p.x*4.0,p.y*60.0,p.z*4.0),5);
    vec3 col=mix(vec3(0.72,0.59,0.36),vec3(0.95,0.88,0.68),smoothstep(0.1,0.9,b));
    col=mix(col,vec3(0.86,0.76,0.52),clamp((st-0.5)*1.4+0.2,0.0,1.0));
    col=mix(col,vec3(0.60,0.56,0.44),smoothstep(1.0,1.4,abs(lat))*0.6);
    float hb=1.43+0.014*cos(lon*6.0); col=mix(col,vec3(0.50,0.50,0.42),smoothstep(hb-0.01,hb+0.01,lat)*0.4);
    return vec4(col,0.5); }`,
  uranus: `vec4 surf(vec3 p,float lat,float lon){
    float t=fbm(p*2.0,4); float b=sin((lat+(t-0.5)*0.1)*9.0)*0.5+0.5;
    vec3 col=mix(vec3(0.52,0.80,0.84),vec3(0.72,0.92,0.93),clamp(b*0.45+(t-0.5)*0.3+0.3,0.0,1.0));
    col=mix(col,vec3(0.86,0.97,0.97),smoothstep(0.7,1.3,lat)*0.6);
    col*=0.96+0.08*fbm(vec3(p.x*4.0,p.y*40.0,p.z*4.0),4);
    return vec4(col,0.5); }`,
  neptune: `vec4 surf(vec3 p,float lat,float lon){
    float t=fbm(p*2.0,5); float wv=fbm(vec3(p.x*3.0,p.y*9.0,p.z*3.0)+t,5)-0.5; float y=lat+wv*0.08;
    float b=sin(y*9.0)*0.5+0.5;
    vec3 col=mix(vec3(0.10,0.22,0.66),vec3(0.28,0.47,0.90),b);
    col=mix(col,vec3(0.16,0.32,0.78),fbm(vec3(p.x*5.0,p.y*40.0,p.z*5.0),5)*0.5);
    vec2 q=vec2((lon-2.0)*cos(lat),lat+0.36)/vec2(0.22,0.10); float r=length(q);
    col=mix(col,vec3(0.05,0.11,0.40),1.0-smoothstep(0.7,1.05,r));
    float ci=fbm(vec3(p.x*5.0,p.y*30.0,p.z*5.0)+wv*4.0,6);
    col=mix(col,vec3(0.92,0.95,1.0),smoothstep(0.70,0.84,ci)*0.65*max(1.0-smoothstep(0.9,2.6,r),0.25*smoothstep(0.75,0.95,sin(lat*7.0+1.0))));
    col=mix(col,vec3(0.07,0.14,0.45),smoothstep(1.0,1.45,abs(lat))*0.5);
    return vec4(col,0.5); }`
};
}

export { SURF };
