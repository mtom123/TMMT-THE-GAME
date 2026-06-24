// ================================================================
// ENVIRONMENT MODULE — Cutting Table with Tailoring Tools
// TMMT 2025-26 Atelier Sferico / Messenger (Abeto) cel-shading
// ================================================================
//
// Large wooden cutting table (2.4 × 1.0 × 0.05) with 6 legs and a
// lower storage shelf. On top: denim fabric piece with pattern
// paper, two fabric scraps, shears, tailor's chalk, ruler, rotary
// cutter, pin cushion with pins, thread spool, tape measure, and
// a sketch/design paper.
//
// Every visible mesh has an Inverted Hull outline sibling.
//
// Local layout (before group rotation):
//   - Table top: 1.0 (X depth) × 0.05 (Y thick) × 2.4 (Z long)
//   - Long axis along Z; group.rotation.y = π/2 rotates long axis
//     to world X (parallel to room's left-right axis).
//   - Table top center at y=0.85 (top surface y=0.875).
//   - 6 legs at perimeter: 4 corners + 2 mid-long edges.
//   - Lower shelf at y=0.15 between legs.
//   - Tools scattered on table top (y ≈ 0.88–0.94).
//
// Exports: createCuttingTable() → THREE.Group
// ================================================================

import * as THREE from 'three';
import { createShaderMaterial, createOutline, applyPuffy } from './atelier-core.js';

