// render/scene/planets – Planeten mit Atmosphäre, Wolken, Ringen, Monden und Bahnen.
// Exporte: buildPlanet
// Hängt ab von: core/util.js, orbit/kepler.js, render/canvas-textures.js, render/scene.js, render/shaders/space.js, core/state.js

import * as THREE from 'three';
import { S } from '../../core/state.js';
import { DEG, TAU } from '../../core/util.js';
import { basis } from '../../orbit/kepler.js';
import { hash, ringTex } from '../canvas-textures.js';
import { blackTex, halo, marker, orbitLine, planetTime, points, rockMat, scene } from '../scene.js';
import { CLOUD_FS, LAYER_FS, PLANET_FS, RING_FS, VS } from '../shaders/space.js';

function buildPlanet(b) {
  b.m = basis(b.el);
  b.period = (36525 * 360) / b.el.dL;
  b.fitR = b.fitR || b.R;
  b.fill = b.fill || 0.42;
  b.rMean = 10 * Math.pow(b.el.a, 0.45);
  b.axis = new THREE.Vector3(-Math.sin(b.tilt * DEG), Math.cos(b.tilt * DEG), 0);
  b.pivot = new THREE.Group();
  b.tiltG = new THREE.Group();
  b.tiltG.rotation.z = b.tilt * DEG;
  b.pivot.add(b.tiltG);
  scene.add(b.pivot);
  const at = b.atmo || [0, 0, 0, 0];
  const defs = b.aux ? { EARTH: 1 } : {};
  b.cut = new THREE.Vector2(0, 0);
  b.ccut = new THREE.Vector2(0, 0);
  b.mesh = new THREE.Mesh(
    new THREE.SphereGeometry(b.R, 128, 80),
    new THREE.ShaderMaterial({
      defines: defs,
      uniforms: {
        map: { value: b.map },
        nmap: { value: b.ntex || blackTex },
        aux: { value: b.aux || blackTex },
        nightK: { value: b.ntex ? 1 : 0 },
        specK: { value: b.spec || 0 },
        bumpK: { value: b.bump || 0 },
        gas: { value: b.gas || 0 },
        texel: { value: b.map.texelStep },
        atmo: { value: new THREE.Vector4(at[0], at[1], at[2], at[3]) },
        cut: { value: b.cut },
        cloud: { value: new THREE.Vector2(0, 0) },
        center: { value: b.pos },
        ringN: { value: b.axis },
        ringR: { value: new THREE.Vector3(b.R * 1.22, b.R * 2.3, b.id === 'saturn' ? 1 : 0) },
        tint: { value: new THREE.Color(1, 1, 1) },
        haze: { value: new THREE.Vector4(...(b.haze || [0, 0, 0, 0])) },
        time: planetTime,
        flow: { value: b.flow || 0 },
        detail: { value: b.detail || 0 },
      },
      vertexShader: VS,
      fragmentShader: PLANET_FS,
    }),
  );
  if (b.flow)
    b.mesh.onBeforeRender = () => {
      planetTime.value = S.sunMat.uniforms.time.value;
    };
  b.tiltG.add(b.mesh);
  if (b.ctex) {
    b.clouds = new THREE.Mesh(
      new THREE.SphereGeometry(b.R * 1.015, 96, 64),
      new THREE.ShaderMaterial({
        defines: defs,
        uniforms: { map: { value: b.ctex }, op: { value: 1 }, cut: { value: b.ccut } },
        vertexShader: VS,
        fragmentShader: CLOUD_FS,
        transparent: true,
        depthWrite: false,
      }),
    );
    b.tiltG.add(b.clouds);
  }
  if (b.id === 'earth') {
    // Zwei Halbscheiben als Schnittflächen; sie klappen mit dem Keil auf
    b.layerMat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, R: { value: b.R }, lit: { value: new THREE.Vector4(0, 0, 0, 0) } },
      vertexShader: VS,
      fragmentShader: LAYER_FS,
      side: THREE.DoubleSide,
    });
    const fg = new THREE.CircleGeometry(b.R * 0.999, 128, -Math.PI / 2, Math.PI);
    b.faces = [new THREE.Mesh(fg, b.layerMat), new THREE.Mesh(fg, b.layerMat)];
    b.faces.forEach(f => {
      f.visible = false;
      b.mesh.add(f);
    });
  }
  if (b.atmo) b.pivot.add(halo(b.R * 1.14, b.R, at, at[3], 0));
  if (b.id === 'earth') b.pivot.add(halo(b.R * 1.04, b.R, [0.6, 0.8, 1], 0.75, 0)); // dünner, heller Saum direkt am Rand
  if (b.id === 'saturn') {
    const inner = b.R * 1.22,
      outer = b.R * 2.3,
      rg = new THREE.RingGeometry(inner, outer, 160, 1);
    const pa = rg.attributes.position,
      ua = rg.attributes.uv,
      v = new THREE.Vector3();
    for (let k = 0; k < pa.count; k++) {
      v.fromBufferAttribute(pa, k);
      ua.setXY(k, (v.length() - inner) / (outer - inner), 0.5);
    }
    b.ringMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: ringTex() }, center: { value: b.pos }, R: { value: b.R } },
      vertexShader: VS,
      fragmentShader: RING_FS,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(rg, b.ringMat);
    ring.rotation.x = -Math.PI / 2;
    b.tiltG.add(ring);
  }
  if (b.id === 'uranus') {
    // dünne, dunkle Ringe; der äußere (Epsilon) ist der breiteste
    [
      [1.64, 1.648, 0.22],
      [1.71, 1.716, 0.2],
      [1.8, 1.808, 0.24],
      [1.94, 1.968, 0.42],
    ].forEach(([r0_, r1_, op]) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(b.R * r0_, b.R * r1_, 192, 1),
        new THREE.MeshBasicMaterial({
          color: 0x7d8a8e,
          transparent: true,
          opacity: op,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      b.tiltG.add(ring);
    });
  }
  (b.sats || []).forEach((s, k) => {
    const parent = s.ecl ? b.pivot : b.tiltG;
    s.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(s.r, 48, 32),
      rockMat(s.map || S.moonTex, s.map ? 0xffffff : s.c, s.map ? 6 : 5),
    );
    s.world = new THREE.Vector3();
    s.ph = hash(k, 3, b.diam) * TAU;
    s.vis = 0;
    s.rgb = ((s.c >> 16) & 255) + ',' + ((s.c >> 8) & 255) + ',' + (s.c & 255);
    parent.add(s.mesh);
    const N = 128,
      pts = new Float32Array(N * 3);
    for (let q = 0; q < N; q++) {
      pts[q * 3] = b.R * s.a * Math.cos((q / N) * TAU);
      pts[q * 3 + 2] = b.R * s.a * Math.sin((q / N) * TAU);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    parent.add(
      new THREE.LineLoop(
        g,
        new THREE.LineBasicMaterial({ color: s.c, transparent: true, opacity: 0.22, depthWrite: false }),
      ),
    );
  });
  // Jeder weitere bekannte Mond als ein Lichtpunkt
  const extra = b.moons - (b.sats ? b.sats.length : 0);
  if (extra > 0) {
    b.swarm = points(
      extra,
      (i, o) => {
        const u = hash(i, 1, b.diam) * 2 - 1,
          a = hash(i, 2, b.diam) * TAU,
          s = Math.sqrt(1 - u * u),
          r = b.R * (2.5 + 1.6 * hash(i, 3, b.diam)),
          k = 0.5 + 0.5 * hash(i, 4, b.diam);
        o[0] = r * s * Math.cos(a);
        o[1] = r * u * 0.5;
        o[2] = r * s * Math.sin(a);
        o[3] = k;
        o[4] = k;
        o[5] = k * 0.92;
      },
      1.7,
      0xffffff,
      0,
    );
    b.swarm.visible = false;
    b.pivot.add(b.swarm);
  }
  b.dot = marker(b.color);
  b.pivot.add(b.dot);
  b.orbit = orbitLine(b, 400, b.color, 0.2, 1);
  scene.add(b.orbit);
}

export { buildPlanet };
