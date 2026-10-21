import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, transition as t, targetFor, fit, canRun, getHint, poseFor, ORDER, BOUNDS, BENCH_Y, PIN_TRAVEL } from '../src/subassembly.js';
import { linkage, MECHANICS } from '../src/mechanics.js';
const act = (s, ...actions) => actions.reduce(t, s);
function place(s, id, target = targetFor(s, id), roll = 0) {
  s = t(s, { type: 'begin', part: id });
  s = t(s, { type: 'move', ...target });
  s = t(s, { type: 'rotate', delta: roll - s.parts[s.drag.part].roll });
  return t(s, { type: 'drop' });
}
function fitted(s = initialState()) { return place(s, 'rod', targetFor(s, 'rod'), s.parts.piston.roll); }
function pinned(s = fitted()) {
  s = place(s, 'pin');
  return act(s, { type: 'begin', part: 'pin' }, { type: 'insert', depth: 1 }, { type: 'drop' });
}
function complete() { let s = place(pinned(), 'piston'); return place(s, 'rodCap'); }

test('separate start, wrong order and ordinary drops never fabricate a joint', () => {
  let s = initialState();
  assert.equal(s.parts.pin.depth, 0);
  assert.ok(ORDER.every(id => s.parts[id].status === 'loose'));
  s = place(s, 'piston'); assert.equal(s.parts.piston.status, 'loose');
  s = place(s, 'pin'); assert.equal(s.parts.pin.status, 'loose');
  s = place(s, 'rodCap'); assert.equal(s.parts.rodCap.status, 'loose');
  assert.equal(canRun(s), false);
});

test('rod target follows freely repositioned and rotated piston; wrong roll fails', () => {
  let s = place(initialState(), 'piston', { x: 3.1, z: 3.8 }, 45);
  assert.deepEqual(targetFor(s, 'rod'), { x: 3.1, z: 3.8 });
  s = place(s, 'rod', targetFor(s, 'rod'), 135);
  assert.equal(s.parts.rod.status, 'loose'); assert.equal(fit(s, 'rod').reason, 'orientation');
  s = fitted(s); assert.equal(s.parts.rod.status, 'fitted');
  s = place(s, 'pin'); assert.equal(s.parts.pin.status, 'aligned');
  assert.equal(s.parts.pin.depth, 0); assert.equal(s.parts.rod.status, 'fitted');
});

test('temporary fit separates on movement without teleporting independently loose parts', () => {
  let s = place(fitted(), 'pin'); const rod = { ...s.parts.rod }, pin = { ...s.parts.pin };
  s = act(s, { type: 'begin', part: 'piston' }, { type: 'move', x: -1, z: 2 });
  assert.equal(s.parts.rod.status, 'loose'); assert.equal(s.parts.pin.status, 'loose');
  assert.equal(s.parts.rod.x, rod.x); assert.equal(s.parts.rod.z, rod.z);
  assert.equal(s.parts.pin.x, pin.x); assert.equal(s.parts.pin.z, pin.z);
  let r = act(fitted(), { type: 'begin', part: 'rod' }, { type: 'move', x: 0, z: 0 });
  assert.equal(r.parts.piston.x, initialState().parts.piston.x);
  assert.equal(r.parts.rod.status, 'loose');
});

test('pin requires a second axial drag and continuous complete insertion', () => {
  let s = place(fitted(), 'pin');
  s = act(s, { type: 'begin', part: 'pin' }, { type: 'drop' });
  assert.equal(s.parts.pin.status, 'aligned');
  s = act(s, { type: 'begin', part: 'pin' }, { type: 'move', x: -4, z: -4 }, { type: 'insert', depth: .6 }, { type: 'drop' });
  assert.equal(s.parts.pin.status, 'aligned'); assert.equal(s.parts.pin.depth, .6);
  assert.equal(s.parts.pin.x, s.parts.piston.x);
  assert.equal(canRun(s), false);
  s = act(s, { type: 'begin', part: 'pin' }, { type: 'insert', depth: .92 }, { type: 'drop' });
  assert.equal(s.parts.pin.status, 'pinned'); assert.equal(s.parts.pin.depth, 1);
});

test('any pinned component carries the unit, bounds apply, pivot keeps wrist and length fixed', () => {
  for (const id of ['piston', 'rod', 'pin']) {
    let s = t(pinned(), { type: 'begin', part: id });
    assert.equal(s.drag.part, 'piston'); assert.equal(s.selected, id);
    s = act(s, { type: 'move', x: 20, z: 20 }, { type: 'drop' });
    for (const part of ['piston', 'rod', 'pin']) {
      assert.equal(s.parts[part].x, BOUNDS.maxX); assert.equal(s.parts[part].z, BOUNDS.maxZ);
    }
    s = t(s, { type: 'pivot', delta: 60 });
    const pose = poseFor(s, 'rod');
    assert.ok(Math.abs(Math.hypot(pose.bigEnd.x - s.parts.piston.x, pose.bigEnd.z - s.parts.piston.z) - MECHANICS.rodLength) < 1e-10);
    assert.equal(pose.x, s.parts.piston.x); assert.equal(pose.z, s.parts.piston.z);
  }
});

