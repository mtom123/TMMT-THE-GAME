// ================================================================
// GARMENT — BULK SHIRT (Look 03 — Washed Denim)
// TMMT 2025-26 Lookbook 3D
// ================================================================
//
// Boxy oversized silhouette. Hand-bleached washed denim.
// Drop shoulders, extended hem. Front welt pockets replace
// traditional chest pockets.
//
// Coordinate system matches mannequin proportions in worklog:
//   - Feet at y=0, head top at y≈3.87
//   - Shoulder line y≈3.38, neck base y≈3.54
//   - Arms hang at x=±0.335
//   - This garment group is NOT scaled — it uses the documented
//     proportions directly (the mannequin itself is scaled in
//     its own module).
// ================================================================

import * as THREE from 'three';
import { createShaderMaterial, createOutline, applyPuffy } from './atelier-core.js';

export function createBulkShirt() {
  const group = new THREE.Group();
  group.name = 'bulk-shirt';

  // -- Materials ---------------------------------------------------
  // Denim (washed blue-grey) for all fabric parts.
  // Dark nylon-shader for buttons (tiny, near-black).
  const denimMat = createShaderMaterial('denim');
  const buttonMat = createShaderMaterial('nylon', {
    baseColor: new THREE.Color(0x161616),
    shadowColor: new THREE.Color(0x000000),
  });

  // -- Helper: mesh + outline sibling inside a sub-group ----------
  // Keeps transforms on the sub-group applied to BOTH mesh and
  // its Inverted Hull outline so they stay in sync.
  function makePart(geometry, position, rotation, thickness = 0.022) {
    const sub = new THREE.Group();
    const mesh = new THREE.Mesh(geometry, denimMat);
    sub.add(mesh);
    sub.add(createOutline(geometry, thickness));
    sub.position.copy(position);
    if (rotation) sub.rotation.copy(rotation);
    return sub;
  }

  // ===========================================================
  // 1. TORSO BODY — boxy, oversized
  //    Wide rectangular silhouette around mannequin torso
  //    Hem at y≈1.70 (mid-thigh), top at y≈3.40 (just below neckline)
  //    Slight puffy displacement for baggy/wrinkled feel
  // ===========================================================
  const torsoGeo = new THREE.BoxGeometry(0.55, 1.70, 0.36, 6, 10, 6);
  applyPuffy(torsoGeo, 0.014, 5.0);
  const torso = makePart(
    torsoGeo,
    new THREE.Vector3(0, 2.55, 0)
  );
  group.add(torso);

  // ===========================================================
  // 2. BACK YOKE — trapezoidal panel across upper back
  //    Visible seam line below the neckline
  //    Positioned just behind the torso back face
  // ===========================================================
  const yokeGeo = new THREE.BoxGeometry(0.50, 0.12, 0.04, 4, 2, 2);
  const yoke = makePart(
    yokeGeo,
    new THREE.Vector3(0, 3.25, -0.20)
  );
  group.add(yoke);

  // ===========================================================
  // 3 & 4. SLEEVES (drop shoulder)
  //    Drop shoulder: top of sleeve sits BELOW the natural
  //    shoulder line (y=3.20 vs mannequin shoulder y=3.38).
  //    Slight outward tilt follows relaxed arm hang.
  //    Top at (±0.335, 3.20), bottom at (±0.39, 2.40).
  // ===========================================================
  const sleeveTilt = 0.069; // ~4° outward
  const sleeveGeo = new THREE.CylinderGeometry(0.085, 0.078, 0.80, 14, 6);
  applyPuffy(sleeveGeo, 0.008, 5.0);

  const rSleeve = makePart(
    sleeveGeo,
    new THREE.Vector3(0.3625, 2.80, 0),
    new THREE.Euler(0, 0, sleeveTilt)
  );
  group.add(rSleeve);

  const lSleeveGeo = sleeveGeo.clone();
  const lSleeve = makePart(
    lSleeveGeo,
    new THREE.Vector3(-0.3625, 2.80, 0),
    new THREE.Euler(0, 0, -sleeveTilt)
  );
  group.add(lSleeve);

  // ===========================================================
  // 5 & 6. CUFFS — small bands at the wrist (y≈2.40)
  //    Slightly larger radius than sleeve bottom, tilted to
  //    match sleeve angle.
  // ===========================================================
  const cuffGeo = new THREE.CylinderGeometry(0.092, 0.092, 0.06, 16, 2);

  const rCuff = makePart(
    cuffGeo,
    new THREE.Vector3(0.39, 2.40, 0),
    new THREE.Euler(0, 0, sleeveTilt)
  );
  group.add(rCuff);

  const lCuffGeo = cuffGeo.clone();
  const lCuff = makePart(
    lCuffGeo,
    new THREE.Vector3(-0.39, 2.40, 0),
    new THREE.Euler(0, 0, -sleeveTilt)
  );
  group.add(lCuff);

  // ===========================================================
  // 7 & 8. COLLAR LEAVES — open spread collar
  //    Two angled plates forming a V at the front of the neck.
  //    Tilted forward (rotation.x) and angled outward (rotation.y).
  //    Right collar: rotation.y NEGATIVE so outer end goes forward
  //    Left collar:  rotation.y POSITIVE (mirror)
  // ===========================================================
  const collarGeo = new THREE.BoxGeometry(0.15, 0.025, 0.10, 3, 2, 2);
  applyPuffy(collarGeo, 0.004, 4.0);

  const rCollar = makePart(
    collarGeo,
    new THREE.Vector3(0.075, 3.45, 0.04),
    new THREE.Euler(0.30, -0.40, 0)
  );
  group.add(rCollar);

  const lCollarGeo = collarGeo.clone();
  const lCollar = makePart(
    lCollarGeo,
    new THREE.Vector3(-0.075, 3.45, 0.04),
    new THREE.Euler(0.30, 0.40, 0)
  );
  group.add(lCollar);

  // ===========================================================
  // 9. CENTER FRONT PLACKET — thin vertical strip on front
  //    From y=1.90 (above hem) up to y=3.40 (neckline)
  //    Sits just in front of the torso's front face
  // ===========================================================
  const placketGeo = new THREE.BoxGeometry(0.06, 1.50, 0.022, 2, 10, 2);
  const placket = makePart(
    placketGeo,
    new THREE.Vector3(0, 2.65, 0.205)
  );
  group.add(placket);

  // ===========================================================
  // 10. BUTTONS — 5 slightly-flattened spheres along placket
  //    Dark nylon-shader material, small outline for crisp edge
  // ===========================================================
  const btnGeo = new THREE.SphereGeometry(0.022, 14, 10);
  btnGeo.scale(1, 0.65, 1); // flatten slightly on Y (disc-like)
  const buttonYs = [3.20, 2.90, 2.60, 2.30, 2.00];
  for (const y of buttonYs) {
    const btnSub = new THREE.Group();
    const btnMesh = new THREE.Mesh(btnGeo, buttonMat);
    btnSub.add(btnMesh);
    btnSub.add(createOutline(btnGeo, 0.010));
    btnSub.position.set(0, y, 0.225);
    group.add(btnSub);
  }

  // ===========================================================
  // 11 & 12. WELT POCKETS — angled horizontal slits on front
  //    Replace traditional chest pockets per Look 03 description.
  //    Slight Z-rotation gives the angled "welt" look.
  // ===========================================================
  const pocketGeo = new THREE.BoxGeometry(0.16, 0.025, 0.028, 2, 2, 2);

  const rPocket = makePart(
    pocketGeo,
    new THREE.Vector3(0.15, 2.40, 0.205),
    new THREE.Euler(0, 0, -0.12)
  );
  group.add(rPocket);

  const lPocketGeo = pocketGeo.clone();
  const lPocket = makePart(
    lPocketGeo,
    new THREE.Vector3(-0.15, 2.40, 0.205),
    new THREE.Euler(0, 0, 0.12)
  );
  group.add(lPocket);

  // ===========================================================
  // 13. HEM DETAIL — slightly thicker band at the bottom
  //    Folded hem: slightly wider than torso so it reads as a
  //    distinct band at the bottom edge of the shirt.
  // ===========================================================
  const hemGeo = new THREE.BoxGeometry(0.565, 0.07, 0.375, 4, 2, 4);
  applyPuffy(hemGeo, 0.005, 4.0);
  const hem = makePart(
    hemGeo,
    new THREE.Vector3(0, 1.74, 0)
  );
  group.add(hem);

  return group;
}