export function createCuttingTable() {
  const group = new THREE.Group();
  group.name = 'cutting-table';

  // ============================================================
  // Materials (shared instances — single uniform set per colorway)
  // ============================================================

  // Light wood / kraft-paper table surface — table top, legs, shelf
  const tableMat = createShaderMaterial('nylon', {
    baseColor:   new THREE.Color(0xa89070),
    shadowColor: new THREE.Color(0x4a3a28),
    specIntensity: 0.15,
  });
  // Darker wood — ruler
  const darkWoodMat = createShaderMaterial('nylon', {
    baseColor:   new THREE.Color(0x6b4a2c),
    shadowColor: new THREE.Color(0x2a1a0c),
    specIntensity: 0.2,
  });
  // Denim-look main fabric piece
  const denimMat = createShaderMaterial('denim', {
    baseColor: new THREE.Color(0x4a5d7a),
  });
  // Cream paper — pattern paper + sketch paper
  const paperMat = createShaderMaterial('nylon', {
    baseColor:   new THREE.Color(0xe8e0c8),
    shadowColor: new THREE.Color(0xa89878),
    specIntensity: 0.05,
  });
  // Tan cotton — fabric scraps
  const tanCottonMat = createShaderMaterial('nylon', {
    baseColor:   new THREE.Color(0xc8a878),
    shadowColor: new THREE.Color(0x6a5030),
    specIntensity: 0.1,
  });
  // Silver — shears blades, rotary cutter blade, pins
  const silverMat = createShaderMaterial('nylon', {
    baseColor:     new THREE.Color(0xb0b0b0),
    specIntensity: 2.0,
    specShininess: 80,
  });
  // Black enamel — shears handle rings, rotary cutter handle
  const blackMat = createShaderMaterial('nylon', {
    baseColor: new THREE.Color(0x101010),
  });
  // White — tailor's chalk
  const whiteMat = createShaderMaterial('nylon', {
    baseColor:   new THREE.Color(0xf0f0e0),
    shadowColor: new THREE.Color(0x808078),
  });
  // Red fabric — pin cushion
  const redFabricMat = createShaderMaterial('nylon', {
    baseColor:   new THREE.Color(0x8b2820),
    shadowColor: new THREE.Color(0x2a0808),
  });
  // Cream — thread spool
  const creamMat = createShaderMaterial('nylon', {
    baseColor:   new THREE.Color(0xe8d8b8),
    shadowColor: new THREE.Color(0x6a5838),
  });
  // Yellow — tape measure
  const yellowMat = createShaderMaterial('nylon', {
    baseColor:   new THREE.Color(0xc8b040),
    shadowColor: new THREE.Color(0x504010),
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

  // ============================================================
  // A. TABLE
  // Top: 1.0 (X) × 0.05 (Y) × 2.4 (Z), center y=0.85
  // Top surface y=0.875, bottom y=0.825
  // ============================================================

  // 1. Table top — light wood / kraft-paper surface
  const tableTopGeo = new THREE.BoxGeometry(1.0, 0.05, 2.4);
  applyPuffy(tableTopGeo, 0.003, 40); // subtle wood-grain ripple
  group.add(makePart(
    tableTopGeo,
    new THREE.Vector3(0, 0.85, 0),
    null,
    tableMat,
    0.018,
  ));

  // 2-7. 6 table legs (0.08 × 0.85 × 0.08) at perimeter, inset 0.04 from edges
  // Top of leg at y=0.85 (embedded 0.025 into table top), bottom at y=0
  const tableLegGeo = new THREE.BoxGeometry(0.08, 0.85, 0.08);
  const tableLegPositions = [
    [ 0.46, 0.425,  1.16], // front-right corner
    [-0.46, 0.425,  1.16], // front-left corner
    [ 0.46, 0.425, -1.16], // back-right corner
    [-0.46, 0.425, -1.16], // back-left corner
    [ 0.46, 0.425,  0.00], // mid-long right edge
    [-0.46, 0.425,  0.00], // mid-long left edge
  ];
  for (const [x, y, z] of tableLegPositions) {
    group.add(makePart(
      tableLegGeo,
      new THREE.Vector3(x, y, z),
      null,
      tableMat,
      0.018,
    ));
  }

  // 8. Lower shelf — thin box under table for storage
  // 0.7 (X) × 0.02 (Y) × 2.0 (Z) at y=0.15. Spans between legs.
  const shelfGeo = new THREE.BoxGeometry(0.7, 0.02, 2.0);
  group.add(makePart(
    shelfGeo,
    new THREE.Vector3(0, 0.15, 0),
    null,
    tableMat,
    0.018,
  ));

  // ============================================================
  // B. FABRIC ON TABLE
  // All fabric/paper pieces sit on the table top surface (y=0.875)
  // ============================================================

  // 9. Main fabric piece — denim, slightly puffy
  // BoxGeometry(0.7 X × 0.02 Y × 1.6 Z) at (0, 0.885, -0.2)
  // Bottom y=0.875 (on table), top y=0.895
  const fabricGeo = new THREE.BoxGeometry(0.7, 0.02, 1.6, 6, 2, 12);
  applyPuffy(fabricGeo, 0.005, 8); // subtle fabric drape
  group.add(makePart(
    fabricGeo,
    new THREE.Vector3(0, 0.885, -0.2),
    null,
    denimMat,
    0.012,
  ));

  // 10. Pattern paper — thin cream box on top of fabric
  // BoxGeometry(0.5 X × 0.005 Y × 1.0 Z) at (0, 0.8975, 0.1)
  // Fabric top at y=0.895, paper bottom at 0.895, center y=0.8975, top y=0.9
  const patternPaperGeo = new THREE.BoxGeometry(0.5, 0.005, 1.0);
  group.add(makePart(
    patternPaperGeo,
    new THREE.Vector3(0, 0.8975, 0.1),
    null,
    paperMat,
    0.012,
  ));

  // 11. Fabric scrap 1 — small irregular tan cotton, rotated
  // BoxGeometry(0.3 × 0.01 × 0.25) at (-0.3, 0.88, 0.7), rotation.y = 0.3
  // Top of table at y=0.875, scrap bottom at 0.875, center y=0.88, top y=0.885
  const scrap1Geo = new THREE.BoxGeometry(0.3, 0.01, 0.25);
  group.add(makePart(
    scrap1Geo,
    new THREE.Vector3(-0.3, 0.88, 0.7),
    new THREE.Euler(0, 0.3, 0),
    tanCottonMat,
    0.012,
  ));

  // 12. Fabric scrap 2 — small irregular tan cotton, different rotation
  // BoxGeometry(0.2 × 0.01 × 0.18) at (0.35, 0.88, -0.95), rotation.y = -0.4
  const scrap2Geo = new THREE.BoxGeometry(0.2, 0.01, 0.18);
  group.add(makePart(
    scrap2Geo,
    new THREE.Vector3(0.35, 0.88, -0.95),
    new THREE.Euler(0, -0.4, 0),
    tanCottonMat,
    0.012,
  ));

  // ============================================================
  // C. TOOLS (scattered on table)
  // All tools sit on the table top (y=0.875) or on fabric/paper
  // ============================================================

  // 13. Shears/scissors — 2 silver blade boxes + 2 black handle torus rings
  // Sub-group positioned at (-0.35, 0.885, 1.0), lying flat on table
  // Blade box: 0.02 X × 0.015 Y × 0.2 Z, angled slightly apart
  // Handle ring: TorusGeometry(0.04, 0.012) rotated π/2 around X to lie flat
  // Layout (local to scissors sub-group):
  //   -Z = blade tips, +Z = handle rings, pivot near z=0
  const shearsGroup = new THREE.Group();
  const bladeGeo = new THREE.BoxGeometry(0.02, 0.015, 0.2);
  // Blade 1 — extends from pivot (z=0) to tip (z=-0.2), slight -X angle
  shearsGroup.add(makePart(
    bladeGeo,
    new THREE.Vector3(-0.018, 0, -0.1),
    new THREE.Euler(0, 0.15, 0),
    silverMat,
    0.012,
  ));
  // Blade 2 — extends from pivot to tip, slight +X angle
  shearsGroup.add(makePart(
    bladeGeo,
    new THREE.Vector3(0.018, 0, -0.1),
    new THREE.Euler(0, -0.15, 0),
    silverMat,
    0.012,
  ));
  // Handle ring 1 — at +Z end (back of scissors), -X side
  const ringGeo = new THREE.TorusGeometry(0.04, 0.012, 12, 24);
  shearsGroup.add(makePart(
    ringGeo,
    new THREE.Vector3(-0.03, 0, 0.06),
    new THREE.Euler(Math.PI / 2, 0, 0),
    blackMat,
    0.012,
  ));
  // Handle ring 2 — at +Z end, +X side
  shearsGroup.add(makePart(
    ringGeo,
    new THREE.Vector3(0.03, 0, 0.06),
    new THREE.Euler(Math.PI / 2, 0, 0),
    blackMat,
    0.012,
  ));
  shearsGroup.position.set(-0.35, 0.885, 1.0);
  group.add(shearsGroup);

  // 14. Tailor's chalk — small white cube at edge of pattern paper
  // BoxGeometry(0.04³) at (0.28, 0.915, 0.4), slight rotation for naturalism
  // Sits on fabric (fabric top y=0.895), cube center y=0.915 (bottom 0.895)
  const chalkGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
  group.add(makePart(
    chalkGeo,
    new THREE.Vector3(0.28, 0.915, 0.4),
    new THREE.Euler(0.05, 0.3, 0.05),
    whiteMat,
    0.008,
  ));

  // 15. Ruler/straightedge — long thin dark-wood box
  // BoxGeometry(0.06 X × 0.02 Y × 1.2 Z) at (-0.25, 0.886, -0.5)
  // Top of table y=0.875, ruler center y=0.886, top y=0.896
  // Spans Z ∈ [-1.1, 0.1] (along long axis of table)
  const rulerGeo = new THREE.BoxGeometry(0.06, 0.02, 1.2);
  group.add(makePart(
    rulerGeo,
    new THREE.Vector3(-0.25, 0.886, -0.5),
    null,
    darkWoodMat,
    0.012,
  ));

  // 16. Rotary cutter — handle cylinder + circular blade
  // Handle: CylinderGeometry(r=0.02, h=0.3) rotated π/2 around X → axis along Z
  //   Extends along Z from z=-0.20 to z=0.10 (length 0.3)
  // Blade: CylinderGeometry(r=0.06, h=0.005) rotated π/2 around Z → axis along X
  //   Vertical disc at -Z end of handle, bottom touches table (y=0.875)
  // Both center y = 0.935 (blade radius 0.06 above table top)
  const cutterHandleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 16);
  group.add(makePart(
    cutterHandleGeo,
    new THREE.Vector3(0.35, 0.935, -0.05),
    new THREE.Euler(Math.PI / 2, 0, 0),
    blackMat,
    0.012,
  ));
  const cutterBladeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.005, 24);
  group.add(makePart(
    cutterBladeGeo,
    new THREE.Vector3(0.35, 0.935, -0.20),
    new THREE.Euler(0, 0, Math.PI / 2),
    silverMat,
    0.012,
  ));

  // 17. Pin cushion — flattened red sphere with 6 silver pins sticking out
  // Sub-group positioned at (-0.4, 0.91, -0.9)
  // SphereGeometry(0.05) scaled y by 0.7 → cushion y radius 0.035
  // Cushion center at sub-group local (0,0,0); after sub-group offset
  //   y=0.91, cushion bottom at y=0.875 (touches table), top at y=0.945
  const pincushionGroup = new THREE.Group();
  const cushionGeo = new THREE.SphereGeometry(0.05, 16, 12);
  cushionGeo.scale(1, 0.7, 1);
  pincushionGroup.add(makePart(
    cushionGeo,
    new THREE.Vector3(0, 0, 0),
    null,
    redFabricMat,
    0.012,
  ));
  // 6 pins — thin silver cylinders, length 0.04, radius 0.0015
  // Direction vectors point outward from cushion center, mostly upward.
  // Pin center placed at distance 0.05 along dir — pin extends from
  // distance 0.03 (embedded inside cushion) to 0.07 (sticking out).
  const pinGeo = new THREE.CylinderGeometry(0.0015, 0.0015, 0.04, 6);
  const pinDirs = [
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0.4, 0.85, 0.1).normalize(),
    new THREE.Vector3(-0.4, 0.85, 0.1).normalize(),
    new THREE.Vector3(0.1, 0.85, 0.4).normalize(),
    new THREE.Vector3(-0.1, 0.85, -0.4).normalize(),
    new THREE.Vector3(0.3, 0.8, -0.3).normalize(),
  ];
  const upVec = new THREE.Vector3(0, 1, 0);
  for (const dir of pinDirs) {
    // Pin center on the unscaled sphere surface (radius 0.05) — slight
    // approximation since cushion is y-scaled, but visually the pin
    // emerges from inside the cushion and sticks out by ~0.02-0.035.
    const pinCenter = dir.clone().multiplyScalar(0.05);
    // Rotation: cylinder default axis is +Y; rotate to dir
    const quat = new THREE.Quaternion().setFromUnitVectors(upVec, dir);
    const euler = new THREE.Euler().setFromQuaternion(quat);
    pincushionGroup.add(makePart(
      pinGeo,
      pinCenter,
      euler,
      silverMat,
      0.008,
    ));
  }
  pincushionGroup.position.set(-0.4, 0.91, -0.9);
  group.add(pincushionGroup);

  // 18. Spool of thread — cream cylinder on table
  // CylinderGeometry(r=0.05, h=0.1) at (0.4, 0.925, -0.5)
  // Bottom y=0.875 (touches table), top y=0.975, center y=0.925
  const spoolGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.1, 16);
  group.add(makePart(
    spoolGeo,
    new THREE.Vector3(0.4, 0.925, -0.5),
    null,
    creamMat,
    0.012,
  ));

  // 19. Tape measure — rolled flat torus, yellow
  // TorusGeometry(radius=0.08, tube=0.025). rotation.x = π/2 → lies flat
  //   (ring in XZ plane, tube cross-section in Y).
  // Total Y height = 2 × tube = 0.05. Center y=0.9 → bottom y=0.875 (table top)
  // Position: (0, 0.9, 0.9) — bare table near front edge (off fabric)
  const tapeGeo = new THREE.TorusGeometry(0.08, 0.025, 12, 32);
  group.add(makePart(
    tapeGeo,
    new THREE.Vector3(0, 0.9, 0.9),
    new THREE.Euler(Math.PI / 2, 0, 0),
    yellowMat,
    0.012,
  ));

  // 20. Sketch/design paper — small flat cream box, slight tilt
  // BoxGeometry(0.3 X × 0.005 Y × 0.4 Z) at (0.05, 0.9, -0.6)
  // Slight tilt: Euler(0.03, 0.2, 0.02). On fabric (fabric top y=0.895),
  // paper center y=0.9 (bottom 0.8975, above fabric — small gap acceptable).
  const sketchPaperGeo = new THREE.BoxGeometry(0.3, 0.005, 0.4);
  group.add(makePart(
    sketchPaperGeo,
    new THREE.Vector3(0.05, 0.9, -0.6),
    new THREE.Euler(0.03, 0.2, 0.02),
    paperMat,
    0.012,
  ));

  // ============================================================
  // Position group: right side of atelier, long axis along world X
  // Local +Z → world +X after rotation.y = π/2 (table long side
  // runs parallel to room's left-right axis, gives clean view
  // from mannequin at origin).
  // ============================================================
  group.position.set(3.5, 0, 0);
  group.rotation.y = Math.PI / 2;
  return group;
}
