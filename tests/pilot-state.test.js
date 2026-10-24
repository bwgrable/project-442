import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, transition, missingFor, canRun, ORDER } from '../src/pilot-state.js';

const select = (state, part) => transition(state, { type: 'select', part });
const complete = () => ORDER.reduce(select, initialState());

test('either independent first part leads to a completed assembly', () => {
  for (const order of [['crank', 'piston', 'rod', 'pin'], ['piston', 'crank', 'rod', 'pin']]) {
    let state = initialState();
    assert.equal(canRun(state), false);
    for (const part of order) {
      assert.deepEqual(missingFor(state, part), []);
      const previous = state;
      state = select(state, part);
      assert.equal(previous.installed[part], false, 'previous state remains immutable');
      assert.equal(state.installed[part], true);
    }
    assert.equal(canRun(state), true);
  }
});
test('blocked selection explains missing connections and changes no installations', () => {
  const empty = initialState();
  const rod = select(empty, 'rod');
  assert.strictEqual(rod.installed, empty.installed);
  assert.equal(rod.selected, 'rod');
  assert.equal(rod.tone, 'blocked');
  assert.match(rod.feedback, /crankshaft and piston/);
  assert.deepEqual(missingFor(select(empty, 'piston'), 'rod'), ['crank']);
  const pin = select(select(select(empty, 'piston'), 'crank'), 'pin');
  assert.equal(pin.installed.pin, false);
  assert.match(pin.feedback, /connecting rod/);
});
test('installed selection is idempotent and pauses for learning; hints are optional', () => {
  const ready = transition(complete(), { type: 'toggle-play' });
  const selected = select(ready, 'piston');
  assert.strictEqual(selected.installed, ready.installed);
  assert.equal(selected.playing, false);
  assert.equal(selected.selected, 'piston');
  assert.equal(selected.hint, false);
  const hint = transition(selected, { type: 'hint' });
  assert.equal(hint.hint, true);
  assert.strictEqual(hint.installed, selected.installed);
  assert.equal(transition(hint, { type: 'hint' }).hint, false);
});
test('motion requires completion, wraps radians, and manual controls pause', () => {
  const empty = initialState();
  for (const event of [{ type: 'toggle-play' }, { type: 'angle', angle: 1 }, { type: 'step', delta: 1 }, { type: 'tick', delta: 1 }]) assert.strictEqual(transition(empty, event), empty);
  let state = transition(complete(), { type: 'toggle-play' });
  state = transition(state, { type: 'tick', delta: 2 });
  assert.ok(Math.abs(state.angle - .6) < 1e-12);
  state = transition(state, { type: 'angle', angle: Math.PI * 5 });
  assert.ok(Math.abs(state.angle - Math.PI) < 1e-12);
  assert.equal(state.playing, false);
  state = transition(state, { type: 'step', delta: -Math.PI * 1.5 });
  assert.ok(Math.abs(state.angle - Math.PI * 1.5) < 1e-12);
  const paused = transition(transition(state, { type: 'toggle-play' }), { type: 'pause' });
  assert.equal(paused.playing, false);
  assert.strictEqual(transition(paused, { type: 'tick', delta: 10 }), paused);
});
test('reset permits replay and malformed events cannot corrupt state', () => {
  const state = transition(complete(), { type: 'toggle-play' });
  assert.deepEqual(missingFor(state, '__proto__'), []);
  for (const event of [null, {}, { type: 'select', part: 'unknown' }, { type: 'angle', angle: NaN }, { type: 'angle', angle: '2' }, { type: 'step', delta: Infinity }, { type: 'tick', delta: -1 }, { type: 'tick', delta: undefined }]) assert.strictEqual(transition(state, event), state);
  const reset = transition(state, { type: 'reset' });
  assert.deepEqual(reset, initialState());
  assert.notStrictEqual(reset.installed, initialState().installed);
  assert.equal(select(reset, 'piston').installed.piston, true);
});
