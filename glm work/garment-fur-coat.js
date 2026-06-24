// ================================================================
// GARMENT — BIGFOOT FUR COAT (Look 09 — Eco-Fur Showpiece)
// TMMT 2025-26 Lookbook 3D
// ================================================================
//
// Massive oversized eco-fur showpiece. Boxy body split into two
// halves with an open front showing a dark inner lining. Shawl
// collar of two angled fur plates forms a V at the neckline.
// Two oversized bell sleeves with drop shoulders.
//
// Coordinate system matches mannequin proportions in worklog:
//   - Feet at y=0, head top at y≈3.87
//   - Shoulder line y≈3.38, neck base y≈3.54
//   - Arms hang at x=±0.335
//   - This garment group is NOT scaled — it uses the documented
//     proportions directly (the mannequin itself is scaled in
//     its own module).
//
// All fur parts use buildFurShells(geo, null, 'fur') which returns
// a Group of 14 concentric shells (1 opaque undercoat + 13 alpha
// shells displaced along normals). Fur parts do NOT get a separate
// Inverted Hull outline — the alpha noise + cel-shading is enough.
// Only the dark inner lining uses createOutline for crisp edges.
// ================================================================

import * as THREE from 'three';
import {
  createShaderMaterial,
  createOutline,
  applyPuffy,
  buildFurShells,
} from './atelier-core.js';