test('unit must align its roll and pivot before installation', () => {
  let s = t(pinned(), { type: 'pivot', delta: 30 });
  s = place(s, 'piston'); assert.equal(s.parts.piston.status, 'loose'); assert.equal(fit(s, 'piston').reason, 'pivot');
  s = t(s, { type: 'pivot', delta: -30 });
  s = place(s, 'piston', targetFor(s, 'piston'), 30); assert.equal(s.parts.piston.status, 'loose');
  s = place(s, 'piston'); assert.equal(s.parts.piston.status, 'installed');
  assert.equal(canRun(s), false); s = place(s, 'rodCap'); assert.equal(canRun(s), true);
});

test('cancel and undo restore exact transaction snapshot paused, including partial insertion', () => {
  let s = place(fitted(), 'pin');
  s = act(s, { type: 'begin', part: 'pin' }, { type: 'insert', depth: .4 }, { type: 'drop' });
  const before = structuredClone(s);
  const moving = act(s, { type: 'begin', part: 'pin' }, { type: 'insert', depth: 1 });
  assert.deepEqual(t(moving, { type: 'cancel' }), before);
  assert.deepEqual(t(t(moving, { type: 'drop' }), { type: 'undo' }), before);
  const running = t(complete(), { type: 'toggle-play' });
  const lifted = t(running, { type: 'begin', part: 'rod' });
  assert.equal(lifted.parts.piston.status, 'loose'); assert.equal(lifted.parts.rodCap.status, 'loose');
  assert.deepEqual(t(lifted, { type: 'cancel' }), { ...running, playing: false });
});

test('full motion preserves linkage and all recovery paths are coherent', () => {
  let s = complete();
  for (let i = 0; i < 24; i++) {
    s = t(s, { type: 'step' });
    const link = linkage(s.angle);
    assert.ok(Math.abs(Math.hypot(...link.wristpin.map((v, i) => v - link.crankpin[i])) - MECHANICS.rodLength) < 1e-10);
  }
  assert.equal(s.tested, true);
  const noCap = t(s, { type: 'remove', part: 'rodCap' });
  assert.equal(noCap.parts.piston.status, 'installed'); assert.equal(noCap.parts.pin.status, 'pinned'); assert.equal(noCap.angle, 0);
  const unit = t(s, { type: 'remove', part: 'pin' });
  assert.equal(unit.parts.piston.status, 'loose'); assert.equal(unit.parts.pin.status, 'pinned');
  assert.equal(unit.parts.rodCap.status, 'loose');
  const unpinned = t(s, { type: 'unpin' });
  assert.equal(unpinned.parts.piston.status, 'loose'); assert.equal(unpinned.parts.rod.status, 'fitted');
  assert.equal(unpinned.parts.pin.status, 'loose'); assert.equal(unpinned.parts.rodCap.status, 'loose');
  assert.equal(unpinned.parts.rod.x, unpinned.parts.piston.x);
  assert.equal(canRun(complete()), true);
  assert.deepEqual(t(s, { type: 'reset' }), initialState());
});

test('optional hints progress only on request, dynamically follow piston, history bounded', () => {
  let s = initialState(); assert.equal(getHint(s).level, 0); assert.equal(getHint(s).target, undefined);
  s = act(s, { type: 'hint' }, { type: 'hint' }, { type: 'hint' });
  s = place(s, 'piston', { x: -3, z: 3 });
  assert.deepEqual(getHint(s).target, { x: -3, z: 3 });
  for (let i = 0; i < 70; i++) s = t(s, { type: 'rotate', delta: 15 });
  assert.equal(s.history.length, 50);
});


