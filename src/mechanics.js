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

export function initialState() {
  return { selected: 'block', phase: 'bench', angle: Math.PI / 4, playing: false, section: true };
}

// One owner for placement, motion and reset. Repeated input cannot duplicate parts.
export function transition(state, action) {
  switch (action.type) {
    case 'select': return { ...state, selected: action.part, phase: state.phase === 'aligned' ? 'bench' : state.phase };
    case 'align': return state.phase === 'bench' && state.selected === 'piston' ? { ...state, phase: 'aligned', playing: false } : state;
    case 'cancel': return state.phase === 'aligned' ? { ...state, phase: 'bench' } : state;
    case 'place': return state.phase === 'aligned' ? { ...state, phase: 'installed', playing: false } : state;
    case 'toggle-play': return state.phase === 'installed' ? { ...state, playing: !state.playing } : state;
    case 'step': return state.phase === 'installed' ? { ...state, playing: false, angle: (state.angle + Math.PI / 12) % (2 * Math.PI) } : state;
    case 'angle': return state.phase === 'installed' ? { ...state, playing: false, angle: action.angle } : state;
    case 'tick': return state.playing ? { ...state, angle: (state.angle + action.delta) % (2 * Math.PI) } : state;
    case 'section': return { ...state, section: !state.section };
    case 'reset': return initialState();
    default: return state;
  }
}
