// ================================================================
// ATELIER CORE — shared shader system for TMMT Lookbook 3D
// Messenger-style cel-shading + Inverted Hull outline
// ================================================================
//
// Exports:
//   - THREE (re-exported for convenience in garment modules)
//   - LIGHT_DIR: world-space key light direction (THREE.Vector3)
//   - VERT_SHADER, OUTLINE_VERT_SHADER, FRAG_SHADER, OUTLINE_FRAG_SHADER
//   - MATERIAL_PRESETS: registry of presets by material key
//   - createShaderMaterial(presetKey): returns THREE.ShaderMaterial
//   - addOutline(mesh, thickness): wraps a mesh with Inverted Hull outline
//   - applyPuffy(geo, amount, freq): procedural displacement helper
// ================================================================

import * as THREE from 'three';

// Key light — warm editorial direction
export const LIGHT_DIR = new THREE.Vector3(4, 6, 3).normalize();

// ----------------------------------------------------------------
// Shaders
// ----------------------------------------------------------------
export const VERT_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const OUTLINE_VERT_SHADER = /* glsl */ `
  uniform float uOutlineThickness;
  void main() {
    // Push along normal in OBJECT space for consistent thickness
    vec3 displaced = position + normal * uOutlineThickness;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

export const FRAG_SHADER = /* glsl */ `
  precision highp float;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  uniform vec3  uBaseColor;
  uniform vec3  uShadowColor;
  uniform vec3  uLightDir;
  uniform float uBands;
  uniform float uSpecIntensity;
  uniform float uSpecShininess;
  uniform float uSpecThreshold;
  uniform int   uMaterialType;       // 0 nylon, 1 denim, 2 laser, 3 fur
  uniform float uShellIndex;
  uniform float uShellCount;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightDir);
    float NdotL = dot(N, L);

    // HARD cel-shading — Messenger style: discrete bands, no softness
    float shade = NdotL * 0.5 + 0.5;
    float band = floor(shade * uBands) / uBands;
    band = clamp(band, 0.0, 1.0);

    vec3 color = mix(uShadowColor, uBaseColor, band);
    float alpha = 1.0;
    vec3 V = normalize(cameraPosition - vWorldPos);

    if (uMaterialType == 0) {
      // NYLON — tight specular highlight
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(N, H), 0.0), uSpecShininess);
      spec = step(uSpecThreshold, spec);
      color += vec3(spec) * uSpecIntensity;
    } else if (uMaterialType == 1) {
      // DENIM — weave + hand-bleaching
      float weave = sin(vUv.y * 220.0) * 0.5 + 0.5;
      weave = mix(0.93, 1.0, weave);
      float fabNoise = fbm(vUv * 6.0);
      float bleach = fbm(vUv * 2.5);
      bleach = smoothstep(0.4, 0.65, bleach);
      vec3 bleached = mix(uBaseColor, uBaseColor * 1.8 + vec3(0.08, 0.09, 0.1), 0.7);
      vec3 base = mix(uBaseColor, bleached, bleach) * weave * mix(0.85, 1.15, fabNoise);
      color = mix(uShadowColor, base, band);
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(N, H), 0.0), uSpecShininess);
      color += vec3(spec) * uSpecIntensity * 0.3;
    } else if (uMaterialType == 2) {
      // LASER ENGRAVED
      float engrave = fbm(vUv * 35.0);
      float mask = smoothstep(0.48, 0.52, engrave);
      vec3 fakeN = N;
      float p = (engrave - 0.5) * 0.7;
      fakeN.xy += vec2(p, -p * 0.7);
      fakeN = normalize(fakeN);
      float eShade = dot(fakeN, L) * 0.5 + 0.5;
      float eBand = floor(eShade * uBands) / uBands;
      vec3 lightC = mix(uShadowColor, uBaseColor, band);
      vec3 darkC = mix(uShadowColor * 0.4, uBaseColor * 0.4, eBand);
      color = mix(lightC, darkC, mask);
    } else if (uMaterialType == 3) {
      // FUR SHELLS — alpha noise + tip color gradient
      float strandN = fbm(vUv * 60.0 + uShellIndex * 0.5);
      float strands = smoothstep(0.3, 0.65, strandN);
      float shellProg = uShellIndex / uShellCount;
      float shellFade = 1.0 - shellProg * 0.85;
      alpha = strands * shellFade;
      vec3 innerC = uBaseColor * 0.65;
      vec3 outerC = uBaseColor * 1.25;
      vec3 furC = mix(innerC, outerC, shellProg);
      furC *= mix(0.8, 1.2, strandN);
      color = mix(uShadowColor * 0.7, furC, band);
    }

    color = pow(color, vec3(1.0 / 2.2));
    gl_FragColor = vec4(color, alpha);
  }
