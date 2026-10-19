// Illustrative dimensions in scene units. These are not Rocket 400 specifications.
export const MECHANICS = Object.freeze({ radius: 0.42, rodLength: 1.45, bankAngle: Math.PI / 4, station: 1.2 });

// Solve the fixed-length rod constraint, with the wrist pin on the cylinder axis.
// The selected cylinder's axis passes through the main crank axis in its XY plane.
export function linkage(angle, config = MECHANICS) {
  const { radius: r, rodLength: l, bankAngle: bank, station: z } = config;
  const u = [Math.sin(bank), Math.cos(bank), 0];
  const crankpin = [r * Math.sin(angle), r * Math.cos(angle), z];
  const along = crankpin[0] * u[0] + crankpin[1] * u[1];
  const perpendicularSquared = r * r - along * along;
  if (l * l <= perpendicularSquared) throw new RangeError('Rod cannot reach the cylinder axis.');
  const distance = along + Math.sqrt(l * l - perpendicularSquared);
  const wristpin = [distance * u[0], distance * u[1], z];
  return { crankpin, wristpin, distance, axis: u };
}

const TURN = 2 * Math.PI;
const START_ANGLE = Math.PI / 4;

export const PARTS = Object.freeze({
  block: { name: 'Engine block', description: 'The block supports the main bearings and guides the pistons.' },
  crank: { name: 'Crankshaft', description: 'The crankshaft rotates in the main bearing line.' },
  mainCaps: { name: 'Matching main cap set', description: 'These matching caps retain the crankshaft in the block.' },
  piston: { name: 'Piston and connecting rod', description: 'One representative piston and rod connect the cylinder to a crankpin.' },
  rodCap: { name: 'Matching rod cap', description: 'This matching cap closes the connecting rod around its crankpin.' },
});

export const LOCATIONS = Object.freeze({
  mainLine: { name: 'Main bearing line' },
  mainCaps: { name: 'Main cap seats' },
  cylinder: { name: 'Representative front cylinder' },
  crankpin: { name: 'Connecting rod crankpin' },
  otherCylinders: { name: 'Other cylinders (outside this challenge)' },
});

const destinations = { crank: 'mainLine', mainCaps: 'mainCaps', piston: 'cylinder', rodCap: 'crankpin' };
const prerequisites = {
  mainCaps: ['crank', 'seated', 'Seat the crankshaft before fitting its matching main caps.'],
  piston: ['mainCaps', 'secured', 'Secure both representative main cap fasteners before adding the piston and rod.'],
  rodCap: ['piston', 'seated', 'Seat the piston and connecting rod before fitting its matching rod cap.'],
};
const hintSteps = {
  crank: { part: 'crank', location: 'mainLine', clues: ['Start with the rotating part that everything else connects to.', 'Find the shaft with offset crankpins and look along the block’s main bearing line.', 'Choose the crankshaft and use the highlighted main bearing line.', 'Select the crankshaft, choose “Choose mounting location”, select the main bearing line, then Seat.'] },
  mainCaps: { part: 'mainCaps', location: 'mainCaps', clues: ['A seated shaft still needs to be retained in its bearings.', 'Find the matching main cap set and the seats along the main bearing line.', 'Choose the matching main cap set and use the highlighted main cap seats.', 'Select the matching main cap set, choose “Choose mounting location”, select the main cap seats, then Seat.'] },
  mainFasteners: { part: 'mainCaps', location: 'mainCaps', clues: ['Seating a cap does not yet secure it.', 'The main caps need both representative fasteners secured with a socket tool.', 'Select the main caps at the highlighted seats and choose the socket tool.', 'Select the main cap set, choose the socket tool, then secure each of its two representative fasteners.'] },
  piston: { part: 'piston', location: 'cylinder', clues: ['Connect straight-line cylinder motion to the rotating assembly.', 'Find the piston and rod, then the representative front cylinder.', 'Choose the piston and rod and use the highlighted representative cylinder.', 'Select the piston and rod, choose “Choose mounting location”, select the representative front cylinder, then Seat.'] },
  rodCap: { part: 'rodCap', location: 'crankpin', clues: ['The connecting rod needs its open end closed around the crankpin.', 'Find the cap matching the connecting rod and look at the crankpin.', 'Choose the matching rod cap and use the highlighted crankpin.', 'Select the matching rod cap, choose “Choose mounting location”, select the connecting rod crankpin, then Seat.'] },
  rodFasteners: { part: 'rodCap', location: 'crankpin', clues: ['The connection must be secured before it can be tested.', 'The rod cap needs both representative fasteners secured with a socket tool.', 'Select the rod cap at the highlighted crankpin and choose the socket tool.', 'Select the rod cap, choose the socket tool, then secure each of its two representative fasteners.'] },
  test: { clues: ['A connected assembly can now show how rotation moves the piston.', 'Start the hand-turn test, then turn through one complete revolution.', 'Use the hand-turn test and observe the representative piston.', 'Start the test. Use Turn or the step control to make one full revolution in a consistent direction.'] },
  complete: { clues: ['The rotating assembly has completed its functional test.', 'Observe how the rod transfers motion between the crankshaft and piston.', 'The connected assembly is ready to explore.', 'Continue turning or reset to build the assembly again.'] },
};

