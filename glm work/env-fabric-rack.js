// ================================================================
// ENVIRONMENT MODULE — Fabric Rolls Shelf + Garment Rack
// TMMT 2025-26 Atelier Sferico / Messenger (Abeto) cel-shading
// ================================================================
//
// TWO distinct installations in one module:
//
//   A. Fabric rolls shelf — vertical shelving unit (1.2 × 2.4 × 0.85)
//      with 4 black-metal posts, 3 horizontal shelves, 6 horizontal
//      fabric rolls (2 per shelf, varied colorways), and a loose
//      cream fabric draped over the top edge.
//
//   B. Garment rack with hanging clothes — horizontal rail on
//      wheeled feet, 6 stylized garments on wooden hangers, and
//      an open cardboard box of fabric scraps on the floor beside
//      the rack.
//
// Every visible mesh has an Inverted Hull outline sibling.
//
// Local layout (before group rotation):
//   - fabricShelf group occupies local space centered at origin
//     (posts at x=±0.6, z=±0.4, posts from y=0 to y=2.4).
//   - garmentRack group occupies local space centered at origin
//     (rail from x=-0.8 to x=+0.8 at y=1.7).
//
// Placement (applied at the end of createFabricRack()):
//   - fabricShelf → world (-3, 0, -3.5), rotation.y = +π·0.15
//   - garmentRack → world (+3, 0, -3.5), rotation.y = -π·0.15
//   Both end up along the back wall, splayed outward ~27° so they
//   frame the mannequin at origin without facing it dead-on.
//
// Exports: createFabricRack() → THREE.Group
// ================================================================

import * as THREE from 'three';
import { createShaderMaterial, createOutline, applyPuffy } from './atelier-core.js';

