import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPilotEngine, PILOT_DIMENSIONS } from '../src/pilot-model.js';
import { linkage, MECHANICS } from '../src/mechanics.js';

test('focused model is finite, bounded, economical and has independent component materials', () => {
  const model = createPilotEngine();
  const owners = new Map(); let triangles = 0, meshes = 0;
  for (const part of [model.block, model.crankshaft, model.piston, model.rod, model.rodCap, model.wristPin]) {
    part.traverse(object => {
      if (!object.isMesh) return;
      meshes++;
      const p = object.geometry.attributes.position;
      for (let i = 0; i < p.array.length; i++) assert.ok(Number.isFinite(p.array[i]));
      triangles += object.geometry.index ? object.geometry.index.count / 3 : p.count / 3;
      assert.ok(!owners.has(object.material) || owners.get(object.material) === part, 'highlight materials belong to one component');
      owners.set(object.material, part);
      assert.equal(object.castShadow, false);
    });
  }
  assert.ok(triangles < 80000, `${triangles} triangles`);
  assert.ok(meshes <= 60, `${meshes} draws`);
  const blockBounds = new THREE.Box3().setFromObject(model.block);
  assert.ok(blockBounds.max.z - blockBounds.min.z < 2, 'one cylinder section, not an eight-cylinder block');
  assert.ok(blockBounds.max.y - blockBounds.min.y < 3.5);
  model.setSection(false);
  assert.ok(model.sectionParts.length >= 2);
  assert.ok(model.sectionParts.every(object => object.visible));
  model.setSection(true);
  assert.ok(model.sectionParts.every(object => !object.visible));
});
test('real geometry preserves piston clearance, hollow pin and joint centers through a revolution', () => {
  const model = createPilotEngine(), d = PILOT_DIMENSIONS;
  assert.ok(d.pistonRadius < d.boreRadius);
  assert.ok(d.wristPinRadius < d.wristBoreRadius);
  assert.ok(d.crankJournalRadius < d.rodBoreRadius);
  const pistonBox = new THREE.Box3().setFromObject(model.piston);
  assert.ok(pistonBox.max.x <= d.boreRadius && pistonBox.min.x >= -d.boreRadius);
  const pinPositions = model.wristPin.children[0].geometry.attributes.position;
  let pinMinRadius = Infinity;
  for (let i = 0; i < pinPositions.count; i++) pinMinRadius = Math.min(pinMinRadius, Math.hypot(pinPositions.getX(i), pinPositions.getY(i)));
  assert.ok(pinMinRadius > .048, 'pin has an open center, not a solid capped cylinder');
  model.group.updateMatrixWorld(true);
  for (const part of [model.piston, model.rod, model.wristPin]) part.traverse(object => { if (object.isMesh) object.material.side = THREE.DoubleSide; });
  // Probe inside the polygonal bore, not beyond its inscribed clearance.
  for (const side of [-1, 1]) {
    for (const radius of [0, .048, .0749]) for (let sample = 0; sample < 16; sample++) {
      const angle = sample * Math.PI / 8, x = radius * Math.cos(angle), y = radius * Math.sin(angle);
      const ray = new THREE.Raycaster(new THREE.Vector3(x, y, side * .5), new THREE.Vector3(0, 0, -side), 0, 1);
      assert.equal(ray.intersectObject(model.piston, true).length, 0, 'piston wrist bore admits the pin from both ends');
      ray.ray.origin.y += MECHANICS.rodLength;
      assert.equal(ray.intersectObject(model.rod, true).length, 0, 'rod small end admits the pin from both ends');
      if (radius < .049) {
        ray.ray.origin.y -= MECHANICS.rodLength;
        assert.equal(ray.intersectObject(model.wristPin, true).length, 0, 'pin bore remains genuinely open');
      }
    }
  }
  for (let i = 0; i < 360; i++) {
    const angle = i * Math.PI / 180, pose = linkage(angle);
    model.crankshaft.rotation.z = -angle;
    model.piston.position.fromArray(pose.wristpin); model.piston.rotation.z = -MECHANICS.bankAngle;
    model.wristPin.position.copy(model.piston.position);
    model.rod.position.fromArray(pose.crankpin);
    model.rod.rotation.z = -Math.atan2(pose.wristpin[0] - pose.crankpin[0], pose.wristpin[1] - pose.crankpin[1]);
    model.group.updateMatrixWorld(true);
    const crankJoint = model.crankshaft.localToWorld(new THREE.Vector3(0, MECHANICS.radius, MECHANICS.station));
    const rodTop = model.rod.localToWorld(new THREE.Vector3(0, d.rodLength, 0));
    assert.ok(crankJoint.distanceTo(new THREE.Vector3(...pose.crankpin)) < 1e-12);
    assert.ok(rodTop.distanceTo(model.piston.position) < 1e-12);
    assert.ok(model.wristPin.position.distanceTo(model.piston.position) < 1e-12);
  }
});

test('section view clears the crankpin sightline through a full turn and restores near support in full view', () => {
  const model = createPilotEngine();
  model.group.updateMatrixWorld(true);
  const viewDirection = new THREE.Vector3(3.2, 2.2, 7).normalize();
  const ray = new THREE.Raycaster();
  function blockedPositions(section) {
    model.setSection(section);
    const casting = [];
    model.block.traverse(object => { if (object.isMesh && object.visible) casting.push(object); });
    let blocked = 0;
    for (let degree = 0; degree < 360; degree++) {
      const crankpin = new THREE.Vector3(...linkage(degree * Math.PI / 180).crankpin);
      const origin = crankpin.clone().addScaledVector(viewDirection, 10);
      ray.set(origin, viewDirection.clone().negate());
      ray.far = 9.999;
      if (ray.intersectObjects(casting, false).length) blocked++;
    }
    return blocked;
  }
  assert.equal(blockedPositions(true), 0, 'prepared block cannot hide the moving crankpin center');
  assert.ok(blockedPositions(false) > 0, 'full view restores the camera-facing support casting');
  model.setSection(true);
  const supportRay = new THREE.Raycaster(new THREE.Vector3(-.45, -.25, 1.2), new THREE.Vector3(0, 0, -1), 0, 1);
  const visibleBlock = model.block.children.filter(object => object.isMesh && object.visible);
  assert.ok(supportRay.intersectObjects(visibleBlock, false).length > 0, 'far support remains as readable block context');
});
