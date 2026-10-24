// Learning dependencies, not a workshop assembly procedure. Caps and bearings
// are prepared with the block and rod to keep the pilot focused on four parts.
export const ORDER = Object.freeze(['crank', 'piston', 'rod', 'pin']);
export const PARTS = Object.freeze({
  crank: { name: 'Crankshaft', role: 'Turns the piston’s push into rotation.', detail: 'Its offset journal gives the rod a moving connection. The prepared main bearings support the shaft; their caps are included in this exhibit.', features: ['Offset crank journal', 'Polished main journals', 'Counterweights'] },
  piston: { name: 'Piston', role: 'Slides along the cylinder and receives the push.', detail: 'The rings meet the cylinder wall. The skirt guides the piston, while the open bosses carry the wrist pin.', features: ['Crown and ring grooves', 'Open skirt', 'Wrist-pin bosses'] },
  rod: { name: 'Connecting rod', role: 'Connects the sliding piston to the rotating crank.', detail: 'The large end follows the crank journal; the small end pivots at the piston. Its bearing and matched lower cap install together here.', features: ['Large crank end', 'Stiffened beam', 'Small wrist-pin end'] },
  pin: { name: 'Wrist pin', role: 'Makes a pivot between piston and rod.', detail: 'This separate hollow pin passes through the piston bosses and rod’s small end, allowing the rod to swing as the crank turns.', features: ['Hollow polished tube', 'Piston-to-rod pivot'] },
});
const NEEDS = { crank: [], piston: [], rod: ['crank', 'piston'], pin: ['piston', 'rod'] };
const TAU = Math.PI * 2;
const wrap = angle => ((angle % TAU) + TAU) % TAU;
export function initialState() {
  return { installed: Object.fromEntries(ORDER.map(id => [id, false])), selected: null, hint: false, playing: false, angle: 0, feedback: 'Choose a part to explore and install.', tone: 'info' };
}
export function missingFor(state, id) {
  return ORDER.includes(id) ? NEEDS[id].filter(part => !state.installed[part]) : [];
}
export function canRun(state) { return ORDER.every(id => state.installed[id]); }
export function transition(state, event) {
  if (!event || typeof event !== 'object') return state;
  switch (event.type) {
    case 'reset': return initialState();
    case 'select': {
      const id = event.part;
      if (!ORDER.includes(id)) return state;
      const missing = missingFor(state, id);
      const installed = state.installed[id];
      return { ...state, selected: id, playing: false,
        installed: missing.length || installed ? state.installed : { ...state.installed, [id]: true },
        tone: missing.length ? 'blocked' : 'success',
        feedback: missing.length ? `${PARTS[id].name} needs ${missing.map(part => PARTS[part].name.toLowerCase()).join(' and ')} first.` : installed ? `${PARTS[id].name} selected. ${PARTS[id].role}` : `${PARTS[id].name} installed. ${PARTS[id].role}` };
    }
    case 'hint': return { ...state, hint: !state.hint };
    case 'pause': return state.playing ? { ...state, playing: false } : state;
    case 'toggle-play': return canRun(state) ? { ...state, playing: !state.playing } : state;
    case 'angle':
    case 'step': {
      const value = event.type === 'angle' ? event.angle : event.delta;
      if (!canRun(state) || typeof value !== 'number' || !Number.isFinite(value)) return state;
      const angle = event.type === 'angle' ? value : state.angle + value;
      if (!Number.isFinite(angle)) return state;
      return { ...state, angle: wrap(angle), playing: false };
    }
    case 'tick': {
      if (!state.playing || !canRun(state) || typeof event.delta !== 'number' || !Number.isFinite(event.delta) || event.delta < 0) return state;
      const angle = state.angle + event.delta * .3;
      return Number.isFinite(angle) ? { ...state, angle: wrap(angle) } : state;
    }
    default: return state;
  }
}