export function createFabricRack() {
  const group = new THREE.Group();
  group.name = 'fabric-rack-area';

  // ============================================================
  // Materials (shared instances — one uniform set per colorway)
  // ============================================================

  // Black metal — shelving frame, rack rail/posts/feet, garment 2 body
  const blackMat = createShaderMaterial('nylon', {
    baseColor: new THREE.Color(0x101010),
  });
  // Silver — wheels + (optional) metal hangers
  const silverMat = createShaderMaterial('nylon', {
    baseColor:     new THREE.Color(0x808080),
    specIntensity: 1.5,
    specShininess: 60,
  });
  // Wood — hangers (triangular coat-hanger bars)
  const woodMat = createShaderMaterial('nylon', {
    baseColor:     new THREE.Color(0x6b4a2c),
    shadowColor:   new THREE.Color(0x2a1a0c),
    specIntensity: 0.2,
  });

  // Fabric colorways (each roll + matching garment share uniforms)
  const creamWoolMat = createShaderMaterial('nylon', {
    baseColor:   new THREE.Color(0xe8d8b8),
    shadowColor: new THREE.Color(0x6a5a40),
  });
  const denimMat = createShaderMaterial('denim', {
    baseColor:   new THREE.Color(0x2a3a55),
    shadowColor: new THREE.Color(0x101825),
  });
  const tanCottonMat = createShaderMaterial('nylon', {
    baseColor:   new THREE.Color(0xb89868),
    shadowColor: new THREE.Color(0x4a3a20),
  });
  const oliveNylonMat = createShaderMaterial('nylon', {
    baseColor:   new THREE.Color(0x4a5028),
    shadowColor: new THREE.Color(0x1a2008),
  });
  const charcoalWoolMat = createShaderMaterial('nylon', {
    baseColor:   new THREE.Color(0x2a2828),
    shadowColor: new THREE.Color(0x0a0808),
  });
  const rustLinenMat = createShaderMaterial('nylon', {
    baseColor:   new THREE.Color(0x8b4828),
    shadowColor: new THREE.Color(0x2a1408),
  });

  // Cardboard — open box on the floor
  const cardboardMat = createShaderMaterial('nylon', {
    baseColor:     new THREE.Color(0xc8a878),
    shadowColor:   new THREE.Color(0x6a4828),
    specIntensity: 0.1,
  });

  // ============================================================
  // Helper: mesh + Inverted Hull outline as a sub-group so
  // transforms applied to the sub-group propagate to both.
  // ============================================================
  function makePart(geometry, position, rotation, mat, thickness = 0.014) {
    const sub = new THREE.Group();
    const mesh = new THREE.Mesh(geometry, mat);
    sub.add(mesh);
    sub.add(createOutline(geometry, thickness));
    sub.position.copy(position);
    if (rotation) sub.rotation.copy(rotation);
    return sub;
  }

  // Helper: tapered box geometry (narrower at top for garment shoulders)
  // Taper only the top-cap vertices (Y = +h/2) by `taperTop` factor in X.
  function makeTaperedBox(bottomW, h, d, taperTop = 0.75) {
    const geo = new THREE.BoxGeometry(bottomW, h, d);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) > 0) {
        pos.setX(i, pos.getX(i) * taperTop);
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }

  // ============================================================
  // A. FABRIC ROLLS SHELF
  //   4 posts (0.06 × 2.4 × 0.06) at (±0.6, ±0.4) — center y=1.2
  //   3 shelves (1.3 × 0.04 × 0.85) at y = 0.6 / 1.4 / 2.2
  //   6 rolls (cyl, axis along X) — 2 per shelf, separated in Z
  //   1 draped cream fabric over the top edge
  // ============================================================
  const fabricShelf = new THREE.Group();
  fabricShelf.name = 'fabric-shelf';

  // --- 1. Shelving frame: 4 vertical posts ---
  const postGeo = new THREE.BoxGeometry(0.06, 2.4, 0.06);
  const postPositions = [
    [ 0.6, 1.2,  0.4], // front-right
    [-0.6, 1.2,  0.4], // front-left
    [ 0.6, 1.2, -0.4], // back-right
    [-0.6, 1.2, -0.4], // back-left
  ];
  for (const [x, y, z] of postPositions) {
    fabricShelf.add(makePart(
      postGeo,
      new THREE.Vector3(x, y, z),
      null,
      blackMat,
      0.014,
    ));
  }

  // --- 2. 3 horizontal shelves ---
  // BoxGeometry(1.3 X × 0.04 Y × 0.85 Z). Each shelf top surface
  // is at center_y + 0.02 — used below to seat fabric rolls.
  const shelfGeo = new THREE.BoxGeometry(1.3, 0.04, 0.85);
  const shelfYs = [0.6, 1.4, 2.2];
  for (const sy of shelfYs) {
    fabricShelf.add(makePart(
      shelfGeo,
      new THREE.Vector3(0, sy, 0),
      null,
      blackMat,
      0.020, // large shelf → thicker outline per spec
    ));
  }

  // --- 3-8. Fabric rolls (6 rolls, 2 per shelf) ---
  // Cylinder axis default = Y; rotation.z = π/2 → axis along X.
  // Rolls sit on top of shelf surface (center_y + 0.02 + radius).
  // Two rolls per shelf separated in Z at z = ±0.22 (gap ~0.24
  // between roll surfaces for r ≈ 0.10). Each roll gets slight
  // puffy (0.005, freq 8) for fabric-surface texture per spec.
  const rollSpecs = [
    // [shelfIndex, zOffset, radius, length, material]
    [0, -0.22, 0.10, 0.75, creamWoolMat],   // 1 top-left  cream wool
    [0,  0.22, 0.12, 0.85, denimMat],       // 2 top-right dark denim
    [1, -0.22, 0.08, 0.70, tanCottonMat],   // 3 mid-left  tan cotton
    [1,  0.22, 0.11, 0.80, oliveNylonMat],  // 4 mid-right olive nylon
    [2, -0.22, 0.09, 0.72, charcoalWoolMat],// 5 bot-left  charcoal wool
    [2,  0.22, 0.12, 0.90, rustLinenMat],   // 6 bot-right rust linen
  ];
  for (const [shelfIdx, zOff, radius, length, mat] of rollSpecs) {
    const rollGeo = new THREE.CylinderGeometry(radius, radius, length, 24);
    applyPuffy(rollGeo, 0.005, 8.0);
    const shelfTopY = shelfYs[shelfIdx] + 0.02;
    fabricShelf.add(makePart(
      rollGeo,
      new THREE.Vector3(0, shelfTopY + radius, zOff),
      new THREE.Euler(0, 0, Math.PI / 2),
      mat,
      0.012,
    ));
  }

  // --- 9. Loose fabric draped over top edge ---
  // Heavy puffy (0.04, freq 6) box for draped/folded appearance.
  // Position: across the back top edge of the unit (z = -0.42,
  // just inside the back posts at z = -0.4). Center y = 2.30 puts
  // it half above (y > 2.22 top-shelf surface) and draping over
  // the back. Slight Euler tilt suggests gravity fold.
  const drapeGeo = new THREE.BoxGeometry(0.7, 0.5, 0.04, 4, 4, 1);
  applyPuffy(drapeGeo, 0.04, 6.0);
  fabricShelf.add(makePart(
    drapeGeo,
    new THREE.Vector3(0.2, 2.30, -0.42),
    new THREE.Euler(-0.15, 0, 0.05),
    creamWoolMat,
    0.014,
  ));

  // Position + rotate fabricShelf: back-left of room, splayed outward
  fabricShelf.position.set(-3, 0, -3.5);
  fabricShelf.rotation.y = Math.PI * 0.15;
  group.add(fabricShelf);

  // ============================================================
  // B. GARMENT RACK WITH HANGING CLOTHES
  //   Horizontal rail (cyl r=0.025, len 1.6) at y=1.7
  //   2 posts (0.04 × 1.7 × 0.04) at x=±0.8
  //   2 base feet (0.2 × 0.05 × 0.1) at x=±0.8
  //   4 small silver wheels under feet
  //   6 garments on wooden hangers, spaced every 0.27 along rail
  //   Open cardboard box with fabric scraps on the floor near rack
  // ============================================================
  const garmentRack = new THREE.Group();
  garmentRack.name = 'garment-rack';

  // --- 10. Rail frame — horizontal cylinder at y=1.7 ---
  // Default cyl axis = Y; rotation.z = π/2 → axis along X (rail
  // spans x = -0.8 to +0.8, ends meet the posts).
  const railGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.6, 16);
  garmentRack.add(makePart(
    railGeo,
    new THREE.Vector3(0, 1.7, 0),
    new THREE.Euler(0, 0, Math.PI / 2),
    blackMat,
    0.010, // thin part → thinner outline per spec
  ));

  // --- 11. 2 vertical posts supporting rail at ends ---
  // Box(0.04 × 1.7 × 0.04), center y=0.85, top at y=1.7 (rail height).
  const rackPostGeo = new THREE.BoxGeometry(0.04, 1.7, 0.04);
  for (const x of [-0.8, 0.8]) {
    garmentRack.add(makePart(
      rackPostGeo,
      new THREE.Vector3(x, 0.85, 0),
      null,
      blackMat,
      0.010,
    ));
  }

  // --- 12. 2 base feet — flattened boxes for stability ---
  // Box(0.2 X × 0.05 Y × 0.1 Z), bottom at y=0 (on floor).
  const footGeo = new THREE.BoxGeometry(0.2, 0.05, 0.1);
  for (const x of [-0.8, 0.8]) {
    garmentRack.add(makePart(
      footGeo,
      new THREE.Vector3(x, 0.025, 0),
      null,
      blackMat,
      0.014,
    ));
  }

  // --- 13. 4 small silver wheels under feet ---
  // Cyl r=0.04, h=0.02; rotation.x = π/2 → axis along Z (thin disc
  // facing front/back, ready to roll along X). Center y=0.04 →
  // bottom kisses floor. Positioned at z=±0.07 (just outside foot
  // z-range of ±0.05) so wheels are visible from the side.
  const wheelGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16);
  const wheelPositions = [
    [ 0.8, 0.04,  0.07],
    [ 0.8, 0.04, -0.07],
    [-0.8, 0.04,  0.07],
    [-0.8, 0.04, -0.07],
  ];
  for (const [x, y, z] of wheelPositions) {
    garmentRack.add(makePart(
      wheelGeo,
      new THREE.Vector3(x, y, z),
      new THREE.Euler(Math.PI / 2, 0, 0),
      silverMat,
      0.010,
    ));
  }

  // --- 14-19. 6 hanging garments on wooden hangers ---
  // Spaced every 0.27 along rail; centered so total span 1.35 fits
  // inside rail length 1.6 (x = ±0.135, ±0.405, ±0.675).
  //
  // Each garment = hanger (3 thin boxes) + tapered body:
  //   Hanger triangle: apex at (gx, 1.70, 0) on rail,
  //                    shoulders at (gx ± 0.18, 1.55, 0).
  //   Left/right shoulder: thin box length √(0.18² + 0.15²) ≈ 0.2343,
  //     rotated ±atan2(0.18, 0.15) ≈ ±0.876 rad around Z.
  //   Crossbar: thin box 0.36 wide at y=1.55.
  //   Body: tapered box 0.4 × 0.7 × 0.05 with shoulders tapered to
  //     75% width at top. Top at y=1.55 (matches crossbar),
  //     bottom (hem) at y=0.85. Slight puffy (0.005, freq 8).
  const garmentMats = [
    denimMat,        // 1 dark denim
    blackMat,        // 2 black nylon
    creamWoolMat,    // 3 cream linen
    oliveNylonMat,   // 4 olive
    rustLinenMat,    // 5 rust
    charcoalWoolMat, // 6 charcoal
  ];
  const garmentXs = [-0.675, -0.405, -0.135, 0.135, 0.405, 0.675];

  // Shared hanger geometry (all 6 hangers identical)
  const shoulderLen = Math.sqrt(0.18 * 0.18 + 0.15 * 0.15); // ≈ 0.2343
  const shoulderAngle = Math.atan2(0.18, 0.15);             // ≈ 0.876 rad
  const shoulderGeo = new THREE.BoxGeometry(shoulderLen, 0.008, 0.04);
  const crossbarGeo = new THREE.BoxGeometry(0.36, 0.008, 0.04);

  // Shared garment body geometry (tapered + slight puffy)
  const bodyGeo = makeTaperedBox(0.4, 0.7, 0.05, 0.75);
  applyPuffy(bodyGeo, 0.005, 8.0);

  for (let i = 0; i < 6; i++) {
    const gx = garmentXs[i];
    const mat = garmentMats[i];

    // Left shoulder: midpoint (gx - 0.09, 1.625, 0), rotation.z = +angle
    garmentRack.add(makePart(
      shoulderGeo,
      new THREE.Vector3(gx - 0.09, 1.625, 0),
      new THREE.Euler(0, 0,  shoulderAngle),
      woodMat,
      0.010,
    ));
    // Right shoulder: midpoint (gx + 0.09, 1.625, 0), rotation.z = -angle
    garmentRack.add(makePart(
      shoulderGeo,
      new THREE.Vector3(gx + 0.09, 1.625, 0),
      new THREE.Euler(0, 0, -shoulderAngle),
      woodMat,
      0.010,
    ));
    // Crossbar at shoulder height (y=1.55)
    garmentRack.add(makePart(
      crossbarGeo,
      new THREE.Vector3(gx, 1.55, 0),
      null,
      woodMat,
      0.010,
    ));
    // Garment body — tapered box centered at y=1.20 (top y=1.55, hem y=0.85)
    garmentRack.add(makePart(
      bodyGeo,
      new THREE.Vector3(gx, 1.20, 0),
      null,
      mat,
      0.012,
    ));
  }

  // --- 20. Open cardboard box with fabric scraps on the floor ---
  // Sub-group positioned at (0.7, 0, 0.55) — beside the rack base,
  // offset in +Z so it doesn't collide with the right foot at
  // (0.8, 0.025, 0). Box: 0.4 X × 0.3 Z footprint, 0.3 tall.
  // 5 sides: bottom + 4 walls (no top → open).
  const cardboardBox = new THREE.Group();
  cardboardBox.name = 'cardboard-box';

  // Bottom: 0.4 × 0.02 × 0.3 at y=0.01 (bottom face on floor at y=0)
  cardboardBox.add(makePart(
    new THREE.BoxGeometry(0.4, 0.02, 0.3),
    new THREE.Vector3(0, 0.01, 0),
    null,
    cardboardMat,
    0.012,
  ));
  // Front wall (-Z side): 0.4 × 0.3 × 0.02 at y=0.16, z=-0.14
  cardboardBox.add(makePart(
    new THREE.BoxGeometry(0.4, 0.3, 0.02),
    new THREE.Vector3(0, 0.16, -0.14),
    null,
    cardboardMat,
    0.012,
  ));
  // Back wall (+Z side): 0.4 × 0.3 × 0.02 at y=0.16, z=+0.14
  cardboardBox.add(makePart(
    new THREE.BoxGeometry(0.4, 0.3, 0.02),
    new THREE.Vector3(0, 0.16, 0.14),
    null,
    cardboardMat,
    0.012,
  ));
  // Left wall (-X side): 0.02 × 0.3 × 0.3 at y=0.16, x=-0.19
  cardboardBox.add(makePart(
    new THREE.BoxGeometry(0.02, 0.3, 0.3),
    new THREE.Vector3(-0.19, 0.16, 0),
    null,
    cardboardMat,
    0.012,
  ));
  // Right wall (+X side): 0.02 × 0.3 × 0.3 at y=0.16, x=+0.19
  cardboardBox.add(makePart(
    new THREE.BoxGeometry(0.02, 0.3, 0.3),
    new THREE.Vector3(0.19, 0.16, 0),
    null,
    cardboardMat,
    0.012,
  ));

  // Fabric scraps sticking out above the open top (top of walls at y=0.31)
  // Scrap 1: cream cylinder tilted, sticking out front-right
  const scrap1Geo = new THREE.CylinderGeometry(0.04, 0.04, 0.20, 12);
  applyPuffy(scrap1Geo, 0.01, 8.0);
  cardboardBox.add(makePart(
    scrap1Geo,
    new THREE.Vector3(0.08, 0.34, 0.02),
    new THREE.Euler(0.3, 0, 0.2),
    creamWoolMat,
    0.010,
  ));
  // Scrap 2: rust flat-folded fabric, sticking out back-left
  const scrap2Geo = new THREE.BoxGeometry(0.12, 0.18, 0.04, 2, 2, 1);
  applyPuffy(scrap2Geo, 0.012, 8.0);
  cardboardBox.add(makePart(
    scrap2Geo,
    new THREE.Vector3(-0.05, 0.36, -0.03),
    new THREE.Euler(-0.2, 0, -0.15),
    rustLinenMat,
    0.010,
  ));
  // Scrap 3: olive slightly-tapered roll, leaning out left
  const scrap3Geo = new THREE.CylinderGeometry(0.05, 0.04, 0.18, 12);
  applyPuffy(scrap3Geo, 0.01, 8.0);
  cardboardBox.add(makePart(
    scrap3Geo,
    new THREE.Vector3(-0.08, 0.34, 0.06),
    new THREE.Euler(0.2, 0, 0.1),
    oliveNylonMat,
    0.010,
  ));

  cardboardBox.position.set(0.7, 0, 0.55);
  garmentRack.add(cardboardBox);

  // Position + rotate garmentRack: back-right of room, splayed outward
  garmentRack.position.set(3, 0, -3.5);
  garmentRack.rotation.y = -Math.PI * 0.15;
  group.add(garmentRack);

  return group;
}
