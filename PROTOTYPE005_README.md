# Project 442 — Make a connection / Prototype 005

Build a small mechanism on the bench, then connect it to the prepared engine. The piston, connecting rod and wrist pin begin as separate visible pieces. Move the piston anywhere on the bench, fit the rod to its current bore, and slide the separate pin through. Once pinned, the unit carries together and the rod can swing about the wrist joint.

## Interaction

- Drag actual pieces across the bench. A tap selects only. Roll the piston or rod in 15° steps using the adjacent buttons or Q/E.
- Fit the rod's small round eye into the piston wrist bore. Its starting 30° swing is valid; fitting keeps that angle. Nearby rings identify the two openings, and the drop result stays visible. This temporary fit is not a carrying joint: moving either piece separates them.
- Drag the separate pin above the aligned bores and release. Then drag the pin down along its axis to insert it continuously. Partial insertion stays unfinished; release fully inserted to join. The nearby controls also provide small insertion/withdrawal steps.
- Carry the pinned unit by dragging its piston, rod or pin. Use **Swing the rod** to inspect the pivot. **Pull pin out** separates the joint coherently; **Undo** reverses changes.
- Choose **Engine + bench**, return the rod pivot and unit roll into line, then drag the completed unit into the representative cylinder. Fit the loose rod cap to close the crank connection. Turn the crank through a revolution and watch the joint transfer motion. **See joint closer** frames the working connection beside the crank controls.
- **Bench view**, **Look closer**, empty-space orbit and pinch zoom support inspection. A second finger cancels an active part drag; lift both fingers before starting a fresh camera gesture. Scroll outside the 3D view.
- **Cancel** / Escape, capture loss, resizing and backgrounding restore the pending transaction and pause motion. **Separate / return**, **Lift unit out**, **Undo** and **Start over** keep dependencies consistent.
- **Move without dragging** offers named selection, pickup, directional controls and release using identical fit rules. With the canvas focused: Space picks up; arrows move (Up/Down slides an aligned pin); Q/E rolls; Enter releases; Escape cancels. Optional hints progress only on request. Reduced motion retains crank slider/steps.

## Scope and simplification

The block, crankshaft, main caps, bearings and rings are prepared. The focused experiment is one piston/rod/pin unit plus its final rod-cap connection. Bench parts lie in a horizontal inspection plane with pin axes prepared; roll is adjustable. Insertion is constrained to the pin axis. Final cylinder orientation and vertical seating are preset. There is no rigid-body collision, force, fastening or service-procedure simulation.

The new separate pin fits actual hollow wrist bores and an open rod small end. Dimensions are internally consistent illustrative scene units, not verified Rocket 400 service specifications. The existing slider-crank solver drives installed motion. Other cylinders remain outside scope.

See [the plan and budgets](SUBASSEMBLY_PLAN.md), [original verification](SUBASSEMBLY_VERIFICATION.md), [rod-fit correction](ROD_FIT_FIX.md), and [mechanical assumptions](MECHANICAL_REFERENCES.md). Prior prototype reports and `review/small-pile` are historical evidence for their own revisions.

## Development

Existing stack: Three.js 0.186.1, Vite 8.3.4, Playwright 1.64.1, Node 24. No new dependencies or services.

- `npm test` — state, geometry and analytic linkage checks (including retained historical small-pile state checks).
- `npm run build` — production bundle.
- `npm run test:browser` — direct mouse/touch, keyboard, recovery and motion journeys against the build.
- `npm run preview -- --port 4174`, then `node tests/measure.mjs` — production-build screenshots and cloud samples. `PROOF_URL`, `EVIDENCE_DIR`, `CHROMIUM_PATH` override defaults.

`src/subassembly.js` owns active assembly state, fits, pin insertion, pivot, dependencies, history and motion eligibility. `src/main.js` integrates rendering/input. `src/engine.js` owns illustrative geometry; `src/mechanics.js` retains the constrained solver. The old `src/pile.js` is historical and not imported by the current app. Browser diagnostics are read-only and project rendered geometry for real-input tests.

Development branch: `dev/prototype-005-subassembly`. Cloud Chromium/SwiftShader and touch emulation do not establish physical iPhone performance or uncoached usability. Main, earlier previews and deployment protection remain unchanged.
