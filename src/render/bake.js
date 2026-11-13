// render/bake – Backen auf der Grafikkarte: Shader in eine Textur rechnen (bake, bakeFlat).
// Exporte: bake, bakeFlat, nextFrame; initBake
// Hängt ab von: core/device.js, render/renderer.js, render/scene.js, render/shaders/bake.js

import * as THREE from 'three';
import { DESKTOP } from '../core/device.js';
import { renderer } from './renderer.js';
import { blackTex } from './scene.js';
import { BAKE_LIB, BAKE_MAIN, BAKE_VS } from './shaders/bake.js';

// Belegt in initBake() (Reihenfolge des Starts, siehe main.js)
let bakeScene, bakeCam, bakeQuad;

const nextFrame = () => new Promise(r => requestAnimationFrame(r));
// Rendert eine Oberfläche in eine Textur (Farbe in RGB, Höhe oder Maske in A), in Streifen, damit die Seite bedienbar bleibt
async function bake(w,body,src){
  w = Math.min(w,renderer.capabilities.maxTextureSize,DESKTOP ? 4096 : 2048); const h = w/2;
  const rt = new THREE.WebGLRenderTarget(w,h,{minFilter:THREE.LinearMipmapLinearFilter, magFilter:THREE.LinearFilter, format:THREE.RGBAFormat,
    depthBuffer:false, stencilBuffer:false, generateMipmaps:true, wrapS:THREE.RepeatWrapping});
  rt.texture.anisotropy = Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const mat = new THREE.ShaderMaterial({uniforms:{src:{value:src || blackTex}}, vertexShader:BAKE_VS, fragmentShader:BAKE_LIB + body + BAKE_MAIN, depthTest:false, depthWrite:false, blending:THREE.NoBlending});
  bakeQuad.material = mat;
  const strips = w > 1024 ? 4 : 2;
  rt.scissorTest = true;
  for (let s = 0; s < strips; s++) {
    rt.scissor.set(Math.floor(w*s/strips),0,Math.ceil(w/strips),h);
    renderer.setRenderTarget(rt); renderer.render(bakeScene,bakeCam); renderer.setRenderTarget(null);
    await nextFrame();
  }
  mat.dispose();
  rt.texture.texelStep = new THREE.Vector2(1.5/w,1.5/h);
  return rt.texture;
}
// Kachelbare Bodentextur (gespiegelt wiederholt, damit keine Naht entsteht)
async function bakeFlat(size,body){
  size = Math.min(size,renderer.capabilities.maxTextureSize);
  const rt = new THREE.WebGLRenderTarget(size,size,{minFilter:THREE.LinearMipmapLinearFilter, magFilter:THREE.LinearFilter, format:THREE.RGBAFormat,
    depthBuffer:false, stencilBuffer:false, generateMipmaps:true, wrapS:THREE.MirroredRepeatWrapping, wrapT:THREE.MirroredRepeatWrapping});
  rt.texture.anisotropy = Math.min(8,renderer.capabilities.getMaxAnisotropy()); rt.texture.encoding = THREE.sRGBEncoding;
  const mat = new THREE.ShaderMaterial({uniforms:{src:{value:blackTex}}, vertexShader:BAKE_VS, fragmentShader:BAKE_LIB + body + 'void main(){ gl_FragColor=surf2(vUv); }', depthTest:false, depthWrite:false, blending:THREE.NoBlending});
  bakeQuad.material = mat;
  renderer.setRenderTarget(rt); renderer.render(bakeScene,bakeCam); renderer.setRenderTarget(null);
  await nextFrame(); mat.dispose();
  return rt.texture;
}

export function initBake(){
bakeScene = new THREE.Scene(), bakeCam = new THREE.Camera();
bakeQuad = new THREE.Mesh(new THREE.PlaneGeometry(2,2)); bakeQuad.frustumCulled = false; bakeScene.add(bakeQuad);
}

export { bake, bakeFlat, nextFrame };
