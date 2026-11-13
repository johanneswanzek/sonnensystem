// render/surfaces – SURF: prozedurale Oberflächen der Himmelskörper als Shader-Bausteine.
// Exporte: SURF; initSurfaces
// Hängt ab von: render/shaders/bake.js

import { EARTH_GEO } from './shaders/bake.js';

// Belegt in initSurfaces() (Reihenfolge des Starts, siehe main.js)
let SURF;

export function initSurfaces(){
SURF = {
  mercury: `vec4 surf(vec3 p,float lat,float lon){
    float n=fbm(p*2.5+3.0,7); float m=fbm(p*1.3+9.0,4);
    float cr=craters(p,3.0,0.5)*0.45+craters(p,7.0,0.62)*0.32+craters(p,16.0,0.68)*0.18+craters(p,37.0,0.7)*0.1+craters(p,85.0,0.72)*0.05;
    // glatte Ebenen (dunkler, weniger Krater) und helle Strahlen junger Krater
    float pl=smoothstep(0.55,0.68,m);
    vec3 col=mix(vec3(0.36,0.34,0.32),vec3(0.62,0.59,0.55),smoothstep(0.3,0.7,n));
    col=mix(col,vec3(0.30,0.29,0.28),pl*0.55);
    col*=0.88+0.45*cr*(1.0-pl*0.5);
    for(int k=0;k<3;k++){ vec3 rc=normalize(h33(vec3(float(k)*7.1,3.0,1.0))*2.0-1.0); float rd=acos(clamp(dot(p,rc),-1.0,1.0));
      float ry=fbm(normalize(p-rc*dot(p,rc)+vec3(1e-4))*16.0+float(k),4); col+=0.16*exp(-rd*4.0)*smoothstep(0.56,0.76,ry)+0.18*(1.0-smoothstep(0.015,0.04,rd)); }
    return vec4(clamp(col,0.0,1.0),clamp(0.55+0.25*(n-0.5)+0.5*cr*(1.0-pl*0.4)-0.05*pl+grain(p),0.0,1.0)); }`,
  moon: `vec4 surf(vec3 p,float lat,float lon){
    float n=fbm(p*2.0+5.0,7); float w=fbm(p*0.9+1.0,4);
    float cr=craters(p,3.0,0.55)*0.5+craters(p,7.0,0.65)*0.32+craters(p,16.0,0.7)*0.18+craters(p,37.0,0.72)*0.1+craters(p,80.0,0.75)*0.05;
    float mare=smoothstep(0.50,0.60,fbm(p*1.1+vec3(2.0,w,1.0),5))*smoothstep(-0.2,0.6,p.z+0.3);
    vec3 col=mix(vec3(0.56,0.55,0.53),vec3(0.80,0.79,0.76),n);
    col=mix(col,vec3(0.30,0.30,0.32)+0.06*(fbm(p*9.0,4)-0.5),mare*0.85);
    col*=0.86+0.42*cr*(1.0-mare*0.6);
    // helle Strahlen junger Krater
    vec3 rc=normalize(vec3(0.35,-0.75,0.55)); float rd=acos(clamp(dot(p,rc),-1.0,1.0));
    float ry=fbm(normalize(p-rc*dot(p,rc)+vec3(1e-4))*18.0,4); col+=0.22*exp(-rd*3.0)*smoothstep(0.55,0.75,ry)+0.25*(1.0-smoothstep(0.02,0.05,rd));
    float h=0.5+0.18*(n-0.5)+0.45*cr-0.06*mare;
    return vec4(clamp(col,0.0,1.0),clamp(h+grain(p),0.0,1.0)); }`,
  // Kleine Monde und Mars-Monde nach NASA-Karte (Graustufen): Farbe aus der Karte, Höhe aus Helligkeit und zusätzlichen Kratern
  rockReal: `vec4 surf(vec3 p,float lat,float lon){
    vec3 real=texture2D(src,vUv).rgb; float lum=dot(real,vec3(0.333));
    float cr=craters(p,22.0,0.55)*0.3+craters(p,50.0,0.6)*0.15;
    float n=fbm(p*14.0,5);
    vec3 col=real*(0.92+0.2*cr)*(0.94+0.12*(n-0.5)*2.0);
    return vec4(clamp(col,0.0,1.0),clamp(0.5+0.6*(lum-0.5)+0.35*cr+0.08*(n-0.5)+grain(p),0.0,1.0)); }`,
  // Venus im sichtbaren Licht fast strukturlos; die großen Y-Muster der Wolkenoberseite (aus UV-Aufnahmen) zart angedeutet:
  // am Äquator eilen die Wolken voraus, zu den Polen hin bleiben sie zurück, dadurch liegen die dunklen Bänder als Winkel
  venus: `vec4 surf(vec3 p,float lat,float lon){
    float cl=cos(lat); float sl=sin(lat);
    float w=fbm(p*1.4+3.0,5);
    float sh=lon+1.25*abs(sl)+0.35*sl*sl+(w-0.5)*0.6;
    vec3 q=vec3(cos(sh)*cl,sl*2.2,sin(sh)*cl);
    float big=fbm(q*0.85+vec3(4.0,0.0,1.0),5);
    float str=fbm(vec3(q.x*2.0,q.y*9.0,q.z*2.0)+w*1.5,7);
    float fine=fbm(p*vec3(9.0,20.0,9.0)+w*2.0,5);
    float y=smoothstep(0.34,0.70,big*0.88+str*0.12);
    vec3 col=mix(vec3(0.80,0.67,0.44),vec3(0.98,0.93,0.80),y);
    col*=0.975+0.05*(fine-0.5)*2.0;
    // helle Polarkragen, dunkler Saum davor
    float al=abs(lat);
    col=mix(col,col*vec3(0.88,0.84,0.78),smoothstep(0.95,1.1,al)*(1.0-smoothstep(1.15,1.3,al))*0.6);
    col=mix(col,vec3(1.0,0.97,0.88),smoothstep(1.2,1.45,al)*0.6);
    return vec4(clamp(col,0.0,1.0),clamp(0.5+0.25*(y-0.5)+0.1*(fine-0.5),0.0,1.0)); }`,
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
    // Großer Roter Fleck (in der Karte bei u 0,20, v 0,33): Abtastung im Wirbel gedreht, innen stärker
    vec2 gc=vec2(0.200,0.330); vec2 gd=(vUv-gc)*vec2(2.0,1.0); float gr=length(gd/vec2(0.07,0.042));
    float ga=2.2*exp(-gr*gr*0.9)*(1.0-smoothstep(1.4,2.2,gr)); float ca=cos(ga); float sa=sin(ga);
    vec2 uv=gc+vec2(ca*gd.x-sa*gd.y,sa*gd.x+ca*gd.y)/vec2(2.0,1.0);
    float st=fbm(vec3(p.x*5.0,p.y*52.0,p.z*5.0)+wv*3.0,6);
    float ed=fbm(vec3(p.x*14.0,p.y*30.0,p.z*14.0)+t*4.0,6);
    vec3 real=texture2D(src,uv+vec2(wv*0.006,wv*0.003)*(1.0-smoothstep(0.8,1.6,gr))).rgb;
    vec3 col=real*1.12*(0.84+0.32*st)*(0.93+0.14*ed);
    col=mix(col,vec3(dot(col,vec3(0.33))),0.15);
    col=mix(col,vec3(0.46,0.40,0.36),smoothstep(1.05,1.45,abs(lat))*0.8);
    float lum=dot(col,vec3(0.3,0.5,0.2));
    return vec4(clamp(col,0.0,1.0),clamp(0.5+0.5*(lum-0.5)+0.1*(st-0.5)+0.12*exp(-gr*gr),0.0,1.0)); }`,
  // Saturn: NASA-Karte (720×360) als Grundlage, feine Bänder und Turbulenz dazu, Hexagon am Nordpol nur angedeutet
  saturnReal: `vec4 surf(vec3 p,float lat,float lon){
    float t=fbm(p*2.0,4); float wv=fbm(vec3(p.x*2.5,p.y*9.0,p.z*2.5)+t,5)-0.5;
    vec3 real=texture2D(src,vec2(vUv.x,vUv.y+wv*0.004)).rgb;
    float st=fbm(vec3(p.x*4.0,p.y*70.0,p.z*4.0)+wv*2.0,6); float ed=fbm(vec3(p.x*10.0,p.y*30.0,p.z*10.0)+t*3.0,5);
    vec3 col=real*(0.88+0.24*st)*(0.96+0.08*ed);
    float lu=dot(col,vec3(0.3,0.55,0.15)); col=mix(col,lu*vec3(1.08,0.98,0.78),0.6)*0.95;
    float hb=1.40+0.012*cos(lon*6.0); col=mix(col,col*vec3(0.80,0.84,0.86),smoothstep(hb-0.012,hb+0.012,lat)*0.45);
    col=mix(col,vec3(0.66,0.64,0.57)*(0.9+0.2*st),smoothstep(1.25,1.5,abs(lat))*0.75);
    return vec4(clamp(col,0.0,1.0),clamp(0.5+0.4*(dot(col,vec3(0.33))-0.6)+0.08*(st-0.5),0.0,1.0)); }`,
  // Milchstraße als Himmelshintergrund (Breite 0 = galaktische Ebene): diffuses Band, helleres Zentrum, dunkle Staubbahnen
  milky: `vec4 surf(vec3 p,float lat,float lon){
    float w=fbm(p*3.0+1.0,5);
    float band=exp(-pow(lat/(0.11+0.05*w),2.0));
    float core=exp(-pow(lat/0.28,2.0))*pow(max(cos(lon-3.14159),0.0),3.0);
    float cl=fbm(p*9.0+w*1.5,7); float dust=smoothstep(0.48,0.64,fbm(p*6.0+vec3(3.0,w,1.0),6))*exp(-pow(lat/0.07,2.0));
    float I=(band*smoothstep(0.25,0.85,cl)*1.2+core*0.9*(0.5+cl))*(1.0-0.85*dust);
    vec3 col=mix(vec3(0.62,0.70,0.95),vec3(1.0,0.86,0.68),clamp(core*1.4+0.2*cl,0.0,1.0))*I;
    return vec4(col,1.0); }`,
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
  // Uranus: fast strukturlose Dunstkugel, zarte Bänder, hellere Polkappe (Südpol zeigt zur Sonne), wenige helle Flecken
  uranus: `vec4 surf(vec3 p,float lat,float lon){
    float t=fbm(p*1.6,4); float y=lat+(t-0.5)*0.06;
    float b=sin(y*7.0)*0.5+0.5; float b2=sin(y*19.0+0.8)*0.5+0.5;
    vec3 col=mix(vec3(0.55,0.78,0.80),vec3(0.66,0.86,0.87),b*0.6+b2*0.15+(t-0.5)*0.25);
    col=mix(col,vec3(0.80,0.92,0.92),smoothstep(-0.6,-1.25,lat)*0.7);
    col*=0.985+0.03*fbm(vec3(p.x*4.0,p.y*36.0,p.z*4.0),4);
    float sp=smoothstep(0.80,0.88,fbm(vec3(p.x*6.0,p.y*22.0,p.z*6.0)+5.0,5))*(1.0-smoothstep(0.2,0.7,abs(lat-0.55)));
    col=mix(col,vec3(0.93,0.98,0.98),sp*0.5);
    return vec4(col,0.5); }`,
  // Neptun: NASA-Karte (stark geglättet) nur als Farbschwankung, darüber Bänder, Großer Dunkler Fleck mit hellem Begleiter, Zirren
  neptuneReal: `vec4 surf(vec3 p,float lat,float lon){
    float t=fbm(p*2.0,5); float wv=fbm(vec3(p.x*3.0,p.y*9.0,p.z*3.0)+t,5)-0.5; float y=lat+wv*0.06;
    vec3 real=(texture2D(src,vUv).rgb+texture2D(src,vUv+vec2(0.01,0.006)).rgb+texture2D(src,vUv-vec2(0.01,0.006)).rgb)/3.0;
    float rl=dot(real,vec3(0.2,0.4,0.4));
    float b=sin(y*8.0)*0.5+0.5;
    vec3 col=mix(vec3(0.13,0.27,0.70),vec3(0.27,0.47,0.88),b*0.55+(rl-0.4)*0.9);
    col=mix(col,vec3(0.20,0.36,0.82),fbm(vec3(p.x*4.0,p.y*34.0,p.z*4.0),5)*0.35);
    col=mix(col,vec3(0.10,0.19,0.55),smoothstep(-0.95,-1.35,lat)*0.5);
    col=mix(col,vec3(0.17,0.33,0.80),smoothstep(-1.35,-1.5,lat)*0.6);
    vec2 q=vec2((lon-2.0)*cos(lat),lat+0.38)/vec2(0.20,0.085); float r=length(q);
    col=mix(col,vec3(0.05,0.11,0.38),(1.0-smoothstep(0.55,1.0,r+(t-0.5)*0.4))*0.9);
    vec2 q2=vec2((lon-2.06)*cos(lat),lat+0.47)/vec2(0.10,0.025);
    float ci=fbm(vec3(p.x*5.0,p.y*34.0,p.z*5.0)+wv*4.0,6);
    float zone=max(1.0-smoothstep(0.6,1.4,length(q2)),0.55*smoothstep(0.7,0.95,sin(lat*6.0+1.2)));
    col=mix(col,vec3(0.94,0.97,1.0),smoothstep(0.66,0.82,ci)*0.8*zone);
    col=mix(col,vec3(0.94,0.97,1.0),(1.0-smoothstep(0.5,1.0,length(q2)))*0.7);
    return vec4(col,0.5); }`,
};
// ohne Karte: dieselbe Oberfläche mit gleichmäßiger Grundfarbe
SURF.neptune = SURF.neptuneReal.replace('float rl=dot(real,vec3(0.2,0.4,0.4));','float rl=0.4;');
}

export { SURF };
