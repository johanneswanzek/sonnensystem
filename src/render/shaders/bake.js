// render/shaders/bake – GLSL der gebackenen Oberflächen (Rauschen, Höhen, Erde).
// Exporte: BAKE_LIB, BAKE_MAIN, BAKE_VS, EARTH_GEO

/* ---------- Oberflächen: prozedural auf der Grafikkarte berechnet ---------- */
const BAKE_VS = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;
const BAKE_LIB = `
varying vec2 vUv; uniform sampler2D src;
vec3 h33(vec3 p){ p=fract(p*vec3(0.1031,0.1030,0.0973)); p+=dot(p,p.yxz+33.33); return fract((p.xxy+p.yxx)*p.zyx); }
float h13(vec3 p){ p=fract(p*0.1031); p+=dot(p,p.zyx+31.32); return fract((p.x+p.y)*p.z); }
float gn(vec3 p){
  vec3 i=floor(p); vec3 f=fract(p); vec3 u=f*f*f*(f*(f*6.0-15.0)+10.0);
  float a=dot(h33(i)*2.0-1.0,f);
  float b=dot(h33(i+vec3(1.0,0.0,0.0))*2.0-1.0,f-vec3(1.0,0.0,0.0));
  float c=dot(h33(i+vec3(0.0,1.0,0.0))*2.0-1.0,f-vec3(0.0,1.0,0.0));
  float d=dot(h33(i+vec3(1.0,1.0,0.0))*2.0-1.0,f-vec3(1.0,1.0,0.0));
  float e=dot(h33(i+vec3(0.0,0.0,1.0))*2.0-1.0,f-vec3(0.0,0.0,1.0));
  float g=dot(h33(i+vec3(1.0,0.0,1.0))*2.0-1.0,f-vec3(1.0,0.0,1.0));
  float h=dot(h33(i+vec3(0.0,1.0,1.0))*2.0-1.0,f-vec3(0.0,1.0,1.0));
  float k=dot(h33(i+vec3(1.0,1.0,1.0))*2.0-1.0,f-vec3(1.0,1.0,1.0));
  return mix(mix(mix(a,b,u.x),mix(c,d,u.x),u.y),mix(mix(e,g,u.x),mix(h,k,u.x),u.y),u.z);
}
float fbm(vec3 p,int o){
  float a=0.5; float s=0.0; float n=0.0;
  for(int i=0;i<9;i++){ if(i>=o) break; s+=a*gn(p); n+=a; p=p*2.03+vec3(11.7,3.1,7.9); a*=0.5; }
  return clamp(0.5+0.95*s/n,0.0,1.0);
}
// Einschlagkrater: Schüssel mit aufgeworfenem Rand, zufällig in einem 3D-Gitter verteilt
float craters(vec3 p,float fr,float dens){
  vec3 q=p*fr; vec3 i=floor(q); float h=0.0;
  for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) for(int z=-1;z<=1;z++){
    vec3 c=i+vec3(float(x),float(y),float(z));
    if(h13(c+3.7)>dens) continue;
    vec3 r=h33(c+17.0);
    float rad=0.2+0.32*r.x*r.x;
    float d=length(q-(c+0.25+0.5*r.yzx))/rad;
    h+=0.62*(d*d-1.0)*(1.0-smoothstep(0.82,1.0,d))+0.34*smoothstep(0.7,1.0,d)*(1.0-smoothstep(1.0,1.6,d));
  }
  return h;
}
float grain(vec3 p){ return (h13(p*913.0)-0.5)/255.0; }
`;
const BAKE_MAIN = `
void main(){ float lon=vUv.x*6.2831853; float lat=(vUv.y-0.5)*3.14159265; float cl=cos(lat);
  gl_FragColor=surf(vec3(cl*cos(lon),sin(lat),cl*sin(lon)),lat,lon); }`;
// Erde: gemeinsame Geografie für Tag, Nacht und Wolken
const EARTH_GEO = `
void geo(vec3 p,float lat,out float n,out float e,out float land,out float m,out float ice,out float dry){
  n=fbm(p*1.25+vec3(5.2,1.3,9.1),4)*0.66+fbm(p*4.0+vec3(2.0,7.0,1.0),8)*0.34;
  e=clamp((n-0.52)/0.15,0.0,1.0); land=smoothstep(0.517,0.523,n);
  m=fbm(p*5.0+7.0,6);
  float al=abs(lat);
  ice=smoothstep(1.13,1.25,al+(m-0.5)*0.35+land*0.12);
  dry=(1.0-smoothstep(0.0,0.30,abs(al-0.42)))*smoothstep(0.40,0.60,m*0.6+e*0.5+0.15);
}`;

export { BAKE_LIB, BAKE_MAIN, BAKE_VS, EARTH_GEO };
