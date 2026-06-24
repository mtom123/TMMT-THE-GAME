// ================================================================
// ⚠ DEPRECATED — REFERENCE ONLY (do not import in production)
// ================================================================
// These procedural garment modules were used in early prototypes
// (lookbook-3d.html, lookbook-final.html, atelier.html) before the
// pipeline switched to real GLB assets from Blender (stadio 4).
//
// Kept in repo as SILEHOUETTE/VOLUME REFERENCE for the technical
// artist building the real meshes in Blender. The numbers (positions,
// sizes, puffy amounts) below can inform the sculpt.
//
// DO NOT import these in web/ or in any production code.
// Production uses web/AtelierLoader.js + real GLB files
// (web/assets/looks/NN-slug.glb) with mesh naming convention.
//
// Status: deprecated on 24/06/2026 (decisione Claude+GLM)
// ================================================================

// ================================================================
// GARMENT — SCARF-VEST (Look 02 — Padded Nylon)
// TMMT 2025-26 Lookbook 3D
// ================================================================
//
// Short padded nylon vest with an integrated scarf that wraps
// diagonally around the neck and hangs down in two tails.
//
// Vest: heavily puffy dark nylon (BoxGeometry + applyPuffy 0.06),
//   boxy silhouette wider than the mannequin chest, drop-shoulder
//   yoke across the top, flared hem at the bottom, center front
//   zipper with pull, two decorative quilting seams.
//
// Scarf: padded TubeGeometry (CatmullRomCurve3 + TubeGeometry)
//   wrapping diagonally around the neck (right shoulder front →
//   across front → behind neck → right shoulder back → over the
//   shoulder to front → diagonal crossover → short tail on left).
//   Long tail drops to y=1.4 on the right; short tail drops to
//   y=2.0 on the left.
//
// Coordinate system matches mannequin proportions in worklog:
//   - Feet at y=0, head top at y≈3.87
//   - Shoulder line y≈3.38, neck base y≈3.54, head center y≈3.73
//   - Arms hang at x=±0.335
//   - This garment group is NOT scaled — it uses the documented
//     proportions directly (the mannequin itself is scaled in
//     its own module).
// ================================================================

import * as THREE from 'three';
import { createShaderMaterial, createOutline, applyPuffy } from './atelier-core.js';

