import { linkage } from './mechanics.js';

// Positions and angles are illustrative gameplay values, not engine specifications.
export const ORDER = Object.freeze(['crank', 'mainCaps', 'piston', 'rodCap']);
export const BOUNDS = Object.freeze({ minX: -3.6, maxX: 3.6, minZ: -2.6, maxZ: 3.9 });
export const SNAP_RADIUS = .65;
export const ANGLE_TOLERANCE = 12;
export const NEAR_RADIUS = 1.1;
export const PARTS = Object.freeze({
  crank: { name: 'Crankshaft', start: { x: -2.8, z: .2, roll: 30 }, target: { x: 0, z: 0 } },
  mainCaps: { name: 'Matching main cap set', start: { x: -.9, z: 3.1, roll: -15 }, target: { x: 0, z: 0 } },
  piston: { name: 'Piston and connecting rod', start: { x: 2.8, z: 1.8, roll: 30 }, target: { x: linkage(0).wristpin[0], z: 1.2 } },
  rodCap: { name: 'Matching rod cap', start: { x: 2.7, z: -1.5, roll: 45 }, target: { x: 0, z: 1.2 } },
});
const TURN = Math.PI * 2;
const valid = part => ORDER.includes(part);
const normalize = roll => ((roll + 180) % 360 + 360) % 360 - 180;
const cloneParts = parts => Object.fromEntries(ORDER.map(id => [id, { ...parts[id] }]));
const snapshot = ({ history, drag, ...state }) => ({ ...state, parts: cloneParts(state.parts), hints: { ...state.hints } });
const restore = (saved, history) => ({ ...snapshot(saved), history, drag: null, playing: false });
const remember = (state, next, saved = snapshot(state)) => ({ ...next, history: [...state.history.slice(-49), saved] });
const feedback = (state, message, tone = 'error') => ({ ...state, feedback: message, tone });

export function initialState() {
  return {
    parts: Object.fromEntries(ORDER.map(id => [id, { status: 'loose', ...PARTS[id].start }])),
    selected: null, drag: null, history: [], hints: {}, angle: 0, travel: 0,
    tested: false, playing: false, section: true,
    feedback: 'Grab a loose component, move it around the bench, and release where its connection fits.', tone: 'info',
  };
}

export const canRun = state => !state.drag && ORDER.every(id => state.parts[id].status === 'joined');
export const getStage = state => ORDER.find(id => state.parts[id].status !== 'joined') || (state.tested ? 'complete' : 'test');

export function fit(state, part = state.selected) {
  if (!valid(part)) return { near: false, distance: Infinity, angleError: Infinity, ready: false, reason: 'position', message: 'Select a component to check its fit.' };
  const piece = state.parts[part];
  const distance = Math.hypot(piece.x - PARTS[part].target.x, piece.z - PARTS[part].target.z);
  const angleError = Math.abs(normalize(piece.roll));
  const index = ORDER.indexOf(part);
  const missing = ORDER.slice(0, index).find(id => state.parts[id].status !== 'joined');
  const reason = distance > SNAP_RADIUS + 1e-10 ? 'position' : angleError > ANGLE_TOLERANCE + 1e-10 ? 'orientation' : missing ? 'prerequisite' : 'ready';
  const message = reason === 'position' ? 'Move the component closer to its matching connection.'
    : reason === 'orientation' ? 'Roll the component to align its matching surfaces.'
      : reason === 'prerequisite' ? `Connect the ${PARTS[missing].name.toLowerCase()} first to support this component.`
        : 'Position and orientation fit. Release to connect.';
  return { near: distance <= NEAR_RADIUS, distance, angleError, ready: reason === 'ready', reason, message };
}

const clues = {
  crank: ['Find the rotating component that the others connect to.', 'Its long axis belongs along the block’s main bearing line.', 'Move the crankshaft to the main bearing line.', 'Pick up the crankshaft, move it to the marked connection, roll until aligned, then drop.'],
  mainCaps: ['The rotating shaft needs support to stay in place.', 'The matching main caps close around the main bearing line.', 'Move the matching main caps to the crankshaft supports.', 'Pick up the main cap set, move it to the marked supports, align its roll, then drop.'],
  piston: ['Connect the cylinder’s sliding component to the rotating assembly.', 'The piston and connecting rod belong at the representative front cylinder.', 'Move the piston and rod to the highlighted cylinder connection.', 'Pick up the piston and rod, move it to the marked cylinder connection, align its roll, then drop.'],
  rodCap: ['Close the connecting rod’s open end around the crankpin.', 'The small matching cap completes the connecting rod connection.', 'Move the rod cap to the highlighted crankpin connection.', 'Pick up the rod cap, move it to the marked connection, align its roll, then drop.'],
  test: ['The assembly can now demonstrate its motion.', 'Turn the crank and watch the piston move.', 'Use the turn slider or step control for a full revolution.', 'Move Turn from zero to one full turn, or use Step 24 times.'],
  complete: ['The assembly has completed a full turn.', 'Watch how the connecting rod drives the piston.', 'Explore the connected motion or rebuild.', 'Keep turning, lift a component, or reset to build again.'],
};
export function getHint(state) {
  const stage = getStage(state);
  const level = state.hints[stage] || 0;
  return { level, title: level ? `Hint ${level} of 4` : 'Optional hints', text: level ? clues[stage][level - 1] : 'Request a clue when you want one.',
    ...(level >= 3 && valid(stage) ? { part: stage, target: { ...PARTS[stage].target } } : {}) };
}

