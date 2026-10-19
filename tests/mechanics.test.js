import test from 'node:test';
import assert from 'node:assert/strict';
import { linkage, MECHANICS, initialState, transition, PARTS, LOCATIONS, getStage, getHint, canTest } from '../src/mechanics.js';

const TURN = 2 * Math.PI;
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const run = (state, ...actions) => actions.reduce(transition, state);
const place = (state, part, location) => run(state,
  { type: 'select', part }, { type: 'begin-place' }, { type: 'location', location }, { type: 'seat' });
const secure = state => run(state, { type: 'tool', tool: 'socket' }, { type: 'fasten', index: 0 }, { type: 'fasten', index: 1 });
function assembly() {
  let state = place(initialState(), 'crank', 'mainLine');
  state = secure(place(state, 'mainCaps', 'mainCaps'));
  state = place(state, 'piston', 'cylinder');
  return secure(place(state, 'rodCap', 'crankpin'));
}
const physical = state => ({ parts: state.parts, fasteners: state.fasteners, angle: state.angle, testTravel: state.testTravel });

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
test('initial objective gives no automatic next-part selection or hints', () => {
  const state = initialState();
  assert.equal(state.selected, null);
  assert.equal(state.phase, 'inspect');
  assert.equal(state.angle, Math.PI / 4);
  assert.equal(getStage(state), 'crank');
  assert.equal(getHint(state).level, 0);
  assert.equal(canTest(state), false);
  assert.equal(Object.keys(PARTS).length, 5);
  assert.equal(Object.keys(LOCATIONS).length, 5);
  assert.ok(Object.values(PARTS).every(part => part.name && part.description));
  const other = initialState();
  state.fasteners.mainCaps[0] = true;
  assert.equal(other.fasteners.mainCaps[0], false);
});
test('wrong order is checked on seat and preserves existing progress', () => {
  for (const [part, location] of [['mainCaps', 'mainCaps'], ['piston', 'cylinder'], ['rodCap', 'crankpin']]) {
    const before = initialState();
    const state = place(before, part, location);
    assert.equal(state.phase, 'locate');
    assert.equal(state.tone, 'error');
    assert.deepEqual(physical(state), physical(before));
    assert.ok(state.feedback.length > 15);
  }
  const crank = place(initialState(), 'crank', 'mainLine');
  const state = place(crank, 'piston', 'cylinder');
  assert.deepEqual(physical(state), physical(crank));
});
test('location choice is explicit; wrong location and mismatched caps never install', () => {
  let state = run(initialState(), { type: 'select', part: 'crank' }, { type: 'begin-place' });
  const noLocation = transition(state, { type: 'seat' });
  assert.equal(noLocation.parts.crank, 'bench');
  assert.match(noLocation.feedback, /location/);
  state = transition(state, { type: 'location', location: 'cylinder' });
  assert.equal(state.parts.crank, 'bench');
  state = transition(state, { type: 'seat' });
  assert.equal(state.parts.crank, 'bench');
  assert.equal(state.phase, 'locate');
  state = run(state, { type: 'location', location: 'mainLine' }, { type: 'seat' });
  state = place(state, 'mainCaps', 'crankpin');
  assert.equal(state.parts.mainCaps, 'bench');
  assert.match(state.feedback, /does not match/);
  state = run(state, { type: 'location', location: 'mainCaps' }, { type: 'seat' });
  state = secure(state);
  const other = place(state, 'piston', 'otherCylinders');
  assert.equal(other.parts.piston, 'bench');
  assert.match(other.feedback, /outside this challenge/);
  state = place(state, 'piston', 'cylinder');
  state = place(state, 'rodCap', 'mainCaps');
  assert.equal(state.parts.rodCap, 'bench');
  assert.match(state.feedback, /does not match/);
});
test('only seated caps with the socket tool can secure both representative fasteners', () => {
  let state = run(initialState(), { type: 'select', part: 'mainCaps' }, { type: 'tool', tool: 'socket' }, { type: 'fasten', index: 0 });
  assert.equal(state.fasteners.mainCaps[0], false);
  state = place(state, 'crank', 'mainLine');
  state = place(state, 'mainCaps', 'mainCaps');
  for (const tool of ['screwdriver', 'mallet']) {
    state = run(state, { type: 'tool', tool }, { type: 'fasten', index: 0 });
    assert.deepEqual(state.fasteners.mainCaps, [false, false]);
    assert.match(state.feedback, /socket/);
  }
  state = run(state, { type: 'tool', tool: 'socket' }, { type: 'fasten', index: 0 });
  assert.equal(state.parts.mainCaps, 'seated');
  const pistonAttempt = place(state, 'piston', 'cylinder');
  assert.equal(pistonAttempt.parts.piston, 'bench');
  state = run(state, { type: 'select', part: 'mainCaps' }, { type: 'fasten', index: 1 });
  assert.equal(state.parts.mainCaps, 'secured');
  assert.deepEqual(state.fasteners.mainCaps, [true, true]);
  assert.deepEqual(transition(state, { type: 'fasten', index: 1 }), state);
});
test('the complete challenge advances stages without automatically selecting the next part', () => {
  let state = initialState();
  state = place(state, 'crank', 'mainLine');
  assert.equal(getStage(state), 'mainCaps');
  assert.equal(state.selected, 'crank');
  state = place(state, 'mainCaps', 'mainCaps');
  assert.equal(getStage(state), 'mainFasteners');
  state = secure(state);
  assert.equal(getStage(state), 'piston');
  state = place(state, 'piston', 'cylinder');
  assert.equal(getStage(state), 'rodCap');
  state = place(state, 'rodCap', 'crankpin');
  assert.equal(getStage(state), 'rodFasteners');
  assert.equal(canTest(state), false);
  state = secure(state);
  assert.equal(getStage(state), 'test');
  assert.equal(canTest(state), true);
  assert.equal(state.selected, 'rodCap');
  state = run(state, { type: 'test' }, { type: 'toggle-play' }, { type: 'tick', delta: TURN });
  assert.equal(getStage(state), 'complete');
});
test('hints reveal four request-only levels per stage without changing assembly or selection', () => {
  let state = initialState();
  const advance = [
    s => place(s, 'crank', 'mainLine'), s => place(s, 'mainCaps', 'mainCaps'), secure,
    s => place(s, 'piston', 'cylinder'), s => place(s, 'rodCap', 'crankpin'), secure,
    s => run(s, { type: 'test' }, { type: 'toggle-play' }, { type: 'tick', delta: TURN }),
  ];
  const stages = ['crank', 'mainCaps', 'mainFasteners', 'piston', 'rodCap', 'rodFasteners', 'test', 'complete'];
  let requests = 0;
  stages.forEach((stage, index) => {
    assert.equal(getStage(state), stage);
    assert.equal(getHint(state).level, 0);
    const before = structuredClone(state);
    for (let level = 1; level <= 4; level++) {
      state = transition(state, { type: 'hint' });
      const hint = getHint(state);
      assert.equal(hint.level, level);
      assert.equal(state.hintRequests, ++requests);
      assert.deepEqual({ ...state, hints: before.hints, hintRequests: before.hintRequests }, before);
      assert.equal(Boolean(hint.part), level >= 3 && index < 6);
      assert.equal(Boolean(hint.location), level >= 3 && index < 6);
    }
    state = transition(state, { type: 'hint' });
    requests++;
    assert.equal(getHint(state).level, 4);
    if (advance[index]) state = advance[index](state);
  });
  assert.equal(state.hints.crank, 4);
});
test('repeated seats, placement requests, and cap fastening cannot duplicate progress', () => {
  let state = place(initialState(), 'crank', 'mainLine');
  for (const type of ['seat', 'begin-place']) assert.deepEqual(transition(state, { type }), state);
  state = assembly();
  for (const action of [{ type: 'seat' }, { type: 'begin-place' }, { type: 'fasten', index: 0 }, { type: 'fasten', index: 1 }]) {
    assert.deepEqual(transition(state, action), state);
  }
});
test('cancel and changed selection exit locating while preserving progress', () => {
  const crank = place(initialState(), 'crank', 'mainLine');
  let state = run(crank, { type: 'select', part: 'mainCaps' }, { type: 'begin-place' }, { type: 'location', location: 'mainCaps' });
  const cancelled = transition(state, { type: 'cancel' });
  assert.equal(cancelled.phase, 'inspect');
  assert.equal(cancelled.location, null);
  assert.deepEqual(cancelled.parts, crank.parts);
  state = transition(state, { type: 'select', part: 'piston' });
  assert.equal(state.phase, 'inspect');
  assert.equal(state.location, null);
  assert.deepEqual(state.parts, crank.parts);
});
test('unsecured assembly and a ready assembly without a started test lock motion', () => {
  const states = [initialState(), place(initialState(), 'crank', 'mainLine'), assembly()];
  let partial = place(secure(place(place(initialState(), 'crank', 'mainLine'), 'mainCaps', 'mainCaps')), 'piston', 'cylinder');
  partial = place(partial, 'rodCap', 'crankpin');
  partial = run(partial, { type: 'tool', tool: 'socket' }, { type: 'fasten', index: 0 });
  states.push(partial);
  for (const state of states) {
    for (const action of [{ type: 'step' }, { type: 'angle', angle: 2 }, { type: 'toggle-play' }, { type: 'tick', delta: TURN }]) {
      const after = transition(state, action);
      assert.equal(after.angle, state.angle);
      assert.equal(after.playing, false);
      assert.equal(after.testTravel, 0);
    }
  }
  assert.equal(transition(partial, { type: 'test' }).testStarted, false);
  assert.equal(transition(assembly(), { type: 'test' }).testStarted, true);
});
test('24 reduced-motion steps pass a full turn and repeated test does not reset progress', () => {
  let state = transition(assembly(), { type: 'test' });
  for (let i = 0; i < 23; i++) state = transition(state, { type: 'step' });
  assert.equal(state.tested, false);
  assert.deepEqual(transition(state, { type: 'test' }), state);
  state = transition(state, { type: 'step' });
  assert.equal(state.tested, true);
  assert.ok(Math.abs(state.testTravel - TURN) < 1e-12);
  assert.equal(state.playing, false);
  assert.equal(getStage(state), 'complete');
  state = transition(state, { type: 'angle', angle: 0 });
  assert.equal(state.tested, true);
});
test('the hand-turn test starts at zero and the slider alone completes a full revolution', () => {
  const built = assembly();
  assert.equal(built.angle, Math.PI / 4);
  let state = transition(built, { type: 'test' });
  assert.equal(state.angle, 0);
  assert.equal(state.testTravel, 0);
  state = transition(state, { type: 'angle', angle: TURN / 2 });
  assert.equal(state.tested, false);
  assert.deepEqual(transition(state, { type: 'test' }), state);
  state = transition(state, { type: 'angle', angle: TURN });
  assert.equal(state.tested, true);
  assert.equal(state.testTravel, TURN);
  assert.equal(getStage(state), 'complete');
});
test('back and forth slider travel never falsely passes a full revolution', () => {
  let state = transition(assembly(), { type: 'test' });
  for (let i = 0; i < 40; i++) state = run(state, { type: 'angle', angle: 4 }, { type: 'angle', angle: 0 });
  assert.equal(state.tested, false);
  assert.ok(Math.abs(state.testTravel) < 1e-12);
  state = run(state, { type: 'angle', angle: TURN - .1 }, { type: 'angle', angle: 0 });
  assert.equal(state.tested, false);
  assert.ok(Math.abs(state.testTravel) < 1e-12);
});
test('slider motion subtracts reverse travel and later forward motion can complete the test', () => {
  let state = transition(assembly(), { type: 'test' });
  state = transition(state, { type: 'angle', angle: 4 });
  assert.equal(state.testTravel, 4);
  state = transition(state, { type: 'angle', angle: 1 });
  assert.equal(state.testTravel, 1);
  state = transition(state, { type: 'angle', angle: 0 });
  assert.equal(state.testTravel, 0);
  state = run(state, { type: 'toggle-play' }, { type: 'tick', delta: TURN });
  assert.equal(state.tested, true);
  state = transition(state, { type: 'angle', angle: 0 });
  assert.equal(state.tested, true);
});
test('ticks validate input, wrap angle, accumulate a turn, and pause reliably', () => {
  let state = run(assembly(), { type: 'test' }, { type: 'toggle-play' });
  for (const delta of [NaN, Infinity, -1, 0, undefined]) assert.deepEqual(transition(state, { type: 'tick', delta }), state);
  state = transition(state, { type: 'tick', delta: TURN + .2 });
  assert.equal(state.tested, true);
  assert.ok(state.angle >= 0 && state.angle < TURN);
  state = transition(state, { type: 'pause' });
  assert.equal(state.playing, false);
  assert.deepEqual(transition(state, { type: 'tick', delta: 1 }), state);
});
test('slider clamps finite inputs and ignores nonfinite values', () => {
  let state = transition(assembly(), { type: 'test' });
  for (const angle of [NaN, Infinity, -Infinity, undefined, '1']) assert.deepEqual(transition(state, { type: 'angle', angle }), state);
  state = transition(state, { type: 'angle', angle: -10 });
  assert.equal(state.angle, 0);
  state = transition(state, { type: 'angle', angle: 20 });
  assert.equal(state.angle, TURN);
});
test('unknown input is harmless and reset clears assembly, hints, test, motion, selection, and section', () => {
  let state = assembly();
  for (const action of [{ type: 'select', part: 'unknown' }, { type: 'tool', tool: 'wrench' }, { type: 'fasten', index: -1 }, { type: 'unknown' }]) {
    assert.deepEqual(transition(state, action), state);
  }
  state = run(state, { type: 'hint' }, { type: 'test' }, { type: 'toggle-play' }, { type: 'tick', delta: TURN }, { type: 'section' });
  assert.equal(state.section, false);
  assert.equal(state.playing, true);
  assert.deepEqual(transition(state, { type: 'reset' }), initialState());
});