export function createScarfVest() {
  const group = new THREE.Group();
  group.name = 'scarf-vest';

  // -- Materials ---------------------------------------------------
  // nylon:       dark grey (0x2a2a2a) — vest body, yoke, hem, collar
  //              points. Tight Blinn-Phong specular reads as
  //              technical padded nylon.
  // nylonLight:  lighter grey (0x383838) — scarf tube + end caps.
  //              Slightly lighter than vest for tonal contrast
  //              between the two layered nylon pieces.
  // dark nylon:  near-black (0x0a0a0a) — zipper, zipper pull,
  //              quilting seams. Reads as dark nylon hardware.
  const nylonMat = createShaderMaterial('nylon');
  const nylonLightMat = createShaderMaterial('nylonLight');
  const darkMat = createShaderMaterial('nylon', {
    baseColor: new THREE.Color(0x0a0a0a),
  });

  // -- Helper: mesh + outline sibling inside a sub-group ----------
  // Each part is a sub-group containing the mesh + an Inverted Hull
  // outline sibling, so transforms applied to the sub-group apply
  // to BOTH mesh and outline (kept in sync).
  function makePart(geometry, position, rotation, mat, thickness = 0.022) {
    const sub = new THREE.Group();
    const mesh = new THREE.Mesh(geometry, mat);
    sub.add(mesh);
    sub.add(createOutline(geometry, thickness));
    sub.position.copy(position);
    if (rotation) sub.rotation.copy(rotation);
    return sub;
  }

  // ===========================================================
  // 1. VEST TORSO BODY — heavily padded box
  //    Width 0.55 (wider than mannequin chest 0.33), depth 0.42
  //    (deeper than chest 0.24), height 1.0 (y=2.0 hem → y=3.0
  //    chest). Heavy puffy displacement (0.06, freq 4.0) for the
  //    visible padded-quilt volume per spec. 8x12x8 segments give
  //    the displacement enough vertices to read as soft padding
  //    rather than a single bulge.
  // ===========================================================
  const torsoGeo = new THREE.BoxGeometry(0.55, 1.0, 0.42, 8, 12, 8);
  applyPuffy(torsoGeo, 0.06, 4.0);
  const torso = makePart(
    torsoGeo,
    new THREE.Vector3(0, 2.50, 0),
    null,
    nylonMat,
    0.022
  );
  group.add(torso);

  // ===========================================================
  // 2. VEST YOKE — drop-shoulder panel across the top
  //    Wider than torso (0.66 vs 0.55) so it overhangs the body
  //    sides and reads as a distinct shoulder band. Same depth
  //    as torso (0.42). Height 0.13, centered at y=3.065
  //    (y=3.00 → y=3.13) — sits just above torso top, below the
  //    mannequin shoulder line (y=3.38). Lighter puffy (0.025)
  //    than torso to keep the shoulder band crisper.
  // ===========================================================
  const yokeGeo = new THREE.BoxGeometry(0.66, 0.13, 0.42, 6, 4, 6);
  applyPuffy(yokeGeo, 0.025, 5.0);
  const yoke = makePart(
    yokeGeo,
    new THREE.Vector3(0, 3.065, 0),
    null,
    nylonMat,
    0.022
  );
  group.add(yoke);

  // ===========================================================
  // 3. VEST HEM — flared bottom band
  //    Wider (0.60) and deeper (0.44) than torso (0.55 × 0.42)
  //    for a visible flared hem. Centered at y=2.0 (height 0.08:
  //    y=1.96 → y=2.04), so the band sits half above and half
  //    below the torso bottom edge — reads as a folded hem band.
  // ===========================================================
  const hemGeo = new THREE.BoxGeometry(0.60, 0.08, 0.44, 6, 3, 6);
  applyPuffy(hemGeo, 0.022, 5.0);
  const hem = makePart(
    hemGeo,
    new THREE.Vector3(0, 2.0, 0),
    null,
    nylonMat,
    0.022
  );
  group.add(hem);

  // ===========================================================
  // 4. CENTER FRONT ZIPPER — thin vertical strip
  //    Width 0.018 (very thin), height 0.85, depth 0.015.
  //    Positioned at z=0.235 — just in front of the torso's
  //    average front face (nominal z=0.21, puffy bulges the face
  //    out to ~z=0.255 in spots; zipper mostly reads as a thin
  //    dark inset strip on the front of the vest).
  //    Centered at y=2.575 (y=2.15 → y=3.00) — fits within the
  //    torso front face. Thin outline (0.010) for crisp edges.
  // ===========================================================
  const zipperGeo = new THREE.BoxGeometry(0.018, 0.85, 0.015, 1, 10, 1);
  const zipper = makePart(
    zipperGeo,
    new THREE.Vector3(0, 2.575, 0.235),
    null,
    darkMat,
    0.010
  );
  group.add(zipper);

  // ===========================================================
  // 5. ZIPPER PULL — small box at the top of the zipper
  //    Tab-sized box (0.035 × 0.05 × 0.022) sitting just above
  //    the zipper top (y=3.02) and slightly forward (z=0.255).
  //    Reads as a small metal/nylon zipper pull.
  // ===========================================================
  const pullGeo = new THREE.BoxGeometry(0.035, 0.05, 0.022, 1, 2, 1);
  const pull = makePart(
    pullGeo,
    new THREE.Vector3(0, 3.02, 0.255),
    null,
    darkMat,
    0.010
  );
  group.add(pull);

  // ===========================================================
  // 6 & 7. QUILTING SEAMS — two thin vertical strips on front
  //    Decorative black stitching lines suggesting quilted
  //    channels in the padded vest. Width 0.008, height 0.75,
  //    depth 0.012 — sits just in front of the torso's puffy
  //    face at z=0.235. Positioned at x=±0.15, between the
  //    center zipper and the side edges. Thin outline (0.008).
  // ===========================================================
  const seamGeo = new THREE.BoxGeometry(0.008, 0.75, 0.012, 1, 10, 1);

  const rSeam = makePart(
    seamGeo,
    new THREE.Vector3(0.15, 2.55, 0.235),
    null,
    darkMat,
    0.008
  );
  group.add(rSeam);

  const lSeamGeo = seamGeo.clone();
  const lSeam = makePart(
    lSeamGeo,
    new THREE.Vector3(-0.15, 2.55, 0.235),
    null,
    darkMat,
    0.008
  );
  group.add(lSeam);

  // ===========================================================
  // 8. INTEGRATED SCARF — padded tube wrapping the neck
  //    Single CatmullRomCurve3 path through the long tail
  //    (right, drops to y=1.4), the diagonal neck wrap (right
  //    shoulder front → across front → behind neck → right
  //    shoulder back → over the shoulder to front), the diagonal
  //    crossover (across the front of the neck again, going
  //    right-to-left), and the short tail (left, drops to y=2.0).
  //
  //    Topology: the scarf wraps once around the neck, then
  //    crosses itself diagonally at the front of the neck so the
  //    two tails hang on opposite sides. The crossover is the
  //    "diagonal wrap" referenced in the lookbook description.
  //
  //    Tube radius 0.10, 120 tubular segments, 12 radial
  //    segments. Slight puffy (0.025, freq 5.0) for soft padded
  //    volume. Outline thickness 0.018 (thinner than vest).
  // ===========================================================
  const scarfPoints = [
    // --- Long tail (right side) — bottom to top
    new THREE.Vector3(0.28, 1.40, 0.12),
    new THREE.Vector3(0.285, 1.90, 0.125),
    new THREE.Vector3(0.29, 2.40, 0.13),
    new THREE.Vector3(0.295, 2.80, 0.14),
    new THREE.Vector3(0.30, 3.20, 0.15),
    // --- Up to right shoulder front (joins neck wrap)
    new THREE.Vector3(0.30, 3.30, 0.18),
    // --- Across the FRONT of the neck going left
    new THREE.Vector3(0.15, 3.28, 0.235),
    new THREE.Vector3(0.00, 3.265, 0.245),
    new THREE.Vector3(-0.10, 3.255, 0.232),
    new THREE.Vector3(-0.20, 3.25, 0.22),
    // --- Around the LEFT side to BEHIND the neck
    new THREE.Vector3(-0.26, 3.27, 0.10),
    new THREE.Vector3(-0.28, 3.285, -0.05),
    new THREE.Vector3(-0.20, 3.30, -0.18),
    // --- Across the BACK to the right shoulder back
    new THREE.Vector3(0.00, 3.28, -0.22),
    new THREE.Vector3(0.15, 3.265, -0.18),
    new THREE.Vector3(0.30, 3.25, -0.10),
    // --- OVER the right shoulder back to front (closes neck wrap)
    new THREE.Vector3(0.335, 3.275, 0.00),
    new THREE.Vector3(0.325, 3.29, 0.10),
    new THREE.Vector3(0.305, 3.305, 0.185),
    // --- CROSSOVER front going right-to-left (scarf crosses
    //     itself — this is the "diagonal wrap" crossover)
    new THREE.Vector3(0.15, 3.27, 0.25),
    new THREE.Vector3(0.00, 3.25, 0.245),
    new THREE.Vector3(-0.15, 3.225, 0.18),
    new THREE.Vector3(-0.30, 3.20, 0.05),
    // --- Short tail (left side) — top to bottom
    new THREE.Vector3(-0.305, 2.80, 0.048),
    new THREE.Vector3(-0.31, 2.40, 0.045),
    new THREE.Vector3(-0.32, 2.00, 0.04),
  ];

  const scarfCurve = new THREE.CatmullRomCurve3(scarfPoints);
  const scarfGeo = new THREE.TubeGeometry(scarfCurve, 120, 0.10, 12, false);
  applyPuffy(scarfGeo, 0.025, 5.0);

  const scarf = makePart(
    scarfGeo,
    new THREE.Vector3(0, 0, 0),
    null,
    nylonLightMat,
    0.018
  );
  group.add(scarf);

  // ===========================================================
  // 8b. SCARF END CAPS — small spheres closing the tube ends
  //     TubeGeometry(closed=false) leaves the start and end of
  //     the tube as open circular holes. Two small spheres
  //     (radius 0.105, slightly larger than tube radius 0.10 to
  //     ensure full coverage) close the openings at the bottom
  //     of the long tail and the bottom of the short tail.
  //     Light puffy (0.02) matches the tube's padded look.
  // ===========================================================
  const capGeo = new THREE.SphereGeometry(0.105, 16, 12);
  applyPuffy(capGeo, 0.02, 5.0);

  const cap1 = makePart(
    capGeo,
    scarfPoints[0].clone(),
    null,
    nylonLightMat,
    0.018
  );
  group.add(cap1);

  const cap2Geo = capGeo.clone();
  const cap2 = makePart(
    cap2Geo,
    scarfPoints[scarfPoints.length - 1].clone(),
    null,
    nylonLightMat,
    0.018
  );
  group.add(cap2);

  // ===========================================================
  // 9. COLLAR POINTS (optional) — two small vest-material flaps
  //    where the scarf visually attaches to the top of the vest.
  //    Suggest a collar stand framing where the long tail (right)
  //    and short tail (left) emerge from the neckline. Box
  //    (0.10 × 0.05 × 0.12), tilted forward+outward so the inner
  //    edge sits under the scarf wrap.
  // ===========================================================
  const collarGeo = new THREE.BoxGeometry(0.10, 0.05, 0.12, 2, 2, 2);
  applyPuffy(collarGeo, 0.008, 4.0);

  const rCollar = makePart(
    collarGeo,
    new THREE.Vector3(0.22, 3.08, 0.12),
    new THREE.Euler(-0.20, -0.20, 0),
    nylonMat,
    0.018
  );
  group.add(rCollar);

  const lCollarGeo = collarGeo.clone();
  const lCollar = makePart(
    lCollarGeo,
    new THREE.Vector3(-0.22, 3.08, 0.12),
    new THREE.Euler(-0.20, 0.20, 0),
    nylonMat,
    0.018
  );
  group.add(lCollar);

  return group;
}
