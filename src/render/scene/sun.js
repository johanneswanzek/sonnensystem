// render/scene/sun – Sonne mit Korona, Halo und Strahlen.
// Exporte: buildSun
// Hängt ab von: core/util.js, render/canvas-textures.js, render/post.js, render/scene.js, render/shaders/space.js, core/state.js

import * as THREE from 'three';
import { S } from '../../core/state.js';
import { ss } from '../../core/util.js';
import { radialTex, raysTex } from '../canvas-textures.js';
import { POST } from '../post.js';
import { add, halo, rays, scene } from '../scene.js';
import { CORONA_FS, CORONA_VS, SUN_FS, VS } from '../shaders/space.js';

function buildSun(b) {
  S.sunMat = new THREE.ShaderMaterial({ uniforms: { time: { value: 0 } }, vertexShader: VS, fragmentShader: SUN_FS });
  b.mesh = new THREE.Mesh(new THREE.SphereGeometry(b.R, 64, 48), S.sunMat);
  b.fitR = b.R;
  scene.add(b.mesh);
  // Saum der Sonne; steht die Kamera in dieser Kugel (Merkur bei Sonnennähe), färbte ihre Rückseite das ganze Bild: dann ausblenden
  const sh = halo(b.R * 1.55, b.R, [1, 0.5, 0.14], 0.5, 1);
  scene.add(sh);
  sh.onBeforeRender = (r, sc, cam) => {
    sh.material.uniforms.k.value = 0.5 * ss(b.R * 1.65, b.R * 2.3, cam.position.distanceTo(sh.position));
  };
  // Korona mit Protuberanzen; sie leuchtet über den Bloom, deshalb sind Schein und Strahlen nur noch ein Hauch
  b.corona = new THREE.Mesh(
    new THREE.PlaneGeometry(b.R * 12, b.R * 12),
    new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, R: { value: b.R }, k: { value: POST.ok ? 1 : 0.6 } },
      vertexShader: CORONA_VS,
      fragmentShader: CORONA_FS,
      blending: add,
      transparent: true,
      depthWrite: false,
    }),
  );
  b.corona.frustumCulled = false;
  b.corona.onBeforeRender = () => {
    b.corona.material.uniforms.time.value = S.sunMat.uniforms.time.value;
  };
  scene.add(b.corona);
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: radialTex([
        [0, 'rgba(255,214,130,.9)'],
        [0.28, 'rgba(255,170,60,.42)'],
        [0.55, 'rgba(255,130,30,.12)'],
        [1, 'rgba(255,110,20,0)'],
      ]),
      blending: add,
      depthWrite: false,
      transparent: true,
      opacity: POST.ok ? 0.35 : 1,
    }),
  );
  glow.scale.set(13, 13, 1);
  scene.add(glow);
  // Nah an der Sonne (Merkur, Venus, Flug zur Erde) würden die großen Scheine das ganze Bild füllen: Unter dem Abstand der
  // Sonnen-Nahansicht (GLARE_D) schrumpfen sie mit dem Abstand, ihr scheinbarer Radius bleibt also begrenzt; der Rand gehört der Korona
  const GLARE_D = 20,
    cap = sp => {
      const s0 = sp.scale.x;
      sp.onBeforeRender = (r, sc, cam) => {
        sp.scale.setScalar(s0 * Math.min(1, cam.position.distanceTo(sp.position) / GLARE_D));
        sp.updateMatrixWorld();
      };
    };
  const glowOp = glow.material.opacity;
  cap(glow);
  const glowCap = glow.onBeforeRender;
  glow.onBeforeRender = (r, sc, cam) => {
    glowCap(r, sc, cam);
    glow.material.opacity = glowOp * (0.5 + 0.5 * ss(8, 30, cam.position.length()));
  };
  const wide = new THREE.Sprite(glow.material.clone());
  wide.scale.set(27, 27, 1);
  wide.userData.op = POST.ok ? 0.4 : 1;
  scene.add(wide);
  rays.push(wide);
  cap(wide);
  [1, 2].forEach(k => {
    const op = (k === 1 ? 0.5 : 0.35) * (POST.ok ? 0.45 : 1);
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: raysTex(k), blending: add, depthWrite: false, transparent: true, opacity: op }),
    );
    s.scale.set(30 + k * 5, 30 + k * 5, 1);
    s.userData.op = op;
    scene.add(s);
    rays.push(s);
    cap(s);
  });
}

export { buildSun };
