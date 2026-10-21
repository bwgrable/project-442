import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, transition, PARTS, ORDER, BOUNDS, SNAP_RADIUS, ANGLE_TOLERANCE, NEAR_RADIUS, canRun, fit, getHint, getStage } from '../src/pile.js';

const TURN = 2 * Math.PI;
const run = (state, ...actions) => actions.reduce(transition, state);
function place(state, part, offset = {}, roll = 0) {
  state = transition(state, { type: 'begin', part });
  state = transition(state, { type: 'rotate', delta: roll - state.parts[part].roll });
  return run(state, { type: 'move', ...PARTS[part].target, ...offset }, { type: 'drop' });
}
const assembly = () => ORDER.reduce((state, id) => place(state, id), initialState());
const physical = state => ({ parts: state.parts, angle: state.angle, travel: state.travel, tested: state.tested });

test('opening invites dragging and tapping never installs any of the four available parts', () => {
  const original = initialState();
  assert.equal(original.selected, null);
  assert.equal(getHint(original).level, 0);
  assert.match(original.feedback, /Grab|move/);
  assert.equal(Object.keys(PARTS).length, 4);
  for (const part of ORDER) {
    const state = run(original, { type: 'select', part }, { type: 'drop' });
    assert.deepEqual(state.parts, original.parts);
    assert.equal(state.selected, part);
    assert.equal(state.history.length, 0);
  }
  original.parts.crank.x = 99;
  assert.equal(initialState().parts.crank.x, -2.8);
});

test('a complete journey moves continuously, snaps on release and keeps explicit selection', () => {
  let state = initialState();
  for (const id of ORDER) {
    assert.equal(getStage(state), id);
    const before = state.parts[id].x;
    state = run(state, { type: 'begin', part: id }, { type: 'move', x: before + .1, z: 1 });
    assert.equal(state.parts[id].x, before + .1);
    assert.equal(state.parts[id].status, 'loose');
    state = run(state, { type: 'move', ...PARTS[id].target }, { type: 'rotate', delta: -state.parts[id].roll });
    assert.equal(fit(state).ready, true);
    assert.equal(state.parts[id].status, 'loose');
    state = transition(state, { type: 'drop' });
    assert.deepEqual(state.parts[id], { status: 'joined', ...PARTS[id].target, roll: 0 });
    assert.equal(state.selected, id);
  }
  assert.equal(state.history.length, 4);
  assert.equal(canRun(state), true);
  assert.equal(getStage(state), 'test');
  state = transition(state, { type: 'angle', angle: TURN });
  assert.equal(state.tested, true);
  assert.equal(getStage(state), 'complete');
});

test('wrong order, location, and roll reject without losing the selected component', () => {
  for (const id of ORDER.slice(1)) {
    const state = place(initialState(), id);
    assert.equal(state.parts[id].status, 'loose');
    assert.equal(fit(state, id).reason, 'prerequisite');
    assert.match(state.feedback, /first/);
    assert.equal(state.tone, 'error');
  }
  let state = place(initialState(), 'crank', { x: 2, z: 2 });
  assert.equal(fit(state).reason, 'position');
  assert.equal(fit(state).near, false);
  state = place(state, 'crank', {}, 15);
  assert.equal(fit(state).reason, 'orientation');
  assert.equal(state.parts.crank.status, 'loose');
  assert.match(state.feedback, /Roll/);
});

test('fit includes exact radius and angle boundaries and understands angular wrap', () => {
  for (const roll of [ANGLE_TOLERANCE, -ANGLE_TOLERANCE, 360 + ANGLE_TOLERANCE]) {
    const state = place(initialState(), 'crank', { x: SNAP_RADIUS }, roll);
    assert.equal(state.parts.crank.status, 'joined');
  }
  const outside = place(initialState(), 'crank', { x: SNAP_RADIUS + .00001 });
  assert.equal(outside.parts.crank.status, 'loose');
  assert.equal(fit(place(initialState(), 'crank', {}, ANGLE_TOLERANCE + .00001)).reason, 'orientation');
  const near = place(initialState(), 'crank', { x: NEAR_RADIUS });
  assert.equal(fit(near).near, true);
  assert.equal(fit(near).ready, false);
  assert.equal(fit(initialState()).near, false);
});

test('movement clamps both axes and ignores invalid or unstarted input', () => {
  const state = initialState();
  assert.equal(transition(state, { type: 'move', x: 0, z: 0 }), state);
  let dragging = transition(state, { type: 'begin', part: 'crank' });
  for (const x of [NaN, Infinity, undefined, '0']) assert.equal(transition(dragging, { type: 'move', x, z: 0 }), dragging);
  dragging = transition(dragging, { type: 'move', x: 99, z: -99 });
  assert.equal(dragging.parts.crank.x, BOUNDS.maxX);
  assert.equal(dragging.parts.crank.z, BOUNDS.minZ);
  dragging = transition(dragging, { type: 'move', x: -99, z: 99 });
  assert.equal(dragging.parts.crank.x, BOUNDS.minX);
  assert.equal(dragging.parts.crank.z, BOUNDS.maxZ);
});

