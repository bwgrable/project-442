import { linkage, MECHANICS } from './mechanics.js';

// Illustrative bench coordinates; roll/pivot are degrees, engine angle radians.
export const ORDER = Object.freeze(['piston', 'rod', 'pin', 'rodCap']);
export const ENGINE_OFFSET = Object.freeze({ x: -2.3, z: -2.5 });
export const BENCH_Y = -.30;
export const PIN_TRAVEL = .58;
export const BOUNDS = Object.freeze({ minX: -4, maxX: 4, minZ: -4, maxZ: 4.5 });
export const PARTS = Object.freeze({
  piston: { name: 'Piston', start: { x: 1.4, z: 1, roll: 0 } },
  rod: { name: 'Connecting rod', start: { x: -.1, z: 2.8, roll: 30 } },
  pin: { name: 'Wrist pin', start: { x: 2.8, z: 2.6, roll: 0, depth: 0 } },
  rodCap: { name: 'Rod cap', start: { x: 2.8, z: -.2, roll: 30 } },
});
const TURN = Math.PI * 2;
const valid = id => ORDER.includes(id);
const norm = a => ((a + 180) % 360 + 360) % 360 - 180;
const clamp = (a, lo, hi) => Math.max(lo, Math.min(hi, a));
const copyParts = parts => Object.fromEntries(ORDER.map(id => [id, { ...parts[id] }]));
const snapshot = ({ drag, history, ...state }) => ({ ...state, parts: copyParts(state.parts), hints: { ...state.hints } });
const restore = (s, history) => ({ ...snapshot(s), history, drag: null, playing: false });
const remember = (s, next, before = snapshot(s)) => ({ ...next, history: [...s.history.slice(-49), before] });
const message = (s, feedback, tone = 'info') => ({ ...s, feedback, tone });
const pinned = s => s.parts.pin.status === 'pinned';
const installed = s => s.parts.piston.status === 'installed';
const resetMotion = s => ({ ...s, angle: 0, travel: 0, tested: false, playing: false });

