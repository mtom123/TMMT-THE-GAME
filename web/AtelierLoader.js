// ================================================================
// ATELIER SFERICO — TMMT Lookbook 3D
// Phase 2: Production Loader for real Blender GLB assets
// ================================================================
//
// USAGE
// -----
// import { AtelierLoader, MATERIAL_PRESETS } from './AtelierLoader.js';
//
// const loader = new AtelierLoader({
//   renderer,                    // THREE.WebGLRenderer (required by KTX2)
//   scene,                       // THREE.Scene
//   lightDir: keyLight.position.clone().normalize(),
// });
//
// await loader.loadLook({
//   glbPath: '/assets/looks/look-03-bulk-shirt.glb',   // ← TEAM: set GLB path here
//   position: new THREE.Vector3(0, 0, 0),              // optional
//   scale: 1.0,                                         // optional
// });
//
//
// MESH NAMING CONVENTION (must be enforced in Blender Outliner)
// -------------------------------------------------------------
// Every exportable mesh MUST be named with the prefix below.
// The loader matches the prefix and swaps in the matching shader.
//
//   mesh_denim_*    →  Washed denim shader (weave + hand-bleaching)
//   mesh_nylon_*    →  Padded nylon shader (Blinn-Phong tight specular)
//   mesh_laser_*    →  Laser-engraved cotton shader (normal perturbation)
//   mesh_fur_*      →  Eco-fur via Fur Shells (16 concentric layers)
//   mesh_skin_*     →  Mannequin body (kept as PBR from Blender, no swap)
//   mesh_other_*    →  Accessories, zippers, etc. (kept as PBR)
//
// Example Outliner for Look 03 (Bulk Shirt):
//   ├── mesh_skin_mannequin
//   ├── mesh_denim_bulk_shirt_body
//   ├── mesh_denim_bulk_shirt_sleeve_L
//   └── mesh_denim_bulk_shirt_sleeve_R
//
// Example Outliner for Look 09 (Bigfoot Fur Coat):
//   ├── mesh_skin_mannequin
//   └── mesh_fur_bigfoot_coat        ← single mesh, Fur Shells factory
//                                       will clone it 15 times.
//                                       MUST be exported with smooth
//                                       shading (shade smooth) and clean
//                                       normals for the displacement to
//                                       read correctly.
//
//
// ASSET PIPELINE NOTES (for the technical art team)
// -------------------------------------------------
// - Export from Blender as .glb (GLTF 2.0 binary)
// - In Blender export settings:
//     ✓ Apply Modifiers
//     ✓ UVs
//     ✓ Normals
//     ✓ Tangents
//     ✓ Compression (EXT_meshopt_compression) — set to "Optimize"
// - Textures: encode as KTX2 with `toktx` or `gltf-transform`:
//     gltf-transform in input.glb output.glb \
//       --texture-compress ktx2 \
//       --meshopt
// - Target size per look: < 2 MB (geometry + textures combined)
// ================================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// ----------------------------------------------------------------
// SHADERS — same as validated spike, factored as constants
// ----------------------------------------------------------------