// Lifting any joined piece first returns the mechanism to its inspection pose.
function detach(state, part, returnSelected) {
  const parts = cloneParts(state.parts);
  for (const id of ORDER.slice(ORDER.indexOf(part))) {
    if (id !== part && parts[id].status !== 'joined') continue;
    if (id === part && !returnSelected) parts[id] = { status: 'loose', ...PARTS[id].target, roll: 0 };
    else parts[id] = { status: 'loose', ...PARTS[id].start, roll: 0 };
  }
  return { ...state, parts, angle: 0, travel: 0, tested: false, playing: false };
}

function motion(state, delta, angle, playing) {
  const travel = state.travel + delta;
  const tested = state.tested || Math.abs(travel) >= TURN - 1e-10;
  return { ...state, angle, travel, tested, playing,
    ...(tested && !state.tested ? { feedback: 'Full turn complete. Watch how the crankshaft moves the piston.', tone: 'success' } : {}) };
}

export function transition(state, action = {}) {
  if (!action || typeof action !== 'object') return state;
  switch (action.type) {
    case 'select':
      if (!valid(action.part) || state.drag) return state;
      return { ...state, selected: action.part, playing: false };
    case 'begin': {
      const part = action.part ?? state.selected;
      if (!valid(part) || state.drag) return state;
      const saved = snapshot(state);
      const next = state.parts[part].status === 'joined' ? detach(state, part, false) : { ...state, playing: false };
      return { ...next, selected: part, drag: { part, before: saved }, feedback: 'Move and roll the component, then drop to check its fit.', tone: 'info' };
    }
    case 'move': {
      if (!state.drag || !Number.isFinite(action.x) || !Number.isFinite(action.z)) return state;
      const id = state.drag.part;
      return { ...state, parts: { ...state.parts, [id]: { ...state.parts[id], x: Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, action.x)), z: Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, action.z)) } } };
    }
    case 'rotate': {
      const id = state.selected;
      if (!valid(id) || state.parts[id].status !== 'loose' || !Number.isFinite(action.delta) || action.delta % 360 === 0) return state;
      const next = { ...state, playing: false, parts: { ...state.parts, [id]: { ...state.parts[id], roll: normalize(state.parts[id].roll + action.delta % 360) } } };
      return state.drag ? next : remember(state, next);
    }
    case 'drop': {
      if (!state.drag) return state;
      const id = state.drag.part;
      const result = fit(state, id);
      const next = { ...state, drag: null, parts: { ...state.parts, [id]: result.ready ? { status: 'joined', ...PARTS[id].target, roll: 0 } : { ...state.parts[id] } },
        feedback: result.ready ? `${PARTS[id].name} connected. Explore the remaining components.` : result.message, tone: result.ready ? 'success' : 'error' };
      return remember(state, next, state.drag.before);
    }
    case 'cancel': return state.drag ? restore(state.drag.before, state.history) : state;
    case 'remove': {
      const id = action.part ?? state.selected;
      if (!valid(id) || state.drag) return state;
      const next = detach(state, id, true);
      if (state.selected === id && state.angle === 0 && state.travel === 0 && !state.tested && !state.playing
        && ORDER.every(part => ['status', 'x', 'z', 'roll'].every(key => state.parts[part][key] === next.parts[part][key]))) return state;
      return remember(state, { ...next, selected: id, feedback: `${PARTS[id].name} returned to the bench with its dependent components.`, tone: 'info' });
    }
    case 'undo':
      if (state.drag) return restore(state.drag.before, state.history);
      return state.history.length ? restore(state.history.at(-1), state.history.slice(0, -1)) : state;
    case 'hint': {
      const stage = getStage(state);
      return { ...state, hints: { ...state.hints, [stage]: Math.min(4, (state.hints[stage] || 0) + 1) } };
    }
    case 'angle':
      if (!Number.isFinite(action.angle)) return state;
      if (!canRun(state)) return feedback(state, 'Connect all four components before turning the assembly.');
      return motion(state, Math.max(0, Math.min(TURN, action.angle)) - state.angle, Math.max(0, Math.min(TURN, action.angle)), false);
    case 'step': return canRun(state) ? motion(state, Math.PI / 12, (state.angle + Math.PI / 12) % TURN, false) : feedback(state, 'Connect all four components before turning the assembly.');
    case 'tick': return canRun(state) && state.playing && Number.isFinite(action.delta) && action.delta > 0 ? motion(state, action.delta, (state.angle + action.delta) % TURN, true) : state;
    case 'toggle-play': return canRun(state) ? { ...state, playing: !state.playing } : feedback(state, 'Connect all four components before turning the assembly.');
    case 'pause': return state.playing ? { ...state, playing: false } : state;
    case 'section': return { ...state, section: !state.section };
    case 'reset': return initialState();
    default: return state;
  }
}
