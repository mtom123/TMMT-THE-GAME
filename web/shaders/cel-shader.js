// ================================================================
// TMMT — Custom Cel-Shaded Shader for Three.js
// ================================================================
// Applica cel-shading (3 bande discrete) alla mesh 3D
// Outline nero opzionale via Inverted Hull
// Colori vibranti saturi
// ================================================================

const CEL_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;
  
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const CEL_FRAG = /* glsl */ `
  precision highp float;
  
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;
  
  uniform vec3 uBaseColor;
  uniform vec3 uShadowColor;
  uniform vec3 uLightDir;
  uniform float uBands;
  uniform float uSpecIntensity;
  uniform float uSpecShininess;
  uniform float uSpecThreshold;
  uniform float uRimIntensity;
  
  void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightDir);
    vec3 V = normalize(vViewDir);
    
    float NdotL = dot(N, L);
    float shade = NdotL * 0.5 + 0.5;
    float band = floor(shade * uBands) / uBands;
    band = clamp(band, 0.0, 1.0);
    
    vec3 color = mix(uShadowColor, uBaseColor, band);
    
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), uSpecShininess);
    spec = step(uSpecThreshold, spec);
    color += vec3(spec) * uSpecIntensity;
    
    float rim = 1.0 - max(dot(N, V), 0.0);
    rim = pow(rim, 3.0);
    color += vec3(0.3, 0.4, 0.6) * rim * uRimIntensity;
    
    color = pow(color, vec3(1.0 / 2.2));
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

const OUTLINE_VERT = /* glsl */ `
  uniform float uOutlineThickness;
  
  void main() {
    vec3 displaced = position + normal * uOutlineThickness;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const OUTLINE_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uOutlineColor;
  
  void main() {
    gl_FragColor = vec4(uOutlineColor, 1.0);
  }
`;

function createCelMaterial(options = {}) {
  const defaults = {
    baseColor: 0xe8e0d0,
    shadowColor: 0x2a2620,
    lightDir: new THREE.Vector3(4, 6, 3).normalize(),
    bands: 3.0,
    specIntensity: 0.8,
    specShininess: 32.0,
    specThreshold: 0.7,
    rimIntensity: 0.4,
  };
  const params = { ...defaults, ...options };
  
  return new THREE.ShaderMaterial({
    vertexShader: CEL_VERT,
    fragmentShader: CEL_FRAG,
    uniforms: {
      uBaseColor:     { value: new THREE.Color(params.baseColor) },
      uShadowColor:   { value: new THREE.Color(params.shadowColor) },
      uLightDir:      { value: params.lightDir.clone() },
      uBands:         { value: params.bands },
      uSpecIntensity: { value: params.specIntensity },
      uSpecShininess: { value: params.specShininess },
      uSpecThreshold: { value: params.specThreshold },
      uRimIntensity:  { value: params.rimIntensity },
    },
  });
}

function createOutlineMesh(geometry, thickness = 0.015, color = 0x000000) {
  const outlineMat = new THREE.ShaderMaterial({
    vertexShader: OUTLINE_VERT,
    fragmentShader: OUTLINE_FRAG,
    uniforms: {
      uOutlineThickness: { value: thickness },
      uOutlineColor: { value: new THREE.Color(color) },
    },
    side: THREE.BackSide,
    depthWrite: true,
  });
  return new THREE.Mesh(geometry, outlineMat);
}

const CEL_PRESETS = {
  clay: {
    baseColor: 0xe8e0d0, shadowColor: 0x2a2620,
    bands: 3.0, specIntensity: 0.6, rimIntensity: 0.3,
  },
  warm: {
    baseColor: 0xc8a878, shadowColor: 0x4a3020,
    bands: 3.0, specIntensity: 1.2, specShininess: 48.0, specThreshold: 0.6, rimIntensity: 0.5,
  },
  cool: {
    baseColor: 0x8a9ab0, shadowColor: 0x202830,
    bands: 3.0, specIntensity: 1.5, specShininess: 80.0, specThreshold: 0.55, rimIntensity: 0.4,
  },
  dramatic: {
    baseColor: 0xf5e8d0, shadowColor: 0x100a05,
    bands: 2.0, specIntensity: 1.0, rimIntensity: 0.7,
  },
  tmmt: {
    baseColor: 0xc8b896, shadowColor: 0x3a2a18,
    bands: 3.0, specIntensity: 0.8, specShininess: 40.0, specThreshold: 0.65, rimIntensity: 0.45,
  },
};

window.__TMMT_CEL = {
  CEL_VERT, CEL_FRAG, OUTLINE_VERT, OUTLINE_FRAG,
  createCelMaterial, createOutlineMesh, CEL_PRESETS,
};
