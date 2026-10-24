# Project 442 — Parts explorer / Pilot 006

Choose a part and see it installed automatically in a detailed, illustrative one-cylinder cutaway. This pilot focuses on recognizing components and understanding their connections.

## Explore

- Select **Crankshaft** or **Piston** first; either order works. The **Connecting rod** needs both connection points. The **Wrist pin** completes the piston-to-rod pivot.
- A blocked selection leaves the assembly intact and names the missing connections. **Explain this connection** adds optional context. These are learning dependencies, not a factory assembly procedure.
- Select an added part to highlight it and read its role. **Look closer** isolates it with feature labels; **Back to assembly** restores the complete view. **About the block**, **Side view**, **Reset view** and **Cutaway** support inspection.
- Once all four parts are present, **Turn slowly**, **Step 15°** or the crank slider shows how the circular crank motion relates to the piston’s travel. Selecting a part pauses motion. Reduced motion keeps manual controls; backgrounding pauses animation.
- **Reset assembly** clears the parts and motion for another order. Native buttons and range controls support touch and keyboard without precision placement.

The block is prepared. Rings, bearings and matching caps accompany their parent components. Geometry is internally consistent but illustrative—not verified Rocket 400 dimensions, a complete engine or repair instructions. See [mechanical assumptions](MECHANICAL_REFERENCES.md).

## Development and evidence

Existing stack: Three.js, Vite, Playwright and Node. No new packages or services.

- `npm test` — state, geometry and linkage checks, including preserved historical tests.
- `npm run build` — pilot and preserved Prototype005 entry.
- `npm run test:browser` — current pilot mouse/touch, invalid order, hints, reset, motion, recovery and archive smoke checks.
- `npm run preview -- --port 4180` then `node tests/pilot-measure.mjs` — production-build screenshots and cloud measurements. `PROOF_URL` / `EVIDENCE_DIR` can override the defaults.

[Plan and budgets](PILOT_PARTS_PLAN.md) · [Verification record](PILOT_PARTS_VERIFICATION.md) · [Screenshots](review/parts-explorer/README.md)

`src/pilot-state.js` owns assembly and motion state. `src/pilot-model.js` owns the focused procedural section; `src/pilot-main.js` and `src/pilot.css` present the selection and learning interface. The existing analytic linkage solver remains unchanged. Browser diagnostics expose read-only state/geometry for evidence.

Development branch: `dev/pilot-006-parts-explorer`. Only its separate Preview is authorized. No merge or production promotion.

## Earlier versions

Prototype005 source remains in `src/main.js`, `src/subassembly.js`, `src/engine.js` and `src/style.css`. Its original entry is preserved as `prototype-005.html`, included in the build, with [its original usage guide](PROTOTYPE005_README.md). Earlier branches, reports and evidence directories remain unchanged. Old browser scenarios remain in `tests/browser.spec.js`; the default browser configuration now runs Pilot006.

Cloud Chromium/SwiftShader and touch emulation establish automated reachability, not physical iPhone/Safari usability or performance.
