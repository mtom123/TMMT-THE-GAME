// ================================================================
// MANNEQUIN — fashion proportions, editorial pose
// Less stickman, more sculpture
// ================================================================
//
// Coordinate system:
//   Feet at y=0, head top at y≈3.6
//   Faces +Z (front)
//   Slight contrapposto: weight on right leg, left hip dropped
//   Arms slightly out from body, relaxed
// ================================================================

import * as THREE from 'three';
import { createShaderMaterial, createOutline, applyPuffy } from './atelier-core.js';

export function createMannequin() {
  const group = new THREE.Group();
  group.name = 'mannequin';

  // Mannequin material: warm bronze-grey, cel-shaded
  // Using a custom preset inline (nylon-like but warmer)
  const skinMat = createShaderMaterial('nylon', {
    baseColor: new THREE.Color(0x6a5a4a),
    shadowColor: new THREE.Color(0x2a2218),
    bands: 3.0,
    specIntensity: 0.2,
    specShininess: 20.0,
    specThreshold: 0.85,
    type: 0,
  });

  // Helper to create a mesh + outline pair
  function makePart(geometry, position, rotation, thickness = 0.018) {
    const sub = new THREE.Group();
    const mesh = new THREE.Mesh(geometry, skinMat);
    sub.add(mesh);
    const outline = createOutline(geometry, thickness);
    sub.add(outline);
    sub.position.copy(position);
    if (rotation) sub.rotation.copy(rotation);
    return sub;
  }

  // ----- LEGS (with knees, slight contrapposto) -----
  // Right leg (weight-bearing, straight)
  const rThighGeo = new THREE.CylinderGeometry(0.105, 0.09, 0.95, 14, 8);
  const rThigh = makePart(rThighGeo, new THREE.Vector3(0.13, 2.55, 0));
  group.add(rThigh);

  const rCalfGeo = new THREE.CylinderGeometry(0.085, 0.06, 0.95, 14, 8);
  const rCalf = makePart(rCalfGeo, new THREE.Vector3(0.13, 1.55, 0.02));
  group.add(rCalf);

  // Right foot
  const rFootGeo = new THREE.BoxGeometry(0.13, 0.07, 0.27);
  const rFoot = makePart(rFootGeo, new THREE.Vector3(0.13, 0.06, 0.06));
  group.add(rFoot);

  // Left leg (relaxed, slight outward)
  const lThighGeo = new THREE.CylinderGeometry(0.105, 0.09, 0.95, 14, 8);
  const lThigh = makePart(lThighGeo, new THREE.Vector3(-0.14, 2.55, 0), new THREE.Euler(0, 0, -0.04));
  group.add(lThigh);

  const lCalfGeo = new THREE.CylinderGeometry(0.085, 0.06, 0.92, 14, 8);
  const lCalf = makePart(lCalfGeo, new THREE.Vector3(-0.16, 1.56, 0.02), new THREE.Euler(0, 0, 0.04));
  group.add(lCalf);

  // Left foot
  const lFootGeo = new THREE.BoxGeometry(0.13, 0.07, 0.27);
  const lFoot = makePart(lFootGeo, new THREE.Vector3(-0.17, 0.06, 0.06));
  group.add(lFoot);

  // ----- PELVIS -----
  const pelvisGeo = new THREE.BoxGeometry(0.45, 0.28, 0.32, 8, 6, 6);
  applyPuffy(pelvisGeo, 0.012, 4.0);
  const pelvis = makePart(pelvisGeo, new THREE.Vector3(0, 3.05, 0), null, 0.02);
  group.add(pelvis);

  // ----- TORSO (tapered, fashion proportions) -----
  // Tapered cylinder from hips to chest, wider at shoulders
  const torsoGeo = new THREE.CylinderGeometry(0.21, 0.24, 1.15, 18, 12);
  applyPuffy(torsoGeo, 0.015, 3.5);
  const torso = makePart(torsoGeo, new THREE.Vector3(0, 3.7, 0), null, 0.02);
  group.add(torso);

  // Pectoral / chest volume (slight)
  const chestGeo = new THREE.BoxGeometry(0.42, 0.32, 0.3, 8, 6, 6);
  applyPuffy(chestGeo, 0.018, 3.5);
  const chest = makePart(chestGeo, new THREE.Vector3(0, 4.15, 0.02), null, 0.02);
  group.add(chest);

  // ----- SHOULDERS -----
  // Wide, sculpted shoulder line
  const shoulderGeo = new THREE.BoxGeometry(0.72, 0.18, 0.32, 10, 4, 6);
  applyPuffy(shoulderGeo, 0.018, 3.5);
  const shoulders = makePart(shoulderGeo, new THREE.Vector3(0, 4.4, 0), null, 0.022);
  group.add(shoulders);

  // ----- NECK -----
  const neckGeo = new THREE.CylinderGeometry(0.085, 0.1, 0.22, 12, 4);
  const neck = makePart(neckGeo, new THREE.Vector3(0, 4.6, 0));
  group.add(neck);

  // ----- HEAD -----
  // Slightly elongated, fashion proportions (smaller relative to body)
  const headGeo = new THREE.SphereGeometry(0.16, 18, 16);
  // Slight squash for oval shape
  const headPos = headGeo.attributes.position;
  for (let i = 0; i < headPos.count; i++) {
    const y = headPos.getY(i);
    headPos.setY(i, y * 1.15);
  }
  headPos.needsUpdate = true;
  headGeo.computeVertexNormals();
  const head = makePart(headGeo, new THREE.Vector3(0, 4.85, 0.01), null, 0.018);
  group.add(head);

  // ----- ARMS (with elbows, relaxed pose) -----
  // Right arm (slightly out, hand near hip)
  const rUpperArmGeo = new THREE.CylinderGeometry(0.062, 0.055, 0.65, 10, 6);
  const rUpperArm = makePart(rUpperArmGeo, new THREE.Vector3(0.43, 4.05, 0), new THREE.Euler(0, 0, -0.1));
  group.add(rUpperArm);

  const rForearmGeo = new THREE.CylinderGeometry(0.055, 0.05, 0.65, 10, 6);
  const rForearm = makePart(rForearmGeo, new THREE.Vector3(0.49, 3.4, 0.02), new THREE.Euler(0, 0, -0.06));
  group.add(rForearm);

  // Right hand (simple box)
  const rHandGeo = new THREE.BoxGeometry(0.08, 0.13, 0.05);
  const rHand = makePart(rHandGeo, new THREE.Vector3(0.51, 3.0, 0.04), null, 0.014);
  group.add(rHand);

  // Left arm (mirrored)
  const lUpperArmGeo = new THREE.CylinderGeometry(0.062, 0.055, 0.65, 10, 6);
  const lUpperArm = makePart(lUpperArmGeo, new THREE.Vector3(-0.43, 4.05, 0), new THREE.Euler(0, 0, 0.1));
  group.add(lUpperArm);

  const lForearmGeo = new THREE.CylinderGeometry(0.055, 0.05, 0.65, 10, 6);
  const lForearm = makePart(lForearmGeo, new THREE.Vector3(-0.49, 3.4, 0.02), new THREE.Euler(0, 0, 0.06));
  group.add(lForearm);

  const lHandGeo = new THREE.BoxGeometry(0.08, 0.13, 0.05);
  const lHand = makePart(lHandGeo, new THREE.Vector3(-0.51, 3.0, 0.04), null, 0.014);
  group.add(lHand);

  // Scale down to match coordinate system documented in worklog
  // (originally built at 2x scale for easier mesh editing)
  group.scale.setScalar(0.78);
  group.position.y = -0.05;

  return group;
}
