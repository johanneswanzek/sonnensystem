// mars/sky-shader – GLSL des Marshimmels.
// Exporte: SKY_FS
// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.

/* ---------- Mars-Basis: eigene Szene auf der Oberfläche, Einheit Meter ---------- */
const SKY_FS = `
uniform vec3 sun; uniform vec3 hor; uniform vec3 zen; uniform float time; varying vec3 vD;
float sh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float sn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(sh(i),sh(i+vec2(1.0,0.0)),f.x),mix(sh(i+vec2(0.0,1.0)),sh(i+vec2(1.0,1.0)),f.x),f.y); }
void main(){
  vec3 d=normalize(vD); float h=max(d.y,0.0);
  vec3 col=mix(hor,zen,pow(h,0.42));
  // hohe, dünne Eiswolken: gestreckte Schlieren, die mit dem Wind wandern
  vec2 cp=d.xz/(d.y+0.22)*vec2(1.1,3.2)+vec2(time*0.012,time*0.004);
  float cl=sn(cp)*0.55+sn(cp*2.3+7.0)*0.3+sn(cp*5.1+3.0)*0.15;
  col=mix(col,hor*1.16+vec3(0.03),smoothstep(0.50,0.84,cl)*smoothstep(0.04,0.32,d.y)*0.2);
  float s=max(dot(d,sun),0.0);
  col+=hor*pow(s,4.0)*0.35;                                  // Staub streut das Licht nach vorn: zur Sonne hin wird der Himmel heller
  col+=vec3(0.30,0.42,0.70)*pow(s,24.0)*0.55;                // bläulicher Hof um die Sonne, wie auf dem Mars
  col+=vec3(1.0,0.96,0.88)*smoothstep(0.99972,0.99990,s)*9.0;
  col=mix(col,hor*1.04,smoothstep(0.07,-0.04,d.y));
  gl_FragColor=vec4(col,1.0);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`;

export { SKY_FS };