export function createFurCoat() {
  const group = new THREE.Group();
  group.name = 'fur-coat';

  // ===========================================================
  // 1 & 2. BODY HALVES (left + right) — oversized boxy fur
  //    Two separate boxes with a ~0.06 gap at center to form
  //    the open front. Through the gap, the dark inner lining
  //    is visible.
  //
  //    Total coat width 0.85 (each half 0.395 + gap 0.06).
  //    Depth 0.55 (much deeper than mannequin torso 0.24).
  //    Height 2.40 (y=1.20 mid-calf to y=3.60 above neck base).
  //    Center y = 2.40.
  //    Each half offset by width/2 + gap/2 = 0.1975 + 0.03 = 0.2275.
  // ===========================================================
  const BODY_WIDTH = 0.395;
  const BODY_HEIGHT = 2.40;
  const BODY_DEPTH = 0.55;
  const BODY_CENTER_Y = 2.40;
  const FRONT_GAP = 0.06;
  const bodyHalfOffset = BODY_WIDTH / 2 + FRONT_GAP / 2; // 0.2275

  const rBodyGeo = new THREE.BoxGeometry(BODY_WIDTH, BODY_HEIGHT, BODY_DEPTH, 6, 12, 6);
  applyPuffy(rBodyGeo, 0.025, 3.0);
  const rBody = buildFurShells(rBodyGeo, null, 'fur');
  rBody.position.set(bodyHalfOffset, BODY_CENTER_Y, 0);
  group.add(rBody);

  const lBodyGeo = new THREE.BoxGeometry(BODY_WIDTH, BODY_HEIGHT, BODY_DEPTH, 6, 12, 6);
  applyPuffy(lBodyGeo, 0.025, 3.0);
  const lBody = buildFurShells(lBodyGeo, null, 'fur');
  lBody.position.set(-bodyHalfOffset, BODY_CENTER_Y, 0);
  group.add(lBody);

  // ===========================================================
  // 3 & 4. SLEEVES — oversized bell cylinders, drop shoulder
  //    Top r=0.18, bottom r=0.15, h=1.10.
  //    Top of sleeve at y=3.20 (just below shoulder line 3.38 —
  //    a drop-shoulder look that's appropriate for an oversized
  //    coat). Bottom at y=2.10 (just past the wrist y≈2.35 —
  //    long sleeves typical of a winter showpiece).
  //    Slight outward tilt (~3.7°) follows the relaxed arm hang.
  //
  //    Sleeve center x = 0.42 — places the top inner edge at
  //    x≈0.24 (inside body half) and the bottom outer edge at
  //    x≈0.60 (well outside the body), giving the bell sleeve
  //    its characteristic drape off the side of the coat.
  // ===========================================================
  const SLEEVE_TOP_R = 0.18;
  const SLEEVE_BOT_R = 0.15;
  const SLEEVE_H = 1.10;
  const SLEEVE_CENTER_X = 0.42;
  const SLEEVE_CENTER_Y = 2.65; // top y=3.20, bottom y=2.10
  const SLEEVE_TILT = 0.064; // ~3.7° outward

  const rSleeveGeo = new THREE.CylinderGeometry(
    SLEEVE_TOP_R, SLEEVE_BOT_R, SLEEVE_H, 16, 8,
  );
  applyPuffy(rSleeveGeo, 0.025, 3.0);
  const rSleeve = buildFurShells(rSleeveGeo, null, 'fur');
  rSleeve.position.set(SLEEVE_CENTER_X, SLEEVE_CENTER_Y, 0);
  rSleeve.rotation.set(0, 0, SLEEVE_TILT);
  group.add(rSleeve);

  const lSleeveGeo = new THREE.CylinderGeometry(
    SLEEVE_TOP_R, SLEEVE_BOT_R, SLEEVE_H, 16, 8,
  );
  applyPuffy(lSleeveGeo, 0.025, 3.0);
  const lSleeve = buildFurShells(lSleeveGeo, null, 'fur');
  lSleeve.position.set(-SLEEVE_CENTER_X, SLEEVE_CENTER_Y, 0);
  lSleeve.rotation.set(0, 0, -SLEEVE_TILT);
  group.add(lSleeve);

  // ===========================================================
  // 5 & 6. SHAWL COLLAR — two angled fur plates forming a V
  //    Each plate spans y=3.54 (neck base) down to y=2.80
  //    (mid-chest). Local height 0.78, center y=3.17.
  //
  //    Tilted inward (rotation.z = ±0.25) so the tops splay
  //    outward near the neck and the bottoms meet near the
  //    center to form a V. Plate width 0.10 (narrow enough
  //    that the rotated bottom-inner corner doesn't cross
  //    center; verified apex lands at x≈±0.035, just outside
  //    the 0.06 body gap, framing the lining below).
  //
  //    Positioned at z=0.32 (in front of the body front face
  //    at z≈0.30 with puffy), so the collar reads as a shawl
  //    rolling forward over the open front of the coat.
  // ===========================================================
  const COLLAR_W = 0.10;
  const COLLAR_H = 0.78;
  const COLLAR_D = 0.10;
  const COLLAR_CENTER_Y = 3.17; // (3.54 + 2.80) / 2
  const COLLAR_TILT = 0.25; // ~14.3° inward
  const COLLAR_X = 0.18; // inner edge near gap, outer edge into body
  const COLLAR_Z = 0.32; // in front of body front face

  const rCollarGeo = new THREE.BoxGeometry(COLLAR_W, COLLAR_H, COLLAR_D, 4, 6, 3);
  applyPuffy(rCollarGeo, 0.025, 3.0);
  const rCollar = buildFurShells(rCollarGeo, null, 'fur');
  rCollar.position.set(COLLAR_X, COLLAR_CENTER_Y, COLLAR_Z);
  // Negative tilt for right plate: top swings +x (outward),
  // bottom swings -x (toward center) — V apex at bottom.
  rCollar.rotation.set(0, 0, -COLLAR_TILT);
  group.add(rCollar);

  const lCollarGeo = new THREE.BoxGeometry(COLLAR_W, COLLAR_H, COLLAR_D, 4, 6, 3);
  applyPuffy(lCollarGeo, 0.025, 3.0);
  const lCollar = buildFurShells(lCollarGeo, null, 'fur');
  lCollar.position.set(-COLLAR_X, COLLAR_CENTER_Y, COLLAR_Z);
  lCollar.rotation.set(0, 0, COLLAR_TILT);
  group.add(lCollar);

  // ===========================================================
  // 7. INNER LINING — dark nylon slab visible through the gap
  //    Thin box at x=0 (inside the 0.06 front gap), height 2.0
  //    (visible from y=1.40 to y=3.40 through the open front),
  //    depth 0.50 (slightly inside the body depth of 0.55, so
  //    the lining is recessed ~0.025 from the body front/back
  //    faces — gives a sense of depth, not flush).
  //
  //    Dark nylon-shader with Inverted Hull outline (0.018) for
  //    crisp edges against the fur. This is the ONLY non-fur
  //    part of the garment.
  // ===========================================================
  const liningGeo = new THREE.BoxGeometry(0.04, 2.0, 0.5);
  const liningMat = createShaderMaterial('nylon', {
    baseColor: new THREE.Color(0x1a1a1a),
  });
  const liningSub = new THREE.Group();
  const liningMesh = new THREE.Mesh(liningGeo, liningMat);
  liningSub.add(liningMesh);
  liningSub.add(createOutline(liningGeo, 0.018));
  liningSub.position.set(0, 2.4, 0); // centered, slightly behind the open front gap
  group.add(liningSub);

  return group;
}