export function initialState() {
  return {
    selected: null, phase: 'inspect', location: null, tool: null,
    parts: { crank: 'bench', mainCaps: 'bench', piston: 'bench', rodCap: 'bench' },
    fasteners: { mainCaps: [false, false], rodCap: [false, false] },
    hints: {}, hintRequests: 0, angle: START_ANGLE, playing: false, section: true,
    testStarted: false, testTravel: 0, tested: false,
    feedback: 'Build a connected rotating assembly, then turn it by hand to see how it works.', tone: 'info',
  };
}

export function canTest(state) {
  return state.parts.crank === 'seated' && state.parts.mainCaps === 'secured'
    && state.parts.piston === 'seated' && state.parts.rodCap === 'secured'
    && state.fasteners.mainCaps.every(Boolean) && state.fasteners.rodCap.every(Boolean);
}

export function getStage(state) {
  if (state.parts.crank === 'bench') return 'crank';
  if (state.parts.mainCaps === 'bench') return 'mainCaps';
  if (state.parts.mainCaps !== 'secured') return 'mainFasteners';
  if (state.parts.piston === 'bench') return 'piston';
  if (state.parts.rodCap === 'bench') return 'rodCap';
  if (state.parts.rodCap !== 'secured') return 'rodFasteners';
  return state.tested ? 'complete' : 'test';
}

export function getHint(state) {
  const stage = getStage(state);
  const level = state.hints[stage] || 0;
  const step = hintSteps[stage];
  return {
    level, title: ['Optional hint', 'Conceptual clue', 'Direction', 'Destination highlight', 'Walkthrough'][level],
    text: level ? step.clues[level - 1] : 'Request a hint whenever you want help.',
    ...(level >= 3 && step.part ? { part: step.part, location: step.location } : {}),
  };
}

const feedback = (state, text, tone = 'error') => ({ ...state, feedback: text, tone });
function move(state, delta, angle, playing) {
  const testTravel = state.testTravel + delta;
  const tested = state.tested || Math.abs(testTravel) >= TURN - 1e-9;
  return { ...state, angle, playing, testTravel, tested,
    ...(tested && !state.tested ? { feedback: 'Full revolution complete. The connected assembly turns and drives the piston.', tone: 'success' } : {}),
  };
}

