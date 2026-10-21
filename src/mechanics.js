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