const VERT_SHADER = /* glsl */ `
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

const FUR_VERT_SHADER = /* glsl */ `
  uniform float uShellOffset;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // Displace along the mesh normal in OBJECT space, then transform.
    // This keeps shells perfectly concentric to the original surface
    // regardless of the mesh's world transform.
    vec3 displaced = position + normal * uShellOffset;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const FRAG_SHADER = /* glsl */ `
  precision highp float;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  uniform vec3  uBaseColor;
  uniform vec3  uLightDir;
  uniform float uBands;
  uniform float uSoftness;
  uniform float uSpecIntensity;
  uniform float uSpecShininess;
  uniform float uSpecThreshold;
  uniform float uTime;
  uniform int   uMaterialType;     // 0 nylon, 1 denim, 2 laser, 3 fur
  uniform float uShellIndex;       // fur only
  uniform float uShellCount;       // fur only

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

  float celShade(float NdotL, float bands, float softness) {
    float shade = NdotL * 0.5 + 0.5;
    float bw = 1.0 / bands;
    float band = floor(shade * bands) / bands;
    float next = min(band + bw, 1.0);
    float t = (shade - band) / bw;
    return mix(band, next, smoothstep(1.0 - softness, 1.0, t));
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightDir);
    float NdotL = dot(N, L);
    float cel = celShade(NdotL, uBands, uSoftness);
    vec3 color = uBaseColor * cel;
    float alpha = 1.0;
    vec3 V = normalize(cameraPosition - vWorldPos);

    if (uMaterialType == 0) {
      // NYLON PADDED — tight Blinn-Phong specular
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(N, H), 0.0), uSpecShininess);
      spec = smoothstep(uSpecThreshold, uSpecThreshold + 0.05, spec);
      color += vec3(spec) * uSpecIntensity;
      float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
      color += vec3(0.06, 0.08, 0.12) * rim;

    } else if (uMaterialType == 1) {
      // WASHED DENIM — weave + organic hand-bleaching
      float weave = sin(vUv.y * 240.0) * 0.5 + 0.5;
      weave = mix(0.91, 1.0, weave);
      float fabNoise = fbm(vUv * 8.0);
      fabNoise = mix(0.7, 1.1, fabNoise);
      float bleach = fbm(vUv * 3.0);
      bleach = smoothstep(0.45, 0.7, bleach);
      vec3 bleached = mix(uBaseColor, uBaseColor * 1.7 + vec3(0.05, 0.06, 0.08), 0.6);
      vec3 base = mix(uBaseColor, bleached, bleach) * weave * fabNoise;
      color = base * cel;
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(N, H), 0.0), uSpecShininess);
      color += vec3(spec) * uSpecIntensity * 0.3;

    } else if (uMaterialType == 2) {
      // LASER ENGRAVED — high-frequency normal perturbation
      float engrave = fbm(vUv * 40.0);
      float mask = smoothstep(0.48, 0.52, engrave);
      vec3 fakeN = N;
      float p = (engrave - 0.5) * 0.6;
      fakeN.xy += vec2(p, -p * 0.7);
      fakeN = normalize(fakeN);
      float engravedCel = celShade(dot(fakeN, L), uBands, uSoftness * 0.5);
      vec3 lightC = uBaseColor * cel;
      vec3 darkC = uBaseColor * engravedCel * 0.35;
      color = mix(lightC, darkC, mask);
      float edge = smoothstep(0.45, 0.5, engrave) * (1.0 - smoothstep(0.5, 0.55, engrave));
      color += vec3(0.08, 0.08, 0.1) * edge;

    } else if (uMaterialType == 3) {
      // ECO-FUR (Fur Shells) — alpha noise, lighter tips on outer shells
      float strandN = fbm(vUv * 70.0 + uShellIndex * 0.6);
      float strands = smoothstep(0.32, 0.65, strandN);
      float shellProg = uShellIndex / uShellCount;
      float shellFade = 1.0 - shellProg * 0.85;
      alpha = strands * shellFade;
      vec3 innerC = uBaseColor * 0.72;
      vec3 outerC = uBaseColor * 1.28;
      vec3 furC = mix(innerC, outerC, shellProg);
      furC *= mix(0.82, 1.18, strandN);
      color = furC * cel;
    }

    // Soft desaturation in shadows — "technical sketch" look
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(lum), color, 0.92);
    color = pow(color, vec3(1.0 / 2.2));
    gl_FragColor = vec4(color, alpha);
  }
`;

// ----------------------------------------------------------------
// MATERIAL PRESETS — edit colors/thresholds here, no logic changes
// ----------------------------------------------------------------
// team can extend this object freely. Keys MUST match the naming
// convention prefix (e.g. 'denim' matches 'mesh_denim_*').
// ----------------------------------------------------------------