`;

export const OUTLINE_FRAG_SHADER = /* glsl */ `
  precision highp float;
  uniform vec3 uOutlineColor;
  void main() {
    gl_FragColor = vec4(uOutlineColor, 1.0);
  }
`;

// Fur vertex shader displaces along normals per shell
export const FUR_VERT_SHADER = /* glsl */ `
  uniform float uShellOffset;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 displaced = position + normal * uShellOffset;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// ----------------------------------------------------------------
// Material presets
// ----------------------------------------------------------------
export const MATERIAL_PRESETS = {
  denim: {
    baseColor: new THREE.Color(0x3a5070),
    shadowColor: new THREE.Color(0x1a2535),
    bands: 3.0,
    specIntensity: 0.3, specShininess: 12.0, specThreshold: 0.85,
    type: 1, isFur: false,
  },
  nylon: {
    baseColor: new THREE.Color(0x2a2a2a),
    shadowColor: new THREE.Color(0x0a0a0a),
    bands: 3.0,
    specIntensity: 1.8, specShininess: 80.0, specThreshold: 0.55,
    type: 0, isFur: false,
  },
  nylonLight: {
    baseColor: new THREE.Color(0x383838),
    shadowColor: new THREE.Color(0x141414),
    bands: 3.0,
    specIntensity: 1.6, specShininess: 70.0, specThreshold: 0.55,
    type: 0, isFur: false,
  },
  laser: {
    baseColor: new THREE.Color(0x141414),
    shadowColor: new THREE.Color(0x050505),
    bands: 3.0,
    specIntensity: 0.5, specShininess: 24.0, specThreshold: 0.7,
    type: 2, isFur: false,
  },
  fur: {
    baseColor: new THREE.Color(0xc8b896),
    shadowColor: new THREE.Color(0x4a4030),
    bands: 3.0,
    specIntensity: 0.1, specShininess: 8.0, specThreshold: 0.9,
    type: 3, isFur: true,
    shellCount: 14,
    shellSpacing: 0.014,
  },
};

// ----------------------------------------------------------------
// Material factory
// ----------------------------------------------------------------
export function createShaderMaterial(presetKey, overrides = {}) {
  const preset = MATERIAL_PRESETS[presetKey];
  if (!preset) throw new Error(`Unknown material preset: ${presetKey}`);

  const params = { ...preset, ...overrides };

  return new THREE.ShaderMaterial({
    vertexShader: VERT_SHADER,
    fragmentShader: FRAG_SHADER,
    uniforms: {
      uBaseColor:     { value: params.baseColor.clone() },
      uShadowColor:   { value: params.shadowColor.clone() },
      uLightDir:      { value: LIGHT_DIR.clone() },
      uBands:         { value: params.bands },
      uSpecIntensity: { value: params.specIntensity },
      uSpecShininess: { value: params.specShininess },
      uSpecThreshold: { value: params.specThreshold },
      uMaterialType:  { value: params.type },
      uShellIndex:    { value: 0 },
      uShellCount:    { value: 1 },
    },
  });
}

