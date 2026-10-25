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

## Pilot 006 learning exhibit

Pilot006 retains the shared linkage dimensions and one active cylinder, presented as a focused section rather than a complete V8 casting. Its new model lives in `src/pilot-model.js`; earlier geometry remains unchanged.

- The block, bearing supports and main caps are prepared. Rings accompany the piston; the matched cap accompanies the rod. Selecting parts places them at the solver's defined connections.
- Crankshaft and piston may be selected in either order. Rod selection requires both; the pin requires the piston/rod joint. These are pedagogical dependencies, not a verified installation sequence.
- The illustrative pin is a separate hollow tube: outer radius .075, inner radius .049, length .63 scene units. Piston bore radius .079 and rod bore radius .078 remain internally consistent. No conversion to service dimensions is asserted.
- Section mode removes the near cylinder wall and near main support/bearing to expose the full crankpin path. Full view restores them. Copper faces mark authored cuts, not an original factory finish.
- Geometry tests verify finite/bounded meshes, clear wrist bores, a genuinely hollow pin, invariant pin centers/rod length over a revolution and an unobstructed crankpin sightline from the exhibit's assembly camera.

The exhibit demonstrates kinematic relationships only. It does not simulate combustion, loads, lubrication, collision, assembly forces, tolerances or service procedure.

## Stage007 V8 bottom end

The full bottom-end study uses the same illustrative crank radius .42 and rod length1.45, with two banks at±45°, four axial stations[-1.35,-.45,.45,1.35] and illustrative throw phases[90°,180°,-90°,0°]. Each station has two rod lanes at opposite .12 axial offsets. The .24 lane separation exceeds the .195 modeled big-end width, while both fit within the .56 crankpin span. These are authored scene units and phases, not verified Oldsmobile dimensions or a factory firing sequence. A1–A4/B1–B4 are teaching labels.

The existing slider-crank equation is solved separately for each bank and phased throw. Visible shaft throws use the same phases; piston axes and bores use the same bank angles/stagger. Tests check all eight centers, rod lengths, bore axes, repeatability and lane separation. Connected units follow the shaft; unconnected pistons are deliberately held at their resting pose for teaching.

Upper main bearings install into the prepared block, followed by crank and main caps with their lower shells. Each selectable rod joint set includes wrist pin, bearing and matched cap. Pump/pickup geometry represents lubrication hardware below the block; it does not claim model-specific mounting or simulate its drive/flow. The hollow pan closes after the pump and all eight rod joints are present. Section view removes the near pan walls, floor and attached drain plug; full view restores the enclosing geometry. These learning dependencies are not service instructions.

No new factory specifications, authenticity claims, heads, valvetrain or combustion model are introduced.