// One owner for assembly, optional assistance, and the functional test.
export function transition(state, action) {
  switch (action.type) {
    case 'select':
      if (!Object.hasOwn(PARTS, action.part)) return state;
      if (state.selected === action.part) return state;
      return { ...state, selected: action.part, phase: 'inspect', location: null, playing: false,
        feedback: PARTS[action.part].description, tone: 'info' };
    case 'begin-place':
      if (!state.selected || state.selected === 'block') return feedback(state, 'Choose a loose assembly part to place.');
      if (state.parts[state.selected] !== 'bench' || state.phase === 'locate') return state;
      return { ...state, phase: 'locate', location: null, playing: false, feedback: 'Choose a plausible mounting location, then seat the selected part.', tone: 'info' };
    case 'location':
      if (state.phase !== 'locate' || !Object.hasOwn(LOCATIONS, action.location)) return state;
      return { ...state, location: action.location, feedback: `${LOCATIONS[action.location].name} selected. Seat the part to check the fit.`, tone: 'info' };
    case 'seat': {
      if (state.phase !== 'locate' || state.parts[state.selected] !== 'bench') return state;
      const required = prerequisites[state.selected];
      if (required && state.parts[required[0]] !== required[1]) return feedback(state, required[2]);
      if (!state.location) return feedback(state, 'Choose a mounting location before seating the part.');
      if (state.location === 'otherCylinders') return feedback(state, 'Those cylinders are outside this challenge, not mechanically invalid. The representative front cylinder is the only piston location included here.');
      if (state.location !== destinations[state.selected]) return feedback(state, `That location does not match ${PARTS[state.selected].name.toLowerCase()}. Check the shape and matching mounting surfaces.`);
      return { ...state, parts: { ...state.parts, [state.selected]: 'seated' }, phase: 'inspect', location: null,
        feedback: `${PARTS[state.selected].name} seated.${state.fasteners[state.selected] ? ' Secure both representative fasteners to retain it.' : ''}`, tone: 'success' };
    }
    case 'cancel':
      return state.phase === 'locate' ? { ...state, phase: 'inspect', location: null, feedback: 'Placement cancelled. Your assembly progress is preserved.', tone: 'info' } : state;
    case 'tool':
      return ['socket', 'screwdriver', 'mallet'].includes(action.tool) ? { ...state, tool: action.tool, feedback: `${action.tool === 'socket' ? 'Socket tool' : action.tool} selected.`, tone: 'info' } : state;
    case 'fasten': {
      const part = state.selected;
      if (!state.fasteners[part]) return feedback(state, 'Select a seated matching cap to secure its fasteners.');
      if (action.index !== 0 && action.index !== 1) return state;
      if (state.fasteners[part][action.index]) return state;
      if (state.parts[part] !== 'seated') return feedback(state, 'Seat this matching cap before securing its fasteners.');
      if (state.tool !== 'socket') return feedback(state, 'These fasteners need the socket tool. Choose it before securing them.');
      const fasteners = state.fasteners[part].map((value, index) => value || index === action.index);
      const secured = fasteners.every(Boolean);
      return { ...state, fasteners: { ...state.fasteners, [part]: fasteners }, parts: { ...state.parts, [part]: secured ? 'secured' : 'seated' },
        feedback: secured ? `${PARTS[part].name} secured.` : 'Fastener secured. Secure the other representative fastener as well.', tone: 'success' };
    }
    case 'hint': {
      const stage = getStage(state);
      return { ...state, hints: { ...state.hints, [stage]: Math.min(4, (state.hints[stage] || 0) + 1) }, hintRequests: state.hintRequests + 1 };
    }
    case 'test':
      if (!canTest(state)) return feedback(state, 'Seat the connected assembly and secure both representative fasteners on each cap before the hand-turn test.');
      return state.testStarted ? state : { ...state, testStarted: true, angle: 0, testTravel: 0, playing: false, feedback: 'Turn the crankshaft through one full revolution. Step controls also work with reduced motion.', tone: 'info' };
    case 'toggle-play':
      return state.testStarted && canTest(state) ? { ...state, playing: !state.playing } : feedback(state, 'Complete and secure the assembly, then start the hand-turn test.');
    case 'step':
      return state.testStarted && canTest(state) ? move(state, Math.PI / 12, (state.angle + Math.PI / 12) % TURN, false) : feedback(state, 'Complete and secure the assembly, then start the hand-turn test.');
    case 'angle': {
      if (!Number.isFinite(action.angle)) return state;
      if (!state.testStarted || !canTest(state)) return feedback(state, 'Complete and secure the assembly, then start the hand-turn test.');
      const angle = Math.max(0, Math.min(TURN, action.angle));
      return move(state, angle - state.angle, angle, false);
    }
    case 'tick':
      return state.playing && state.testStarted && canTest(state) && Number.isFinite(action.delta) && action.delta > 0
        ? move(state, action.delta, (state.angle + action.delta) % TURN, true) : state;
    case 'pause': return state.playing ? { ...state, playing: false } : state;
    case 'section': return { ...state, section: !state.section };
    case 'reset': return initialState();
    default: return state;
  }
}