test('pin axial height follows its state and installed cap cannot rotate until lifted', () => {
  let s = initialState();
  assert.equal(poseFor(s, 'pin').y, BENCH_Y);
  s = t(s, { type: 'select', part: 'pin' });
  assert.equal(t(s, { type: 'rotate', delta: 15 }), s, 'prepared pin axis does not accept a fake roll');
  s = place(fitted(s), 'pin');
  assert.equal(poseFor(s, 'pin').y, BENCH_Y + PIN_TRAVEL);
  s = act(s, { type: 'begin', part: 'pin' }, { type: 'insert', depth: .5 }, { type: 'drop' });
  assert.equal(poseFor(s, 'pin').y, BENCH_Y + PIN_TRAVEL * .5);
  s = act(s, { type: 'begin', part: 'pin' }, { type: 'insert', depth: 1 }, { type: 'drop' });
  assert.equal(poseFor(s, 'pin').y, BENCH_Y);
  s = t(complete(), { type: 'select', part: 'rodCap' });
  assert.equal(t(s, { type: 'rotate', delta: 30 }), s);
  s = t(s, { type: 'begin', part: 'rodCap' });
  const roll = s.parts.rodCap.roll;
  s = t(s, { type: 'rotate', delta: 30 });
  assert.equal(s.parts.rodCap.roll, roll + 30);
});


test('initial rod angle fits without rotation and pinning preserves the chosen swing', () => {
  const start = initialState();
  let s = act(start, { type: 'begin', part: 'rod' }, { type: 'move', ...targetFor(start, 'rod') });
  assert.equal(fit(s, 'rod').ready, true);
  const beforeDrop = s;
  s = t(s, { type: 'drop' });
  assert.equal(s.parts.rod.status, 'fitted'); assert.equal(s.parts.rod.roll, 30);
  assert.equal(s.pivot, 30); assert.equal(poseFor(s, 'rod').roll, 30);
  assert.equal(s.feedback, 'Rod fitted in piston. Slide the separate wrist pin through to hold it.');
  assert.deepEqual(t(s, { type: 'undo' }), start);
  assert.deepEqual(t(beforeDrop, { type: 'cancel' }), start);
  const fittedState = s;
  s = pinned(s);
  assert.equal(s.pivot, 30); assert.equal(s.parts.rod.roll, 30); assert.equal(poseFor(s, 'rod').roll, 30);
  assert.equal(s.parts.rod.x, s.parts.piston.x); assert.equal(s.parts.rod.z, s.parts.piston.z);
  s = t(s, { type: 'unpin' });
  assert.equal(s.parts.rod.status, 'fitted'); assert.equal(s.pivot, 30); assert.equal(s.parts.rod.roll, 30);
  const moved = act(s, { type: 'begin', part: 'piston' }, { type: 'move', x: 2, z: 2 });
  assert.equal(moved.parts.rod.status, 'loose'); assert.equal(moved.parts.rod.roll, 30); assert.equal(moved.pivot, 0);
  assert.equal(fittedState.parts.rod.roll, 30, 'transitions do not mutate prior snapshots');
});

test('rod supports either 65 degree swing boundary and explains excessive angle', () => {
  for (const roll of [-65, 65]) {
    const s = place(initialState(), 'rod', undefined, roll);
    assert.equal(s.parts.rod.status, 'fitted'); assert.equal(s.pivot, roll);
  }
  let s = place(initialState(), 'rod', undefined, 90);
  assert.equal(s.parts.rod.status, 'loose'); assert.equal(fit(s, 'rod').reason, 'orientation');
  assert.equal(fit(s, 'rod').degreesNeeded, 25);
  assert.match(fit(s, 'rod').message, /piston skirt.*25°/);
  assert.match(fit(initialState(), 'rod').message, /small round eye.*open big end/);
  s = place(initialState(), 'piston', { x: 2, z: 3 }, 45);
  s = place(s, 'rod', undefined, 90);
  assert.equal(s.parts.rod.status, 'fitted'); assert.equal(s.pivot, 45);
  assert.equal(poseFor(s, 'rod').roll, 90);
  s = pinned(s);
  assert.equal(s.pivot, 45); assert.equal(s.parts.rod.roll, 90);
  s = t(s, { type: 'pivot', delta: -15 });
  assert.equal(s.pivot, 30); assert.equal(s.parts.rod.roll, 75);
  s = t(s, { type: 'unpin' });
  assert.equal(s.pivot, 30); assert.equal(s.parts.rod.roll, 75); assert.equal(poseFor(s, 'rod').roll, 75);
});


test('rod nearby guidance includes a mistaken big-end placement without widening the fit', () => {
  let s = initialState();
  const target = targetFor(s, 'rod');
  s = place(s, 'rod', { x: target.x, z: target.z + MECHANICS.rodLength });
  const result = fit(s, 'rod');
  assert.equal(result.near, true); assert.equal(result.ready, false); assert.equal(result.reason, 'position');
  assert.match(result.message, /small round eye.*open big end/);
  s = place(s, 'rod', { x: target.x, z: target.z + .31 });
  assert.equal(fit(s, 'rod').ready, false);
  s = place(s, 'rod', { x: target.x, z: target.z + .3 });
  assert.equal(s.parts.rod.status, 'fitted');
});
