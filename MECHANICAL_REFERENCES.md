# Mechanical assumptions and reference register

No factory-reference CAD, Rocket 400 dimensions, torque specifications or engine-specific offsets have been verified for this prototype. Nothing in this register upgrades the procedural model to an authentic service representation.

| Item | Value / orientation | Provenance | Verification and uncertainty |
| --- | --- | --- | --- |
| Crank radius | 0.42 scene units | Authored illustrative proportion in `src/mechanics.js` | Tested as an invariant; no conversion to inches or millimetres |
| Rod pin-center length | 1.45 scene units | Authored illustrative proportion | Independently tested through 1,440 angular increments |
| Representative bore axis | 45° from +Y toward +X; station Z=1.2 | Chosen scene coordinate system | Pin centers constrained to this axis; no engine-specific offset asserted |
| Crank axis | Z; main journals centered at X=Y=0 when installed | Procedural geometry | Crankpin circles at the stated radius |
| Piston origin / rod endpoint | Wrist pin; local rod endpoint Y=1.45 | Explicit scene origins | World coordinates compared in browser tests |
| Matching caps | Five main caps grouped; one rod cap copied with rod transform | Authored split geometry | Open mating halves, matching bearing shells and fasteners; real part identity/orientation not validated |
| Bearings and rings | Already prepared; block/crank/main caps also prepared in Prototype 005 | Explicit experiment abstraction | No installation or service claim |
| Wrist joint | Separate .075-radius, .57-length pin; .079 piston bore and .078 rod bore, scene units | Internally matched illustrative geometry | Open axial bore rays and joint-center tests; not factory specifications |
| Connection | Spatial fit plus constrained wrist-pin insertion in Prototype 005 | Gameplay abstraction | No tool selection, real torque, bolt sequence, stretching or preload simulation |
| Seating | Continuous X/Z inspection-plane dragging, adjustable roll, dynamic piston target, constrained axial pin insertion; final engine orientation/height preset | Gameplay abstraction | No physical insertion, force or collision simulation |
| Other cylinders | Visually present, outside the challenge | Bounded scope | Other cylinder locations are not represented as mechanically invalid |
| Surface finish, casting, counterweights | Procedural approximation | Authored model; preserved visual-proof style | Not factory CAD or verified historical finish |

## Kinematic derivation

Let `u = (sin β, cos β)` be the unit cylinder axis, `C = (r sin θ, r cos θ)` the crankpin, and `P = d u` the wrist pin. Requiring `|P − C| = L` gives:

`d = C·u + sqrt(L² − r² + (C·u)²)`.

The positive root is used with `L > r`. At `θ = β`, the distance is `L+r`; at `θ = β+π`, it is `L−r`. Stroke is therefore `2r` in this selected in-line mechanism. These mathematical properties are verified separately from rendering and frame rate. The model does not assert engine-specific offsets or verified dynamic behavior.

A future claim of factory accuracy requires authoritative references with edition/page, measured dimensions, orientation and remaining uncertainty. That research and any corresponding fidelity expansion remain outside this delivery.