test('cancel and undo during pickup restore the full assembly before lift and pause motion', () => {
  const built = run(assembly(), { type: 'angle', angle: TURN }, { type: 'hint' }, { type: 'toggle-play' });
  for (const part of ORDER) {
    for (const type of ['cancel', 'undo']) {
      const lifted = run(built, { type: 'begin', part }, { type: 'move', x: -3, z: 3 }, { type: 'rotate', delta: 90 });
      assert.equal(lifted.angle, 0);
      assert.equal(lifted.tested, false);
      assert.equal(lifted.parts[part].status, 'loose');
      const restored = transition(lifted, { type });
      assert.deepEqual(restored, { ...built, playing: false });
    }
  }
});

test('lifting each joined component resets motion and returns dependents safely to the bench', () => {
  for (const [index, part] of ORDER.entries()) {
    const built = run(assembly(), { type: 'angle', angle: TURN }, { type: 'toggle-play' });
    const state = transition(built, { type: 'begin', part });
    assert.equal(state.angle, 0);
    assert.equal(state.travel, 0);
    assert.equal(state.playing, false);
    assert.equal(state.tested, false);
    assert.deepEqual(state.parts[part], { status: 'loose', ...PARTS[part].target, roll: 0 });
    for (const id of ORDER.slice(index + 1)) assert.deepEqual(state.parts[id], { status: 'loose', ...PARTS[id].start, roll: 0 });
    for (const id of ORDER.slice(0, index)) assert.equal(state.parts[id].status, 'joined');
    assert.equal(canRun(state), false);
    const dropped = transition(state, { type: 'drop' });
    assert.equal(dropped.parts[part].status, 'joined');
  }
});

test('remove cascades and undo restores consistent assembly with nonrecursive history', () => {
  const built = transition(assembly(), { type: 'angle', angle: 1.5 });
  let state = transition(built, { type: 'remove', part: 'mainCaps' });
  assert.equal(state.parts.crank.status, 'joined');
  for (const id of ORDER.slice(1)) assert.deepEqual(state.parts[id], { status: 'loose', ...PARTS[id].start, roll: 0 });
  assert.equal(state.history.length, built.history.length + 1);
  assert.equal(transition(state, { type: 'remove' }), state);
  for (const saved of state.history) {
    assert.equal('history' in saved, false);
    assert.equal('drag' in saved, false);
  }
  state = transition(state, { type: 'undo' });
  assert.deepEqual(state, built);
  state = transition(state, { type: 'undo' });
  assert.equal(state.parts.rodCap.status, 'loose');
  assert.equal(state.parts.piston.status, 'joined');
});

test('rotation saves one undo outside a drag and one transaction for many drag movements', () => {
  let state = run(initialState(), { type: 'select', part: 'crank' });
  const selected = state;
  state = transition(state, { type: 'rotate', delta: 15 });
  assert.equal(state.history.length, 1);
  assert.deepEqual(transition(state, { type: 'undo' }), selected);
  state = transition(selected, { type: 'begin', part: 'crank' });
  for (let i = 0; i < 100; i++) state = run(state, { type: 'move', x: i / 100, z: 0 }, { type: 'rotate', delta: 15 });
  assert.equal(state.history.length, 0);
  state = transition(state, { type: 'drop' });
  assert.equal(state.history.length, 1);
  assert.deepEqual(transition(state, { type: 'undo' }), selected);
});

test('lifting or returning an ancestor preserves independently rearranged loose descendants', () => {
  let state = place(initialState(), 'crank');
  state = place(state, 'mainCaps');
  state = place(state, 'piston', { x: 3, z: -2 }, 75);
  state = place(state, 'rodCap', { x: -3, z: 3 }, -45);
  const before = state;
  const lifted = transition(before, { type: 'begin', part: 'crank' });
  assert.equal(lifted.parts.mainCaps.status, 'loose');
  for (const id of ['piston', 'rodCap']) assert.deepEqual(lifted.parts[id], before.parts[id]);
  assert.deepEqual(transition(lifted, { type: 'cancel' }), before);
  const dropped = run(lifted, { type: 'move', x: -2, z: -1 }, { type: 'drop' });
  assert.deepEqual(transition(dropped, { type: 'undo' }), before);
  const removed = transition(before, { type: 'remove', part: 'crank' });
  for (const id of ['piston', 'rodCap']) assert.deepEqual(removed.parts[id], before.parts[id]);
  assert.deepEqual(transition(removed, { type: 'undo' }), before);
});