export function initialState() {
  return { parts: Object.fromEntries(ORDER.map(id => [id, { ...PARTS[id].start, status: 'loose' }])),
    pivot: 0, selected: null, drag: null, history: [], hints: {}, angle: 0, travel: 0,
    tested: false, playing: false, section: true,
    feedback: 'Explore the separate parts and their matching connections.', tone: 'info' };
}
export const canRun = s => !s.drag && installed(s) && pinned(s) && s.parts.rodCap.status === 'joined';
export const getStage = s => s.parts.rod.status === 'loose' ? 'rod' : !pinned(s) ? 'pin' : !installed(s) ? 'piston' : s.parts.rodCap.status !== 'joined' ? 'rodCap' : s.tested ? 'complete' : 'test';
export function targetFor(s, id) {
  const link = linkage(s.angle);
  if (id === 'piston') return { x: link.wristpin[0] + ENGINE_OFFSET.x, z: link.wristpin[2] + ENGINE_OFFSET.z };
  if (id === 'rodCap') return { x: link.crankpin[0] + ENGINE_OFFSET.x, z: link.crankpin[2] + ENGINE_OFFSET.z };
  return { x: s.parts.piston.x, z: s.parts.piston.z };
}
export function poseFor(s, id) {
  const p = s.parts[id];
  if (!p) return null;
  const roll = id === 'rod' && pinned(s) ? s.parts.piston.roll + s.pivot : p.roll;
  const a = roll * Math.PI / 180;
  return { ...p, roll, y: BENCH_Y + (id === 'pin' && p.status === 'aligned' ? PIN_TRAVEL * (1 - p.depth) : 0),
    ...(id === 'rod' ? { bigEnd: { x: p.x + Math.sin(a) * MECHANICS.rodLength, z: p.z + Math.cos(a) * MECHANICS.rodLength } } : {}) };
}
export function fit(s, id = s.selected) {
  if (!valid(id)) return { near: false, ready: false, reason: 'selection', message: 'Select a part to check its fit.', target: null, distance: Infinity, angleError: Infinity };
  const p = s.parts[id], target = targetFor(s, id);
  const distance = Math.hypot(p.x - target.x, p.z - target.z);
  const angleError = Math.abs(norm(p.roll - (id === 'rod' ? s.parts.piston.roll : 0)));
  const radius = id === 'piston' ? .48 : id === 'rodCap' ? .4 : .3;
  let reason = distance > radius + 1e-10 ? 'position' : angleError > 12 + 1e-10 && id !== 'pin' ? 'orientation' : 'ready';
  if (id === 'piston' && !pinned(s)) reason = 'prerequisite';
  if (id === 'piston' && pinned(s) && Math.abs(norm(s.pivot)) > 12) reason = 'pivot';
  if (id === 'rod' && installed(s) || id === 'pin' && (s.parts.rod.status === 'loose' || installed(s)) || id === 'rodCap' && !installed(s)) reason = 'prerequisite';
  const text = { position: 'Move closer to the matching connection.', orientation: 'Roll the part to align the connection.', prerequisite: id === 'piston' ? 'Fit the rod and insert the separate wrist pin before carrying the unit into the cylinder.' : id === 'pin' ? 'Fit the rod into the piston before aligning the pin.' : id === 'rodCap' ? 'Install the pinned unit in the cylinder before fitting its cap.' : 'Return the unit to the bench first.', pivot: 'Swing the rod back into line before installing the unit.', ready: id === 'pin' ? 'Release to align, then drag along the pin axis to insert it.' : 'The connection fits. Release to connect.' };
  return { near: distance <= radius * 2, ready: reason === 'ready', reason, message: text[reason], target, distance, angleError };
}
function breakFit(s) {
  const parts = copyParts(s.parts);
  if (parts.rod.status === 'fitted') parts.rod.status = 'loose';
  if (parts.pin.status === 'aligned') { parts.pin.status = 'loose'; parts.pin.depth = 0; }
  return { ...s, parts, pivot: 0 };
}
function carry(s, x, z, roll = s.parts.piston.roll) {
  const parts = copyParts(s.parts);
  for (const id of ['piston', 'rod', 'pin']) Object.assign(parts[id], { x, z, roll });
  return { ...s, parts };
}
function bench(s) {
  let next = resetMotion(s);
  if (installed(s)) {
    next = carry(next, PARTS.piston.start.x, PARTS.piston.start.z, 0);
    next.parts.piston.status = 'loose';
  } else next = { ...next, parts: copyParts(next.parts) };
  if (next.parts.rodCap.status === 'joined') next.parts.rodCap = { ...PARTS.rodCap.start, status: 'loose' };
  return next;
}
function motion(s, delta, angle, playing) {
  const travel = s.travel + delta;
  const tested = s.tested || Math.abs(travel) >= TURN - 1e-10;
  return { ...s, angle, travel, tested, playing, ...(tested && !s.tested ? { feedback: 'Full revolution complete. Watch the joint transfer motion.', tone: 'success' } : {}) };
}
export function transition(s, a = {}) {
  if (!a || typeof a !== 'object') return s;
  switch (a.type) {
    case 'select': return valid(a.part) && !s.drag ? { ...s, selected: a.part, playing: false } : s;
    case 'begin': {
      const selected = a.part ?? s.selected;
      if (!valid(selected) || s.drag) return s;
      const unit = pinned(s) && selected !== 'rodCap';
      let next = installed(s) && unit ? bench(s) : { ...s, playing: false, parts: copyParts(s.parts) };
      if (selected === 'rodCap' && next.parts.rodCap.status === 'joined') {
        next = resetMotion(next);
        next.parts.rodCap = { ...PARTS.rodCap.start, status: 'loose' };
      }
      const mode = selected === 'pin' && next.parts.pin.status === 'aligned' ? 'insert' : 'move';
      return { ...next, selected, drag: { part: unit ? 'piston' : selected, mode, before: snapshot(s) } };
    }
    case 'move': {
      if (!s.drag || s.drag.mode !== 'move' || !Number.isFinite(a.x) || !Number.isFinite(a.z)) return s;
      const id = s.drag.part, x = clamp(a.x, BOUNDS.minX, BOUNDS.maxX), z = clamp(a.z, BOUNDS.minZ, BOUNDS.maxZ);
      if (pinned(s) && id === 'piston') return carry(s, x, z);
      const next = ['piston', 'rod'].includes(id) ? breakFit(s) : { ...s, parts: copyParts(s.parts) };
      Object.assign(next.parts[id], { x, z });
      if (id === 'pin') Object.assign(next.parts.pin, { status: 'loose', depth: 0 });
      return next;
    }
    case 'insert': {
      if (!s.drag || s.drag.mode !== 'insert' || !Number.isFinite(a.depth) || s.parts.rod.status !== 'fitted') return s;
      return { ...s, parts: { ...s.parts, pin: { ...s.parts.pin, depth: clamp(a.depth, 0, 1) } } };
    }
    case 'rotate': {
      const id = s.drag?.part ?? s.selected;
      if (!valid(id) || id === 'pin' && !pinned(s) || s.parts[id].status === 'joined' || installed(s) && id !== 'rodCap' || !Number.isFinite(a.delta) || a.delta % 360 === 0 || s.drag?.mode === 'insert') return s;
      let next;
      if (pinned(s) && id !== 'rodCap') next = carry(s, s.parts.piston.x, s.parts.piston.z, norm(s.parts.piston.roll + a.delta));
      else {
        next = ['piston', 'rod'].includes(id) ? breakFit(s) : { ...s, parts: copyParts(s.parts) };
        next.parts[id].roll = norm(next.parts[id].roll + a.delta);
      }
      next.playing = false;
      return s.drag ? next : remember(s, next);
    }
    case 'pivot': {
      if (!pinned(s) || installed(s) || s.drag || !Number.isFinite(a.delta) || a.delta % 360 === 0) return s;
      return remember(s, { ...s, pivot: norm(s.pivot + a.delta), playing: false });
    }
    case 'drop': {
      if (!s.drag) return s;
      const id = s.drag.part, result = fit(s, id);
      let next = { ...s, parts: copyParts(s.parts), drag: null, playing: false };
      if (s.drag.mode === 'insert') {
        if (s.parts.pin.depth >= .92 && s.parts.rod.status === 'fitted' && fit(s, 'pin').ready) {
          next = carry(next, s.parts.piston.x, s.parts.piston.z);
          next.parts.pin.status = next.parts.rod.status = 'pinned'; next.parts.pin.depth = 1;
          next = message(next, 'Wrist pin inserted. Carry the unit or swing the rod.', 'success');
        } else next = message(next, 'Pin partly inserted. Continue along its axis to finish.');
      } else if (result.ready) {
        if (id === 'rod') Object.assign(next.parts.rod, result.target, { roll: s.parts.piston.roll, status: 'fitted' });
        if (id === 'pin') Object.assign(next.parts.pin, result.target, { roll: 0, depth: 0, status: 'aligned' });
        if (id === 'piston') { next = carry(next, result.target.x, result.target.z, 0); next.parts.piston.status = 'installed'; next.pivot = 0; }
        if (id === 'rodCap') Object.assign(next.parts.rodCap, result.target, { roll: 0, status: 'joined' });
        next = message(next, id === 'pin' ? 'Pin aligned. Drag down its axis to insert it.' : 'Connection fitted.', 'success');
      } else next = message(next, result.message, 'error');
      return remember(s, next, s.drag.before);
    }
    case 'cancel': return s.drag ? restore(s.drag.before, s.history) : s;
    case 'undo': return s.drag ? restore(s.drag.before, s.history) : s.history.length ? restore(s.history.at(-1), s.history.slice(0, -1)) : s;
    case 'unpin': {
      if (s.drag || !pinned(s) && s.parts.pin.status !== 'aligned') return s;
      let next = bench(s);
      next.parts.pin = { ...PARTS.pin.start, status: 'loose' };
      next.parts.rod.status = 'fitted'; next.pivot = 0;
      next.parts.rod.roll = next.parts.piston.roll;
      return remember(s, message(next, 'Pin removed. The rod is temporarily fitted; moving either part separates it.'));
    }
    case 'remove': {
      const id = a.part ?? s.selected;
      if (!valid(id) || s.drag) return s;
      let next = id === 'rodCap' ? { ...resetMotion(s), parts: copyParts(s.parts) } : bench(s);
      if (pinned(next) && id !== 'rodCap') {
        next = carry(next, PARTS.piston.start.x, PARTS.piston.start.z, 0); next.pivot = 0;
      } else {
        if (id === 'piston' || id === 'rod') next = breakFit(next);
        next.parts[id] = { ...PARTS[id].start, status: 'loose' };
      }
      return remember(s, message({ ...next, selected: id }, 'Returned to the bench.'));
    }
    case 'hint': { const stage = getStage(s); return { ...s, hints: { ...s.hints, [stage]: Math.min(4, (s.hints[stage] || 0) + 1) } }; }
    case 'angle': {
      if (!Number.isFinite(a.angle)) return s;
      if (!canRun(s)) return message(s, 'Install the pinned unit and its cap before turning.', 'error');
      const angle = clamp(a.angle, 0, TURN); return motion(s, angle - s.angle, angle, false);
    }
    case 'step': return canRun(s) ? motion(s, Math.PI / 12, (s.angle + Math.PI / 12) % TURN, false) : message(s, 'Install the pinned unit and its cap before turning.', 'error');
    case 'tick': return canRun(s) && s.playing && Number.isFinite(a.delta) && a.delta > 0 ? motion(s, a.delta, (s.angle + a.delta) % TURN, true) : s;
    case 'toggle-play': return canRun(s) ? { ...s, playing: !s.playing } : message(s, 'Install the pinned unit and its cap before turning.', 'error');
    case 'pause': return s.playing ? { ...s, playing: false } : s;
    case 'section': return { ...s, section: !s.section };
    case 'reset': return initialState();
    default: return s;
  }
}
const clues = {
  rod: ['Look for two matching small openings.', 'The rod small end belongs between the piston bosses.', 'Fit the small end at the piston’s current wrist center.', 'Move the rod to the piston, match its roll, then release.'],
  pin: ['A fitted joint still needs a fastener.', 'Align the separate wrist pin with both bores.', 'Move the pin above the current piston wrist center.', 'Align and release the pin, then drag it down its axis until fully inserted.'],
  piston: ['The joined parts can now move together.', 'The piston belongs in the representative cylinder.', 'Carry the pinned unit to the cylinder connection.', 'Carry the unit to the cylinder, roll to zero and swing the rod into line, then release.'],
  rodCap: ['Close the remaining open bearing.', 'The cap closes the rod around the crankpin.', 'Move the cap to the installed rod’s crank connection.', 'Move the cap to the crank connection, align its roll, then release.'],
  test: ['The connected mechanism can now move.', 'Turn the crank to see the joint work.', 'Use Turn or Step for a full revolution.', 'Turn from zero to a full revolution, or press Step 24 times.'],
  complete: ['The full turn is complete.', 'Watch the rod swing at the wrist joint.', 'Explore motion or recover the unit.', 'Pause, remove the unit or unpin to rebuild.'],
};
export function getHint(s) {
  const stage = getStage(s), level = s.hints[stage] || 0;
  return { level, title: level ? `Hint ${level} of 4` : 'Optional hints', text: level ? clues[stage][level - 1] : 'Request a clue when you want one.',
    ...(level >= 3 && valid(stage) ? { part: stage, target: targetFor(s, stage) } : {}) };
}
