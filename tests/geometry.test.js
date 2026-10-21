import test from 'node:test';
import assert from 'node:assert/strict';
import { DoubleSide, Raycaster, Vector3 } from 'three';
import { createEngine } from '../src/engine.js';

function model() {
  const engine = createEngine();
  engine.group.updateMatrixWorld(true);
  // Test solid occlusion from either side, independent of face winding.
  engine.group.traverse(object => {
    if (object.isMesh) object.material.side = DoubleSide;
  });
  return engine;
}

function hits(objects, origin, direction, distance) {
  const ray = new Raycaster(new Vector3(...origin), new Vector3(...direction), 0, distance);
  return ray.intersectObjects(objects, true);
}

test('generated engine geometry has finite positions and valid mesh data', () => {
  const engine = model();
  let meshCount = 0;
  engine.group.traverse(object => {
    if (!object.isMesh) return;
    meshCount++;
    const positions = object.geometry.getAttribute('position');
    assert.ok(positions.count > 0);
    assert.equal(positions.count % 3, 0);
    for (const value of positions.array) assert.ok(Number.isFinite(value));
  });
  assert.ok(meshCount > 0);
});

test('assembled rod and cap leave the crankpin bore clear from both axial sides', () => {
  const engine = model();
  // Include the previously obstructed beam and bolt-ear locations explicitly.
  const points = [[0, 0], [0, .16], [.15, .04], [-.15, .04]];
  for (const radius of [.08, .14, .1649]) {
    for (let i = 0; i < 32; i++) {
      const angle = i * Math.PI / 16;
      points.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
    }
  }
  for (const [x, y] of points) {
    for (const side of [-1, 1]) {
      assert.equal(hits([engine.rod, engine.rodCap], [x, y, side * .3], [0, 0, -side], .6).length,
        0, `Crankpin obstructed at (${x}, ${y}), axial side ${side}`);
    }
  }
  // Positive controls prevent a missing or empty bearing from passing the test.
  for (const side of [-1, 1]) {
    assert.ok(hits([engine.rod], [0, .21, side * .3], [0, 0, -side], .6).length);
    assert.ok(hits([engine.rodCap], [0, -.21, side * .3], [0, 0, -side], .6).length);
  }
});

test('main bearing caps complete open fixed saddles without blocking the journal', () => {
  const engine = model();
  for (const z of [-1.64, -.8, 0, .8, 1.64]) {
    // Fixed saddles admit the journal from below, and the caps fill that opening.
    assert.equal(hits([engine.block], [0, -.3, z], [0, 1, 0], .3).length, 0);
    assert.ok(hits([engine.mainCaps], [0, -.3, z], [0, 1, 0], .3).length);
    assert.ok(hits([engine.block], [0, 0, z], [0, 1, 0], .3).length);
    // A .22-radius main journal fits the assembled bearing cross-section.
    for (let i = 0; i < 16; i++) {
      const angle = i * Math.PI / 8;
      const x = .2199 * Math.cos(angle), y = .2199 * Math.sin(angle);
      // Isolate the saddle's axial span from the separate front timing cover.
      assert.equal(hits([engine.block, engine.mainCaps], [x, y, z - .099], [0, 0, 1], .198).length,
        0, `Main bearing obstructed at station ${z}, sample ${i}`);
    }
  }
});

test('front cover and saddle clear the complete front main journal volume', () => {
  const engine = model();
  // The front main journal extends beyond its saddle into the timing-cover
  // bevel. Scan that complete axial span, including the previous collision.
  const points = [[0, 0]];
  for (const radius of [.15, .2199]) {
    for (let i = 0; i < 48; i++) {
      const angle = i * Math.PI / 24;
      points.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
    }
  }
  for (const [x, y] of points) {
    for (const side of [-1, 1]) {
      const start = side === 1 ? -1.76 : -1.52;
      assert.equal(hits([engine.block, engine.mainCaps], [x, y, start], [0, 0, side], .24).length,
        0, `Front journal obstructed at (${x}, ${y}), axial side ${side}`);
    }
  }
  // The cover is present outside the opening; this is not a hidden-cover test.
  assert.ok(hits([engine.block], [.4, 0, -2.1], [0, 0, 1], .5).length);
});

test('piston has actual open wrist bores and its separate pin fits both ends', () => {
  const engine = model();
  assert.ok(engine.wristPin?.isGroup);
  assert.ok(engine.pickables.some(p => p.object === engine.wristPin && p.part === 'pin'));
  const points = [[0, 0]];
  for (const radius of [.05, .0749, .077]) {
    for (let i = 0; i < 32; i++) {
      const a = i * Math.PI / 16;
      points.push([Math.cos(a) * radius, Math.sin(a) * radius]);
    }
  }
  for (const [x, y] of points) for (const side of [-1, 1]) {
    assert.equal(hits([engine.piston], [x, y, .5 * side], [0, 0, -side], 1).length, 0,
      `Piston wrist bore blocked at ${x}, ${y}, side ${side}`);
    assert.equal(hits([engine.rod], [x, y + 1.45, .3 * side], [0, 0, -side], .6).length, 0,
      `Rod wrist bore blocked at ${x}, ${y}, side ${side}`);
  }
  for (const side of [-1, 1]) {
    assert.ok(hits([engine.piston], [.1, 0, .5 * side], [0, 0, -side], 1).length, 'Boss rim must remain present');
    assert.ok(hits([engine.wristPin], [0, 0, .5 * side], [0, 0, -side], 1).length, 'Separate solid pin must remain present');
  }
  engine.wristPin.children[0].geometry.computeBoundingBox();
  const bounds = engine.wristPin.children[0].geometry.boundingBox;
  assert.ok(Math.abs(bounds.max.z - bounds.min.z - .57) < 1e-6);
  assert.ok(Math.abs(bounds.max.x - .075) < 1e-6);
});