export const MATERIAL_PRESETS = {
  denim: {
    baseColor: new THREE.Color(0x2a3d5e),
    bands: 4.0, softness: 0.55,
    specIntensity: 0.3, specShininess: 12.0, specThreshold: 0.8,
    type: 1, isFur: false,
  },
  nylon: {
    baseColor: new THREE.Color(0x1c1c1c),
    bands: 3.0, softness: 0.22,
    specIntensity: 1.5, specShininess: 80.0, specThreshold: 0.6,
    type: 0, isFur: false,
  },
  nylonLight: {
    baseColor: new THREE.Color(0x2a2a2a),
    bands: 3.0, softness: 0.22,
    specIntensity: 1.4, specShininess: 70.0, specThreshold: 0.6,
    type: 0, isFur: false,
  },
  laser: {
    baseColor: new THREE.Color(0x0e0e0e),
    bands: 3.0, softness: 0.2,
    specIntensity: 0.4, specShininess: 24.0, specThreshold: 0.7,
    type: 2, isFur: false,
  },
  fur: {
    baseColor: new THREE.Color(0xc8b896),
    bands: 3.0, softness: 0.4,
    specIntensity: 0.1, specShininess: 8.0, specThreshold: 0.9,
    type: 3, isFur: true,
    shellCount: 16,        // number of concentric layers
    shellSpacing: 0.013,   // world units between shells — tune with fur length
  },
};

// Mesh name prefixes that should NOT be material-swapped
const SKIP_PREFIXES = ['mesh_skin_', 'mesh_other_'];

// ----------------------------------------------------------------
// ATELIER LOADER
// ----------------------------------------------------------------

export class AtelierLoader {
  /**
   * @param {Object} opts
   * @param {THREE.WebGLRenderer} opts.renderer  — required for KTX2 GPU support detection
   * @param {THREE.Scene}         opts.scene
   * @param {THREE.Vector3}       opts.lightDir  — world-space key light direction (normalized)
   * @param {Object<string, Object>} [opts.presets] — optional override of MATERIAL_PRESETS
   */
  constructor({ renderer, scene, lightDir, presets }) {
    if (!renderer) throw new Error('AtelierLoader: renderer is required');
    if (!scene)    throw new Error('AtelierLoader: scene is required');
    if (!lightDir) throw new Error('AtelierLoader: lightDir is required');

    this.renderer = renderer;
    this.scene = scene;
    this.lightDir = lightDir.clone().normalize();
    this.presets = presets || MATERIAL_PRESETS;

    // Registry of currently loaded look root (for cleanup / replacement)
    this._currentLookRoot = null;

    this._initLoaders();
  }

  // --------------------------------------------------------------
  // Loader wiring: GLTF + KTX2 (Basis Universal) + Meshopt
  // --------------------------------------------------------------
  _initLoaders() {
    this.gltfLoader = new GLTFLoader();

    // KTX2: GPU-decoded supercompressed textures. MUST call detectSupport.
    this.ktx2Loader = new KTX2Loader()
      .setTranscoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/basis/')
      .detectSupport(this.renderer);
    this.gltfLoader.setKTX2Loader(this.ktx2Loader);

    // Meshopt: geometry compression via EXT_meshopt_compression.
    // Handles vertex positions, normals, uvs, indices, morph targets.
    this.gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  }

  // --------------------------------------------------------------
  // PUBLIC: load a single look GLB
  // --------------------------------------------------------------
  /**
   * @param {Object} opts
   * @param {string} opts.glbPath             — path to .glb file   ← TEAM: set this
   * @param {THREE.Vector3} [opts.position]   — world placement
   * @param {number} [opts.scale]             — uniform scale (default 1.0)
   * @param {() => void} [opts.onLoad]        — called when look is in scene
   * @param {(ratio: number) => void} [opts.onProgress]
   * @returns {Promise<THREE.Group>}          — resolves with the look root group
   */
  async loadLook({ glbPath, position, scale = 1.0, onLoad, onProgress }) {
    if (!glbPath) throw new Error('AtelierLoader.loadLook: glbPath is required');

    // Cleanup previous look if any
    this.disposeCurrentLook();

    const gltf = await new Promise((resolve, reject) => {
      this.gltfLoader.load(
        glbPath,
        resolve,
        (ev) => onProgress?.(ev.loaded / ev.total),
        reject,
      );
    });

    const root = gltf.scene;
    root.scale.setScalar(scale);
    if (position) root.position.copy(position);

    // Traverse + swap materials
    this._parseScene(root);

    this.scene.add(root);
    this._currentLookRoot = root;

    // Hold GLTF data for proper disposal later
    this._currentGltf = gltf;

    onLoad?.();
    return root;
  }

