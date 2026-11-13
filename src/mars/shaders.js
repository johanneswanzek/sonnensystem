// mars/shaders – GLSL der Marsszene: Luftperspektive und Bodendetail (MB_GLSL), Himmel (SKY_FS).
// Exporte: MB_GLSL, SKY_FS

/* ---------- Mars-Basis: eigene Szene auf der Oberfläche, Einheit Meter ---------- */
// Gemeinsame Bausteine der Marsszene: Rauschen in Weltkoordinaten und Luftperspektive (Staubdunst, der mit der Höhe abnimmt und zur Sonne hin aufhellt)
const MB_GLSL = `
uniform vec3 mbSun; uniform vec3 mbHz; uniform vec3 mbHzS; uniform vec4 mbHzP; uniform vec3 mbCam;
float mbH(vec2 p){ vec3 q=fract(vec3(p.xyx)*0.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
float mbN(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(mbH(i),mbH(i+vec2(1.0,0.0)),f.x),mix(mbH(i+vec2(0.0,1.0)),mbH(i+vec2(1.0,1.0)),f.x),f.y); }
vec3 mbHaze(vec3 d){ float s=max(dot(d,mbSun),0.0); return mbHz*(0.86+0.14*smoothstep(-0.2,0.25,-d.y))+mbHzS*(pow(s,4.0)*0.7+pow(s,32.0)*0.8); }
vec3 mbAir(vec3 c,vec3 wp){
  vec3 v=wp-mbCam; float d=length(v); vec3 dir=v/max(d,0.001);
  float dy=v.y*mbHzP.y, f=abs(dy)>0.001 ? (1.0-exp(-dy))/dy : 1.0;
  float od=mbHzP.x*exp(-mbHzP.y*clamp(mbCam.y,-60.0,900.0))*d*f+mbHzP.z*d;
  return mix(c,mbHaze(dir),1.0-exp(-od));
}
`;
const SKY_FS = MB_GLSL + `
uniform vec3 sun; uniform vec3 hor; uniform vec3 zen; uniform float time; varying vec3 vD;
void main(){
  vec3 d=normalize(vD); float h=max(d.y,0.0);
  vec3 col=mix(hor,zen,pow(h,0.42));
  // hohe, dünne Eiswolken: gestreckte Schlieren, die mit dem Wind wandern
  vec2 cp=d.xz/(d.y+0.22)*vec2(1.1,3.2)+vec2(time*0.012,time*0.004);
  float cl=mbN(cp)*0.55+mbN(cp*2.3+7.0)*0.3+mbN(cp*5.1+3.0)*0.15;
  col=mix(col,hor*1.16+vec3(0.03),smoothstep(0.50,0.84,cl)*smoothstep(0.04,0.32,d.y)*0.2);
  float s=max(dot(d,sun),0.0);
  col+=hor*pow(s,4.0)*0.3;                                                    // Staub streut das Licht nach vorn: zur Sonne hin wird der Himmel heller
  col+=vec3(0.26,0.40,0.74)*(pow(s,12.0)*0.55+pow(s,90.0)*1.4+pow(s,600.0)*3.0);             // bläulicher Hof um die Sonne, wie auf dem Mars
  col=mix(col,mbHaze(d),exp(-h*9.0)*0.9);                                     // am Horizont geht der Himmel in den Dunst über
  col=mix(col,mbHaze(d),smoothstep(0.02,-0.06,d.y));
  col+=vec3(1.0,0.96,0.9)*smoothstep(0.99976,0.99989,s)*60.0;                // Sonnenscheibe, sehr hell (überstrahlt in der Nachbearbeitung)
  gl_FragColor=vec4(col,1.0);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`;

export { MB_GLSL, SKY_FS };
