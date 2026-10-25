import { linkage } from './mechanics.js';
// Teaching geometry only: labels and phases are not factory numbering or firing order.
export const V8 = Object.freeze({ radius: .42, rodLength: 1.45, stations: Object.freeze([-1.35, -.45, .45, 1.35]), phases: Object.freeze([Math.PI / 2, Math.PI, -Math.PI / 2, 0]), bankAngle: Math.PI / 4, bankOffset: .12, rodWidth: .195, crankpinLength: .56, mainStations: Object.freeze([-1.8, -.9, 0, .9, 1.8]) });
export const CYLINDERS = Object.freeze(['A', 'B'].flatMap(bank => V8.stations.map((station, i) => Object.freeze({ id: `${bank}${i + 1}`, bank, index: i + 1, station, phase: V8.phases[i], bankAngle: bank === 'A' ? V8.bankAngle : -V8.bankAngle, axialOffset: bank === 'A' ? .12 : -.12 }))));
export function v8Linkage(angle, id) {
  const cylinder = CYLINDERS.find(c => c.id === id);
  if (!cylinder) throw new RangeError('Unknown teaching cylinder.');
  if (typeof angle !== 'number' || !Number.isFinite(angle)) throw new TypeError('Angle must be finite.');
  return { ...linkage(angle + cylinder.phase, { radius: V8.radius, rodLength: V8.rodLength, bankAngle: cylinder.bankAngle, station: cylinder.station + cylinder.axialOffset }), cylinder };
}