  // --------------------------------------------------------------
  // SCENE PARSER — walks the GLB tree and swaps materials
  // --------------------------------------------------------------
  _parseScene(root) {
    root.traverse((obj) => {
      if (!obj.isMesh) return;

      const name = obj.name || '';

      // Skip mannequin / accessories — keep Blender PBR
      if (SKIP_PREFIXES.some(p => name.startsWith(p))) return;

      // Determine material type from mesh name prefix
      const matKey = this._matchMaterialKey(name);
      if (!matKey) {
        console.warn(`[AtelierLoader] Mesh "${name}" did not match any preset prefix. Keeping original PBR material.`);
        return;
      }

      const preset = this.presets[matKey];
      if (!preset) {
        console.warn(`[AtelierLoader] No preset found for key "${matKey}". Skipping mesh "${name}".`);
        return;
      }

      // Preserve original world transform: bake parent matrix into the mesh
      // so material/shader works in correct space.
      obj.updateMatrixWorld(true);

      if (preset.isFur) {
        this._buildFurShells(obj, preset);
      } else {
        this._swapToShaderMaterial(obj, preset);
      }
    });
  }

  // --------------------------------------------------------------
  // Match mesh name → preset key
  // Convention: mesh_{key}_{rest}  →  returns 'key' if it matches a preset
  // --------------------------------------------------------------
  _matchMaterialKey(meshName) {
    // Expect prefix like "mesh_denim_bulk_shirt_body" → key = 'denim'
    const m = meshName.match(/^mesh_([a-zA-Z0-9]+)_/);
    if (!m) return null;
    const key = m[1];
    // Allow alias keys (e.g. mesh_nylonLight_* matches 'nylonLight')
    return this.presets[key] ? key : null;
  }

  // --------------------------------------------------------------
  // MATERIAL SWAP — replace Blender PBR with our custom ShaderMaterial
  // --------------------------------------------------------------
  _swapToShaderMaterial(mesh, preset) {
    // Dispose original materials (could be array or single)
    const original = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    original.forEach(m => m?.dispose?.());

    mesh.material = this._createShaderMaterial(preset);
    // Ensure smooth shading — cel-shading needs averaged normals
    if (mesh.geometry && !mesh.geometry.attributes.normal) {
      mesh.geometry.computeVertexNormals();
    }
  }

  _createShaderMaterial(preset) {
    return new THREE.ShaderMaterial({
      vertexShader: VERT_SHADER,
      fragmentShader: FRAG_SHADER,
      uniforms: {
        uBaseColor:     { value: preset.baseColor.clone() },
        uLightDir:      { value: this.lightDir.clone() },
        uBands:         { value: preset.bands },
        uSoftness:      { value: preset.softness },
        uSpecIntensity: { value: preset.specIntensity },
        uSpecShininess: { value: preset.specShininess },
        uSpecThreshold: { value: preset.specThreshold },
        uTime:          { value: 0 },
        uMaterialType:  { value: preset.type },
        uShellIndex:    { value: 0 },
        uShellCount:    { value: 1 },
      },
    });
  }