test('returning a loose component recovers only that piece and undo restores its arrangement', () => {
  let state = initialState();
  for (const [index, id] of ORDER.entries()) state = place(state, id, { x: 2 + index / 10, z: -2 }, 60 + index * 15);
  const before = state;
  const removed = transition(before, { type: 'remove', part: 'crank' });
  assert.deepEqual(removed.parts.crank, { status: 'loose', ...PARTS.crank.start, roll: 0 });
  for (const id of ORDER.slice(1)) assert.deepEqual(removed.parts[id], before.parts[id]);
  assert.deepEqual(transition(removed, { type: 'undo' }), before);
});

test('history retains the latest 50 changes and undo stops at the retained boundary', () => {
  let state = transition(initialState(), { type: 'select', part: 'crank' });
  for (let i = 0; i < 75; i++) state = transition(state, { type: 'rotate', delta: 15 });
  assert.equal(state.history.length, 50);
  const oldest = state.history[0];
  for (let i = 0; i < 50; i++) state = transition(state, { type: 'undo' });
  assert.deepEqual(state.parts, oldest.parts);
  assert.equal(state.history.length, 0);
  assert.equal(transition(state, { type: 'undo' }), state);
});

test('hints reveal only requested stages and reset clears state without shared references', () => {
  let state = initialState();
  for (const id of ORDER) {
    assert.equal(getHint(state).level, 0);
    const before = physical(state);
    for (let level = 1; level <= 4; level++) {
      state = transition(state, { type: 'hint' });
      const hint = getHint(state);
      assert.equal(hint.level, level);
      assert.equal(Boolean(hint.part), level >= 3);
      assert.equal(Boolean(hint.target), level >= 3);
      assert.deepEqual(physical(state), before);
    }
    state = transition(state, { type: 'hint' });
    assert.equal(getHint(state).level, 4);
    state = place(state, id);
  }
  state = run(state, { type: 'hint' }, { type: 'section' }, { type: 'toggle-play' });
  assert.deepEqual(transition(state, { type: 'reset' }), initialState());
  assert.deepEqual(initialState().hints, {});
});

test('incomplete assembly gates all motion; ready assembly supports full steps and net slider travel', () => {
  const incomplete = initialState();
  for (const action of [{ type: 'step' }, { type: 'toggle-play' }, { type: 'tick', delta: TURN }, { type: 'angle', angle: TURN }]) {
    const next = transition(incomplete, action);
    assert.equal(next.angle, 0);
    assert.equal(next.travel, 0);
    assert.equal(next.tested, false);
    assert.equal(next.playing, false);
  }
  let state = assembly();
  for (let i = 0; i < 23; i++) state = transition(state, { type: 'step' });
  assert.equal(state.tested, false);
  state = transition(state, { type: 'step' });
  assert.equal(state.tested, true);
  assert.ok(Math.abs(state.travel - TURN) < 1e-10);
  state = assembly();
  for (let i = 0; i < 50; i++) state = run(state, { type: 'angle', angle: 4 }, { type: 'angle', angle: 0 });
  assert.equal(state.tested, false);
  assert.equal(state.travel, 0);
  state = transition(state, { type: 'angle', angle: 99 });
  assert.equal(state.angle, TURN);
  assert.equal(state.tested, true);
  assert.equal(transition(state, { type: 'angle', angle: -1 }).tested, true);
});

test('continuous ticks wrap and pause; invalid and repeated events are harmless', () => {
  let state = run(assembly(), { type: 'toggle-play' });
  for (const delta of [NaN, Infinity, -1, 0, '1']) assert.equal(transition(state, { type: 'tick', delta }), state);
  state = transition(state, { type: 'tick', delta: TURN + .2 });
  assert.ok(Math.abs(state.angle - .2) < 1e-10);
  assert.equal(state.tested, true);
  state = transition(state, { type: 'pause' });
  assert.equal(state.playing, false);
  for (const action of [null, {}, { type: 'select', part: 'missing' }, { type: 'drop' }, { type: 'cancel' }, { type: 'rotate', delta: 15 }, { type: 'angle', angle: NaN }]) assert.equal(transition(state, action), state);
  state = transition(state, { type: 'begin', part: 'crank' });
  for (const action of [{ type: 'begin', part: 'piston' }, { type: 'select', part: 'piston' }, { type: 'remove', part: 'piston' }]) assert.equal(transition(state, action), state);
  const hugeRoll = transition(state, { type: 'rotate', delta: Number.MAX_VALUE });
  assert.ok(Number.isFinite(hugeRoll.parts.crank.roll));
  assert.ok(hugeRoll.parts.crank.roll >= -180 && hugeRoll.parts.crank.roll < 180);
});
