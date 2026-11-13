// render/shaders/post – GLSL der Nachbearbeitung: Vertex-Shader des Vollbild-Rechtecks.
// Exporte: VSQ
// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.

const VSQ = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;

export { VSQ };
