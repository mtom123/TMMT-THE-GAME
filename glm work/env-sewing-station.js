// ================================================================
// ENVIRONMENT MODULE — Sewing Machine Station
// TMMT 2025-26 Atelier Sferico / Messenger (Abeto) cel-shading
// ================================================================
//
// Vintage industrial sewing machine station: wooden table with
// 4 legs, black-enamel sewing machine body with horizontal arm,
// needle + presser foot + base plate, red thread spool on pin,
// handwheel, and a simple wooden chair behind the table.
// Plus a small floor pincushion / thread-scrap basket.
//
// Every visible mesh has an Inverted Hull outline sibling.
//
// Local layout:
//   - Operator sits at -X, faces +X (toward machine, and toward
//     atelier origin after group.rotation.y = 0.3π is applied).
//   - Table: wide axis = Z (1.6), depth axis = X (0.7).
//   - Machine on +X side of table; chair on -X side.
//
// Exports: createSewingStation() → THREE.Group
// ================================================================

import * as THREE from 'three';
import { createShaderMaterial, createOutline, applyPuffy } from './atelier-core.js';

export function createSewingStation() {
  const group = new THREE.Group();
  group.name = 'sewing-station';

  // ============================================================
  // Materials (shared instances — single uniform set per colorway)
  // ============================================================
  const woodMat = createShaderMaterial('nylon', {
    baseColor:   new THREE.Color(0x6b4a2c),
    shadowColor: new THREE.Color(0x2a1a0c),
    specIntensity: 0.2,
  });
  const blackMat = createShaderMaterial('nylon', {
    baseColor: new THREE.Color(0x0a0a0a),
  });
  const silverMat = createShaderMaterial('nylon', {
    baseColor:     new THREE.Color(0xcccccc),
    specIntensity: 2.0,
    specShininess: 100,
  });
  const redThreadMat = createShaderMaterial('nylon', {
    baseColor:   new THREE.Color(0x8b2820),
    shadowColor: new THREE.Color(0x2a0808),
  });

  // ============================================================
  // Helper: mesh + Inverted Hull outline as a sub-group so
  // transforms applied to the sub-group propagate to both.
  // ============================================================
  function makePart(geometry, position, rotation, mat, thickness = 0.018) {
    const sub = new THREE.Group();
    const mesh = new THREE.Mesh(geometry, mat);
    sub.add(mesh);
    sub.add(createOutline(geometry, thickness));
    sub.position.copy(position);
    if (rotation) sub.rotation.copy(rotation);
    return sub;
  }

  // ============================================================
  // TABLE (wooden, 1.6 wide × 0.7 deep × 0.04 thick)
  // Wide axis = Z (1.6), Depth axis = X (0.7), top surface at y=0.77
  // ============================================================

  // Table top — BoxGeometry(0.7 X, 0.04 Y, 1.6 Z) at y=0.75
  // (top surface at 0.77, bottom at 0.73)
  const tableTopGeo = new THREE.BoxGeometry(0.7, 0.04, 1.6);
  applyPuffy(tableTopGeo, 0.003, 40); // subtle wood-grain ripple
  group.add(makePart(
    tableTopGeo,
    new THREE.Vector3(0, 0.75, 0),
    null,
    woodMat,
  ));

  // 4 table legs (0.06 × 0.75 × 0.06) at corners, inset 0.05 from edges
  // Top of leg at y=0.75 (embedded 0.02 into table top)
  const tableLegGeo = new THREE.BoxGeometry(0.06, 0.75, 0.06);
  const tableLegPositions = [
    [ 0.30, 0.375,  0.74],
    [-0.30, 0.375,  0.74],
    [ 0.30, 0.375, -0.74],
    [-0.30, 0.375, -0.74],
  ];
  for (const [x, y, z] of tableLegPositions) {
    group.add(makePart(
      tableLegGeo,
      new THREE.Vector3(x, y, z),
      null,
      woodMat,
    ));
  }

  // ============================================================
  // SEWING MACHINE (sits on table top, base at y=0.77)
  // Body on +X side of table, arm extends -Z (operator's right)
  // ============================================================

  // Body — 0.3 (X depth) × 0.35 (Y height) × 0.5 (Z width)
  // Base at y=0.77, center y=0.945, top y=1.12
  // Position: x=+0.15 (on table, +X side toward origin), z=0
  const bodyGeo = new THREE.BoxGeometry(0.3, 0.35, 0.5, 4, 4, 4);
  applyPuffy(bodyGeo, 0.008, 10); // light casting-pucker
  group.add(makePart(
    bodyGeo,
    new THREE.Vector3(0.15, 0.945, 0),
    null,
    blackMat,
  ));

  // Arm — horizontal cylinder, length 0.3, radius 0.06
  // Extends from body's -Z face (z=-0.25) to z=-0.55 (operator's right)
  // Y=1.03 (near body top y=1.12). Rotated π/2 around X so cyl axis → Z.
  const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 16);
  group.add(makePart(
    armGeo,
    new THREE.Vector3(0.15, 1.03, -0.40),
    new THREE.Euler(Math.PI / 2, 0, 0),
    blackMat,
    0.014,
  ));

  // Needle housing — vertical box at end of arm, hanging down
  // Arm end at z=-0.55, y=1.03; arm radius 0.06, housing top y=0.97
  // Housing 0.1 tall, center y=0.92, bottom y=0.87
  const housingGeo = new THREE.BoxGeometry(0.05, 0.1, 0.05);
  group.add(makePart(
    housingGeo,
    new THREE.Vector3(0.15, 0.92, -0.55),
    null,
    blackMat,
    0.012,
  ));

  // Needle — thin silver cylinder, length 0.08, radius 0.005
  // Top y=0.87 (touches housing bottom), bottom y=0.79 (kisses base plate top)
  const needleGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.08, 8);
  group.add(makePart(
    needleGeo,
    new THREE.Vector3(0.15, 0.83, -0.55),
    null,
    silverMat,
    0.012,
  ));

  // Thread spool — red cylinder on top of body, away from operator
  // Body top y=1.12; spool base y=1.12, height 0.08, center y=1.16
  // Position at +X end of body top (away from operator): x=+0.20, z=0
  const spoolGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 16);
  group.add(makePart(
    spoolGeo,
    new THREE.Vector3(0.20, 1.16, 0),
    null,
    redThreadMat,
    0.012,
  ));

  // Thread spool pin — thin silver cylinder through spool, sticking above
  // Length 0.15, base y=1.12 (body top), top y=1.27, center y=1.195
  const pinGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.15, 8);
  group.add(makePart(
    pinGeo,
    new THREE.Vector3(0.20, 1.195, 0),
    null,
    silverMat,
    0.012,
  ));

  // Handwheel — torus on +Z side of body (operator's left, opposite arm)
  // Outer r=0.07, tube=0.012. rotation.y=π/2 → torus axis along X (ring in YZ)
  // Position: x=0.15 (body center x), y=1.03 (arm height), z=0.27 (just outside +Z face)
  const handwheelGeo = new THREE.TorusGeometry(0.07, 0.012, 16, 32);
  group.add(makePart(
    handwheelGeo,
    new THREE.Vector3(0.15, 1.03, 0.27),
    new THREE.Euler(0, Math.PI / 2, 0),
    silverMat,
    0.012,
  ));

  // Base plate — thin flat box under needle area (machine bed extension)
  // 0.1 (X) × 0.02 (Y) × 0.2 (Z). Center y=0.78, bottom y=0.77 (on table top), top y=0.79
  const basePlateGeo = new THREE.BoxGeometry(0.1, 0.02, 0.2);
  group.add(makePart(
    basePlateGeo,
    new THREE.Vector3(0.15, 0.78, -0.55),
    null,
    blackMat,
    0.012,
  ));

  // Presser foot — small angled piece just above base plate, around needle
  // Box(0.04 X, 0.04 Y, 0.06 Z) at (0.15, 0.81, -0.55), slight Z tilt
  const presserGeo = new THREE.BoxGeometry(0.04, 0.04, 0.06);
  group.add(makePart(
    presserGeo,
    new THREE.Vector3(0.15, 0.81, -0.55),
    new THREE.Euler(0, 0, 0.10),
    blackMat,
    0.012,
  ));

  // ============================================================
  // CHAIR (wooden, behind table at -X side)
  // Seat at y=0.45, back at y=0.65 with slight backward tilt
  // ============================================================

  // Seat — 0.4 (X) × 0.04 (Y) × 0.4 (Z) at (-0.7, 0.45, 0)
  const seatGeo = new THREE.BoxGeometry(0.4, 0.04, 0.4);
  group.add(makePart(
    seatGeo,
    new THREE.Vector3(-0.7, 0.45, 0),
    null,
    woodMat,
  ));

  // 4 chair legs (0.04 × 0.45 × 0.04) at corners of seat
  // Seat at x=-0.7, z=0; legs at x=-0.7 ± 0.17, z=±0.17, centered y=0.225
  const chairLegGeo = new THREE.BoxGeometry(0.04, 0.45, 0.04);
  const chairLegPositions = [
    [-0.87, 0.225,  0.17],
    [-0.53, 0.225,  0.17],
    [-0.87, 0.225, -0.17],
    [-0.53, 0.225, -0.17],
  ];
  for (const [x, y, z] of chairLegPositions) {
    group.add(makePart(
      chairLegGeo,
      new THREE.Vector3(x, y, z),
      null,
      woodMat,
      0.014,
    ));
  }

  // Chair back — 0.04 (X thick) × 0.4 (Y tall) × 0.4 (Z wide)
  // Position at x=-0.88 (behind seat at x=-0.7), y=0.65, z=0
  // Slight backward tilt: top tilts -X (away from operator facing +X)
  //   → positive Z rotation (top of +Y rotates toward -X by right-hand rule)
  const backGeo = new THREE.BoxGeometry(0.04, 0.4, 0.4);
  group.add(makePart(
    backGeo,
    new THREE.Vector3(-0.88, 0.65, 0),
    new THREE.Euler(0, 0, 0.10),
    woodMat,
  ));

  // ============================================================
  // FLOOR CUSHION / WASTE BASKET (optional)
  // Small tapered cylinder near front-left table leg — red pincushion
  // of thread scraps. Top r=0.09, bottom r=0.07, height 0.12
  // ============================================================
  const basketGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.12, 16);
  group.add(makePart(
    basketGeo,
    new THREE.Vector3(-0.40, 0.06, 0.60),
    null,
    redThreadMat,
    0.014,
  ));

  // ============================================================
  // Position group: front-left of atelier, rotated to face center
  // ============================================================
  group.position.set(-3.5, 0, 2);
  group.rotation.y = Math.PI * 0.3;
  return group;
}
