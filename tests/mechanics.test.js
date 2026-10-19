import test from 'node:test';
import assert from 'node:assert/strict';
import { linkage, MECHANICS, initialState, transition } from '../src/mechanics.js';

const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
test('linkage stays joined with a fixed rod length through 1440 crank positions', () => {
  for (let i = 0; i <= 1440; i++) {
    const { crankpin, wristpin, axis } = linkage(i * Math.PI / 720);
    assert.ok(Math.abs(distance(crankpin, wristpin) - MECHANICS.rodLength) < 1e-12);
    assert.ok(Math.abs(Math.hypot(crankpin[0], crankpin[1]) - MECHANICS.radius) < 1e-12);
    assert.ok(Math.abs(wristpin[0] * axis[1] - wristpin[1] * axis[0]) < 1e-12);
    assert.equal(crankpin[2], wristpin[2]);
  }
});
test('dead centers and periodicity obey the analytic crank geometry', () => {
  const top = linkage(MECHANICS.bankAngle);
  const bottom = linkage(MECHANICS.bankAngle + Math.PI);
  assert.ok(Math.abs(top.distance - MECHANICS.rodLength - MECHANICS.radius) < 1e-12);
  assert.ok(Math.abs(bottom.distance - MECHANICS.rodLength + MECHANICS.radius) < 1e-12);
  assert.ok(distance(linkage(.83).wristpin, linkage(.83 + 2 * Math.PI).wristpin) < 1e-12);
});
test('placement requires selection and alignment; repeated input is idempotent', () => {
  let s = initialState();
  for (const type of ['place', 'toggle-play', 'step', 'align']) assert.deepEqual(transition(s, { type }), s);
  s = transition(s, { type: 'select', part: 'piston' });
  s = transition(s, { type: 'align' });
  assert.equal(s.phase, 'aligned');
  s = transition(s, { type: 'place' });
  assert.equal(s.phase, 'installed');
  assert.deepEqual(transition(s, { type: 'place' }), s);
  assert.deepEqual(transition(s, { type: 'align' }), s);
});
test('cancel and changed selection preserve a bench assembly; reset clears active motion', () => {
  let s = transition(initialState(), { type: 'select', part: 'piston' });
  s = transition(s, { type: 'align' });
  assert.equal(transition(s, { type: 'cancel' }).phase, 'bench');
  assert.equal(transition(s, { type: 'select', part: 'crank' }).phase, 'bench');
  s = transition(s, { type: 'place' });
  s = transition(s, { type: 'toggle-play' });
  s = transition(s, { type: 'tick', delta: .4 });
  s = transition(s, { type: 'section' });
  assert.deepEqual(transition(s, { type: 'reset' }), initialState());
});