  // --------------------------------------------------------------
  // FUR SHELLS FACTORY
  // --------------------------------------------------------------
  // Takes the original mesh from Blender (with smooth normals),
  // keeps it as shell 0 (undercoat, opaque), and clones it N-1
  // times. Each clone uses the FUR_VERT_SHADER which displaces
  // vertices along normals by uShellOffset. Render order = shell
  // index. Outer shells: sparser alpha, lighter color (tips).
  // --------------------------------------------------------------
  _buildFurShells(mesh, preset) {
    const shellCount = preset.shellCount || 16;
    const spacing = preset.shellSpacing || 0.013;

    // Dispose any original PBR material on the source mesh
    const original = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    original.forEach(m => m?.dispose?.());

    // Shell 0: the original mesh becomes the undercoat (opaque)
    mesh.material = this._createFurShellMaterial(preset, 0, shellCount, 0);
    mesh.renderOrder = 0;

    // Clone mesh N-1 times. We share the geometry (memory-efficient)
    // but each clone has its own material with its own uShellOffset.
    const parent = mesh.parent;
    for (let i = 1; i < shellCount; i++) {
      const shell = new THREE.Mesh(mesh.geometry, null);
      shell.name = `${mesh.name}_shell_${i}`;
      shell.position.copy(mesh.position);
      shell.rotation.copy(mesh.rotation);
      shell.scale.copy(mesh.scale);
      shell.matrix.copy(mesh.matrix);
      shell.matrixAutoUpdate = false;  // we baked the transform manually

      shell.material = this._createFurShellMaterial(preset, i, shellCount, i * spacing);
      shell.renderOrder = i;
      // Transparent shells must not write depth (would block inner shells)
      shell.material.transparent = true;
      shell.material.depthWrite = false;

      parent.add(shell);

      // Track for disposal
      this._furShells = this._furShells || [];
      this._furShells.push(shell);
    }
  }

  _createFurShellMaterial(preset, shellIndex, shellCount, shellOffset) {
    return new THREE.ShaderMaterial({
      vertexShader: FUR_VERT_SHADER,
      fragmentShader: FRAG_SHADER,
      uniforms: {
        uBaseColor:     { value: preset.baseColor.clone() },
        uLightDir:      { value: this.lightDir.clone() },
        uBands:         { value: preset.bands },
        uSoftness:      { value: preset.softness },
        uSpecIntensity: { value: preset.specIntensity },
        uSpecShininess: { value: preset.specShininess },
        uSpecThreshold: { value: preset.specThreshold },
        uTime:          { value: 0 },
        uMaterialType:  { value: 3 },
        uShellIndex:    { value: shellIndex },
        uShellCount:    { value: shellCount },
        uShellOffset:   { value: shellOffset },
      },
    });
  }

  // --------------------------------------------------------------
  // Update light direction (e.g. if lighting rig changes at runtime)
  // --------------------------------------------------------------
  setLightDir(dir) {
    this.lightDir.copy(dir).normalize();
    if (!this._currentLookRoot) return;
    this._currentLookRoot.traverse((obj) => {
      if (!obj.isMesh) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach(m => {
        if (m?.uniforms?.uLightDir) m.uniforms.uLightDir.value.copy(this.lightDir);
      });
    });
  }

  // --------------------------------------------------------------
  // Per-frame tick — update time uniform if any shader animates
  // --------------------------------------------------------------
  update(time) {
    if (!this._currentLookRoot) return;
    this._currentLookRoot.traverse((obj) => {
      if (!obj.isMesh) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach(m => {
        if (m?.uniforms?.uTime) m.uniforms.uTime.value = time;
      });
    });
  }

  // --------------------------------------------------------------
  // Cleanup — remove current look from scene + dispose everything
  // --------------------------------------------------------------
  disposeCurrentLook() {
    if (this._furShells) {
      this._furShells.forEach(s => {
        s.parent?.remove(s);
        // Note: geometry is shared with original mesh — don't dispose here
        s.material?.dispose();
      });
      this._furShells = null;
    }

    if (this._currentLookRoot) {
      this._currentLookRoot.traverse((obj) => {
        if (!obj.isMesh) return;
        // Dispose materials created by us
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => m?.dispose?.());
        // Dispose geometry from the GLB
        obj.geometry?.dispose?.();
      });
      this.scene.remove(this._currentLookRoot);
      this._currentLookRoot = null;
    }
  }

  // Full teardown (when leaving the experience)
  dispose() {
    this.disposeCurrentLook();
    this.ktx2Loader?.dispose?.();
    this.gltfLoader = null;
  }
}
