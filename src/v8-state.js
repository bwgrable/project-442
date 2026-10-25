import { CYLINDERS } from './v8-mechanics.js';
export { CYLINDERS };
const part = (name, role, detail, features) => Object.freeze({ name, role, detail, features: Object.freeze(features) });
export const PARTS = Object.freeze({
  bearings: part('Main bearings', 'Support the crankshaft on a low-friction surface.', 'The upper shells fit the prepared block. Matching lower shells are included with the main caps in this teaching model.', ['Upper bearing shells', 'Main journal support']),
  crank: part('Crankshaft', 'Shares rotation between all eight connecting rods.', 'Four illustrative throws carry pairs of rods. Their phases demonstrate cross-plane geometry, not a verified firing sequence.', ['Four offset throws', 'Five main journals', 'Counterweights']),
  mainCaps: part('Main caps', 'Secure the crankshaft in its main bearings.', 'Five matching caps and their lower bearing shells secure the shaft. This is a learning dependency, not a workshop assembly procedure.', ['Five caps', 'Lower bearing shells', 'Representative fasteners']),
  ...Object.fromEntries(CYLINDERS.map(c => [`piston_${c.id}`, part(`Piston ${c.id}`, 'Slides along its cylinder bore.', `${c.id} is a teaching label, not a factory cylinder number. The piston stays at its resting position until its rod joint set is installed.`, ['Crown and rings', 'Open skirt', 'Wrist-pin bosses'])])),
  ...Object.fromEntries(CYLINDERS.map(c => [`rod_${c.id}`, part(`Rod joint set ${c.id}`, 'Connects this piston to the shared crankshaft.', 'This selectable set includes the connecting rod, wrist pin, big-end bearing and matching rod cap. Installing it completes this cylinder’s mechanical connection.', ['Connecting rod', 'Wrist pin', 'Bearing and matched cap'])])),
  pump: part('Oil pump and pickup', 'Illustrates the oil supply hardware below the block.', 'A representative pump mounts to the prepared block and its pickup reaches the sump. Pump drive and oil flow are not simulated.', ['Block mount', 'Pump body', 'Sump pickup']),
  pan: part('Oil pan', 'Closes the underside and holds the oil supply.', 'The hollow pan encloses the completed bottom end. Cutaway opens the floor and near walls for learning; the full view restores the enclosing pan.', ['Hollow sump', 'Mounting flange', 'Drain plug']),
});
export const ORDER = Object.freeze(['bearings', 'crank', 'mainCaps', ...CYLINDERS.map(c => `piston_${c.id}`), ...CYLINDERS.map(c => `rod_${c.id}`), 'pump', 'pan']);
const NEEDS = Object.freeze(Object.fromEntries(ORDER.map(id => [id, id === 'crank' ? ['bearings'] : id === 'mainCaps' ? ['crank'] : id.startsWith('rod_') ? [`piston_${id.slice(4)}`, 'mainCaps'] : id === 'pan' ? ['pump', ...CYLINDERS.map(c => `rod_${c.id}`)] : []])));
const wrap = angle => ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
export function initialState() { return { installed: Object.fromEntries(ORDER.map(id => [id, false])), selected: null, activeCylinder: 'A1', hint: false, playing: false, angle: 0, feedback: 'Choose a part to explore and install.', tone: 'info' }; }
export function missingFor(state, id) { return ORDER.includes(id) ? NEEDS[id].filter(key => !state.installed[key]) : []; }
export function canRun(state) { return Boolean(state.installed.mainCaps); }
export function connectedCount(state) { return CYLINDERS.filter(c => state.installed[`rod_${c.id}`]).length; }
export function isComplete(state) { return ORDER.every(id => state.installed[id]); }
export function transition(state, event) {
  if (!event || typeof event !== 'object') return state;
  switch (event.type) {
    case 'reset': return initialState();
    case 'cylinder': {
      const id = event.cylinder ?? event.id;
      return CYLINDERS.some(c => c.id === id) ? { ...state, activeCylinder: id, selected: null, playing: false } : state;
    }
    case 'select': {
      const id = event.part ?? event.id;
      if (!ORDER.includes(id)) return state;
      const missing = missingFor(state, id), installed = state.installed[id];
      const need = missing.length > 3 ? `${missing.includes('pump') ? 'the oil pump and ' : ''}${missing.filter(key => key.startsWith('rod_')).length} rod joint sets` : missing.map(key => PARTS[key].name.toLowerCase()).join(' and ');
      return { ...state, selected: id, activeCylinder: /^(piston|rod)_/.test(id) ? id.split('_')[1] : state.activeCylinder, playing: false, installed: missing.length || installed ? state.installed : { ...state.installed, [id]: true }, tone: missing.length ? 'blocked' : 'success', feedback: missing.length ? `${PARTS[id].name} needs ${need} first.` : `${PARTS[id].name} ${installed ? 'selected' : 'installed'}. ${PARTS[id].role}` };
    }
    case 'hint': return { ...state, hint: !state.hint };
    case 'pause': return state.playing ? { ...state, playing: false } : state;
    case 'toggle-play': return canRun(state) ? { ...state, playing: !state.playing } : state;
    case 'angle':
    case 'step': {
      const value = event.type === 'angle' ? event.angle : event.delta;
      if (!canRun(state) || typeof value !== 'number' || !Number.isFinite(value)) return state;
      const angle = event.type === 'angle' ? value : state.angle + value;
      return Number.isFinite(angle) ? { ...state, angle: wrap(angle), playing: false } : state;
    }
    case 'tick': {
      const delta = event.deltaSeconds ?? event.delta;
      if (!canRun(state) || !state.playing || typeof delta !== 'number' || !Number.isFinite(delta) || delta < 0) return state;
      const angle = state.angle + delta * .3;
      return Number.isFinite(angle) ? { ...state, angle: wrap(angle) } : state;
    }
    default: return state;
  }
}
