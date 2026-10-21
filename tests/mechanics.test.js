import test from 'node:test';
import assert from 'node:assert/strict';
import { linkage, MECHANICS } from '../src/mechanics.js';

const TURN = 2 * Math.PI;
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
test('linkage stays joined and in its bore through 1440 crank positions', () => {
  for (let i = 0; i < 1440; i++) {
    const { crankpin, wristpin, axis } = linkage(i * TURN / 1440);
    assert.ok(Math.abs(distance(crankpin, wristpin) - MECHANICS.rodLength) < 1e-12);
    assert.ok(Math.abs(Math.hypot(crankpin[0], crankpin[1]) - MECHANICS.radius) < 1e-12);
    assert.ok(Math.abs(wristpin[0] * axis[1] - wristpin[1] * axis[0]) < 1e-12);
    assert.equal(crankpin[2], wristpin[2]);
  }
});
test('dead centers, stroke of twice crank radius, and periodicity obey analytic geometry', () => {
  const top = linkage(MECHANICS.bankAngle);
  const bottom = linkage(MECHANICS.bankAngle + Math.PI);
  assert.ok(Math.abs(top.distance - MECHANICS.rodLength - MECHANICS.radius) < 1e-12);
  assert.ok(Math.abs(bottom.distance - MECHANICS.rodLength + MECHANICS.radius) < 1e-12);
  assert.ok(Math.abs(top.distance - bottom.distance - 2 * MECHANICS.radius) < 1e-12);
  assert.ok(distance(linkage(.83).wristpin, linkage(.83 + TURN).wristpin) < 1e-12);
  assert.throws(() => linkage(0, { ...MECHANICS, rodLength: .01 }), RangeError);
});