// ----------------------------------------------------------------
// Outline factory (Inverted Hull)
// ----------------------------------------------------------------
// Creates a duplicate mesh rendered BackSide, vertices pushed along
// normals, flat black. Renders BEFORE the main mesh (lower renderOrder).
//
// Usage:
//   const outline = addOutline(myMesh, 0.025);
//   // outline is automatically added as sibling of myMesh
// ----------------------------------------------------------------
export function createOutline(geometry, thickness = 0.025, color = 0x000000) {
  const outlineMat = new THREE.ShaderMaterial({
    vertexShader: OUTLINE_VERT_SHADER,
    fragmentShader: OUTLINE_FRAG_SHADER,
    uniforms: {
      uOutlineThickness: { value: thickness },
      uOutlineColor: { value: new THREE.Color(color) },
    },
    side: THREE.BackSide,
    depthWrite: true,
  });
  const outline = new THREE.Mesh(geometry, outlineMat);
  outline.renderOrder = -1;
  return outline;
}

// ----------------------------------------------------------------
// Helper: puffy displacement on a geometry
// ----------------------------------------------------------------
export function applyPuffy(geo, amount, freq) {
  geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    const ns =
      Math.sin(v.x * freq) * Math.cos(v.y * freq * 1.3 + v.z * 0.5) * 0.5 +
      Math.sin(v.z * freq * 0.8 + v.y * freq * 0.5) * 0.5;
    v.addScaledVector(n, ns * amount);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

// ----------------------------------------------------------------
// Helper: build Fur Shells from a base mesh + geometry
// ----------------------------------------------------------------
// Returns a Group containing the original mesh (shell 0, opaque) + N-1
// transparent shells. Each shell shares the geometry but has its own
// material with uShellOffset = i * spacing.
// ----------------------------------------------------------------
export function buildFurShells(geometry, baseTransform, presetKey = 'fur') {
  const preset = MATERIAL_PRESETS[presetKey];
  const shellCount = preset.shellCount;
  const spacing = preset.shellSpacing;

  const group = new THREE.Group();

  // Shell 0: opaque undercoat
  const mat0 = new THREE.ShaderMaterial({
    vertexShader: VERT_SHADER,
    fragmentShader: FRAG_SHADER,
    uniforms: {
      uBaseColor:     { value: preset.baseColor.clone() },
      uShadowColor:   { value: preset.shadowColor.clone() },
      uLightDir:      { value: LIGHT_DIR.clone() },
      uBands:         { value: preset.bands },
      uSpecIntensity: { value: preset.specIntensity },
      uSpecShininess: { value: preset.specShininess },
      uSpecThreshold: { value: preset.specThreshold },
      uMaterialType:  { value: 3 },
      uShellIndex:    { value: 0 },
      uShellCount:    { value: shellCount },
    },
  });
  const shell0 = new THREE.Mesh(geometry, mat0);
  shell0.renderOrder = 0;
  group.add(shell0);

  // Shells 1..N-1: transparent, displaced
  for (let i = 1; i < shellCount; i++) {
    const mat = new THREE.ShaderMaterial({
      vertexShader: FUR_VERT_SHADER,
      fragmentShader: FRAG_SHADER,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uBaseColor:     { value: preset.baseColor.clone() },
        uShadowColor:   { value: preset.shadowColor.clone() },
        uLightDir:      { value: LIGHT_DIR.clone() },
        uBands:         { value: preset.bands },
        uSpecIntensity: { value: preset.specIntensity },
        uSpecShininess: { value: preset.specShininess },
        uSpecThreshold: { value: preset.specThreshold },
        uMaterialType:  { value: 3 },
        uShellIndex:    { value: i },
        uShellCount:    { value: shellCount },
        uShellOffset:   { value: i * spacing },
      },
    });
    const shell = new THREE.Mesh(geometry, mat);
    shell.renderOrder = i;
    group.add(shell);
  }

  return group;
}
