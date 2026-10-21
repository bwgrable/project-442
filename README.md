# Project 442 — Small pile / Prototype 004

Four loose parts, an engine block, and a connection to figure out. **Drag actual parts around the bench, roll them until they fit, and release to connect.** Once the assembly is connected, turn the crank and watch the piston move.

The crankshaft, matching main-cap set, representative piston/rod and rod cap are all available immediately. A tap selects only. Nearby fit feedback checks position, orientation and mechanically necessary prerequisites. No mounting-location menu, tool choice or fastening checklist. Optional hints advance only when requested.

## Interaction

- Drag a visible piece to move it continuously across the workbench. Use the selected-part roll buttons before dragging, or Q/E while holding it. Release checks the fit.
- Drag empty space to orbit, or choose **Orbit view** to inspect without moving pieces. **Whole bench** recovers the framing. Pinch zoom is supported; adding a second finger during a part drag cancels it, then a fresh gesture can control the camera.
- **Lift out** or dragging a connected part removes it and returns joined dependent pieces to the bench. Independently rearranged loose pieces stay where they were. Motion first returns to the inspection pose. **Undo** restores a consistent snapshot.
- **Return to bench** recovers a selected piece. **Cancel** / Escape restores the pending pickup. Resize, backgrounding, focus loss and interrupted capture cancel unfinished placement. **Start over** resets parts, hints, history and motion.
- **Move without dragging** supplies the same fit rules through named selection, pickup, directional controls, roll and drop. With the canvas focused: Space picks up; arrows move; Q/E roll; Enter drops; Escape cancels. There is no auto-solve control.
- When all four parts connect, the slider, 15° steps and optional continuous turning drive the constrained mechanism. Reduced motion retains slider and stepping.

## What is simplified

This is a small spatial experiment, not a full engine or unrestricted six-axis CAD. Pieces move on a horizontal X/Z plane. Roll is adjustable; axial alignment and final seating height are preset. Snap distance is 0.65 illustrative scene units and roll tolerance is 12°. Bearings, rings and wrist pin are prepared. The main caps are one set; connections stand in for fastening. Proportions, casting and mechanical procedures are **illustrative, not factory-verified service data**. Other cylinders are outside the experiment.

The Three.js geometry and fixed-length slider-crank solver are reused from Prototype 003. No backend, accounts, live AI, external models, paid assets or new infrastructure are added.

See [the authorized plan and budgets](SMALL_PILE_PLAN.md), [verification and limitations](SMALL_PILE_VERIFICATION.md), and [mechanical assumptions](MECHANICAL_REFERENCES.md). Prototype 003's [gameplay report](GAMEPLAY_VERIFICATION.md) is historical evidence for its own revision, not this build.

## Development

Pinned dependencies: Three.js 0.186.1, Vite 8.3.4, Playwright 1.64.1. Cloud runtime: Node 24. Install with `npm ci` when needed.

- `npm run dev` — development server.
- `npm test` — kinematics, geometry and small-pile state tests.
- `npm run build` — production bundle in `dist/`.
- `npm run test:browser` — direct pointer/touch, fallback and recovery tests against the built bundle.
- `npm run preview -- --port 4174`, then `node tests/measure.mjs` — labeled screenshots and cloud measurements. `PROOF_URL`, `EVIDENCE_DIR` and `CHROMIUM_PATH` can override defaults.

Cloud browsers use Chromium with SwiftShader. Emulated viewports, synthetic touch/visibility/context events and short software-rendering samples do not establish physical iPhone/Safari/Android behavior or the five-minute hardware performance budget.

`src/pile.js` owns all placement, orientation, dependencies, transactions, hints and motion state. `src/mechanics.js` contains the unchanged solver; `src/engine.js` contains the illustrative geometry. `src/main.js` integrates the scene and inputs. Tests never mutate the application through a hidden state-setting API; diagnostics expose read-only transforms/projections to drive actual input.

Development branch: `dev/prototype-004-small-pile`. Main and the prior immutable previews are preserved. Production promotion is not part of this delivery.
