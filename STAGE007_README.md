# Project442 — V8 bottom end / Stage007

Build a larger engine study by selecting parts that install automatically. The prepared block contains two banks of four cylinders, with one shared crankshaft and selectable bearing/cap sets, eight piston/rod connections, oil pump/pickup and oil pan.

## Explore the build

- **Crank & supports:** main bearings, crankshaft, then main caps. Once the shaft is supported, manual or slow rotation is available.
- **Eight cylinders:** choose A1–A4 or B1–B4, then its piston and connecting-rod joint set. Pistons may be added before the crank; each rod needs its piston and the secured shaft. The joint set includes the wrist pin, big-end bearing and matched rod cap.
- **Pump & pan:** the representative pump/pickup can be added independently to the prepared block. The pan closes the underside after the pump and all eight cylinder connections are complete.
- Blocked choices explain what is missing, including in the mobile scene caption. **Explain this connection** adds optional context. Repeated selection pauses motion and highlights an existing part without duplicating it.
- **Both banks**, **Bank A**, **Bank B** and **Underside** show different relationships. Bank labels map the cylinder buttons to the bores. **Look closer** isolates an installed component; **Back to assembly** restores the build.
- **Cutaway** opens casting walls and the near walls/floor of the installed pan. Full view restores the enclosure. **Reset assembly** permits another build order.
- **Turn slowly**, **Step15°** and the crank slider move the supported shaft and connected pistons. Unconnected installed pistons remain at their teaching rest positions. Reduced motion retains manual controls, and backgrounding pauses playback.

This is illustrative teaching geometry, not a verified Rocket400 assembly procedure, factory cylinder numbering, firing order or service specification. Pump drive, oil flow, combustion, heads and valvetrain are outside scope. [Mechanical assumptions](MECHANICAL_REFERENCES.md) record the distinctions.

## Development and evidence

Existing Three.js/Vite/Playwright stack; no added dependencies or services.

- `npm test` — V8 and preserved state, geometry and analytic linkage tests.
- `npm run build` — Stage007 plus preserved Pilot006 and Prototype005 HTML entries.
- `npm run test:browser` — current desktop/touch builds, alternative orders, hints, invalid choices, repeats, reset, inspection/cutaway, all-cylinder motion, recovery and historical-entry checks.
- `npm run preview -- --port 4190`, then `node tests/v8-measure.mjs` — production-build captures and cloud samples. `PROOF_URL`, `EVIDENCE_DIR` and `CHROMIUM_PATH` can override defaults.

[Plan and budgets](V8_BOTTOM_END_PLAN.md) · [Verification](V8_BOTTOM_END_VERIFICATION.md) · [Visual evidence](review/v8-bottom-end/README.md)

`src/v8-state.js` owns installation and motion eligibility. `src/v8-mechanics.js` extends the unchanged slider-crank solver to eight illustrative cylinder lanes. `src/v8-model.js` owns geometry; `src/v8-main.js` and `src/v8.css` present the interface. Diagnostics are read-only.

Branch: `dev/stage-007-v8-bottom-end`. Only this branch's separate Preview is authorized. Main and earlier branches remain unchanged.

## Preserved versions

- [Pilot006 guide](PILOT006_README.md); runnable `pilot-006.html`; original `src/pilot-*` files unchanged.
- [Prototype005 guide](PROTOTYPE005_README.md); runnable `prototype-005.html`; original subassembly source unchanged.
- Earlier browser test files and reports remain historical evidence. Default Playwright configuration now runs Stage007.

Cloud Chromium/SwiftShader and touch emulation establish tested behavior, not real iPhone/Safari performance or usability.
