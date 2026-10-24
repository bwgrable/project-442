# Pilot 006 — parts explorer verification

This report and its evidence belong to the commit containing them on `dev/pilot-006-parts-explorer`, based on `6eaa665f2a8cda1b14fa9a515358f3dd296a52ca`. Brent explicitly confirmed the coordinator preference and separate Preview publication on October 24. [The plan and budgets](PILOT_PARTS_PLAN.md) were recorded before implementation.

## Result

Selecting a component installs it automatically when its connections exist. Crankshaft and piston work in either order; rod needs both, and wrist pin completes the joint. Invalid selection names the missing parts without changing assembly state. Repeated selection is idempotent and opens that part's learning context. Explanations are optional. Reset clears the assembly and motion for replay.

The dedicated one-cylinder section exposes a machined deck and bore, cast surfaces and copper cut faces, crank journals/counterweights, piston ring grooves and open wrist bosses, the rod's large/small ends, and a separate hollow pin. Cutaway mode removes the near cylinder wall and crank support with its associated hardware so the moving connection remains visible. Full view restores them. Isolated component inspection adds feature labels and a clear return to the assembly.

Complete assemblies support slow continuous crank motion, manual angles and steps. Selection pauses motion, backgrounding pauses it, and reduced motion retains manual controls. Geometry is illustrative; prepared bearings, caps and rings and the learning-order abstraction are disclosed. No factory dimensions, service authenticity or phone performance are claimed.

## Verification

- **43/43 unit tests passed** on the final source: eight new pilot state/model tests plus 35 preserved historical/linkage checks. Pilot checks cover both valid orders, blocked and repeated selection, optional hints, reset, motion eligibility, invalid numbers/events, finite geometry, independent materials and render budgets. Actual bore rays verify piston/rod pin clearance and the hollow pin. Joint centers and rod length hold over 360 positions; the existing solver also retains its 1,440-position analytic test. Parallel sightline rays matching the orthographic assembly camera confirm the block does not hide the crankpin through a full revolution in section view.
- **5/5 browser scenarios passed on the final runtime build in 30.2 seconds.** Actual mouse and emulated touch controls cover invalid order, missing-prerequisite explanation, both starting orders, repeated selection, automatic installation, optional explanations, isolated inspection/return, separated feature labels, manual motion through 0–360°, slow playback/pause, reset/replay, touch targets >=44px and no horizontal overflow. Keyboard/reduced-motion, background pause, landscape, WebGL loss and failed application download recovery also pass. An archive smoke check loads the preserved Prototype005 application.
- Browser journeys use native buttons/range inputs and read-only diagnostics. No state setters or test-only installation helpers exist. Recovery tests synthesize the relevant browser lifecycle/loss event; they do not prove physical OS behavior.
- Production build succeeds. Pilot initial HTML 6.26 kB / 2.78 kB gzip; CSS 12.14 / 3.44; pilot JavaScript 20.58 / 8.64; shared JavaScript 576.71 / 145.91. Approximate initial gzip total **160.77 kB**, below the 5 MB budget. The preserved Prototype005 entry has separate assets. Vite's existing >500 kB raw shared-chunk advisory remains.
- A newly added bore-ray check initially sampled radius .0489 inside the nominal .049 circle but outside some facets of the polygonal bore. The test now samples .048 within its inscribed clearance; no geometry or gameplay bypass was introduced. All final tests pass.

## Independent review and repairs

Coordinator preference was confirmed as GPT-6 Astra/high. The bounded implementer was requested as GPT-6.1 Sol/medium and owned state/model code and tests. Independent read-only reviewer was requested as GPT-6.1 Sol/high. These are requested configurations, not independent proof of effective serving settings. No recursive workers or overlapping ownership.

The reviewer exercised the actual touch interface using ordinary controls: invalid order, both orders, repeated selection, explanations, all component inspections/return, slow motion/pause, reset and landscape. No browser errors occurred. Review identified and closed:

1. The sticky phone scene could cover the external missing-prerequisite message. The exact explanation now appears inside the scene caption and was independently confirmed in the corrected phone capture.
2. Side view was enabled during isolated inspection even though those views use a fixed camera. It is disabled there.

Coordinator visual checks also separated overlapping feature labels and removed floating near-support hardware when its casting is sectioned. The reviewer checked the final cleanup and captures with **no unresolved functional findings**. Prototype005 preservation was independently checked against the baseline.

## Visual evidence and budgets

[Eleven inspected captures and raw measurements](review/parts-explorer/README.md) show the opening, blocked choice, assembled mechanism, piston/pin detail and phone landscape. Phone captures are ordinary scrolled viewports, retaining the sticky engine beside visible controls; desktop captures show the full page.

Final production-build samples: cloud Chromium 154.0.8037.57 / SwiftShader, DPR 1, 10 Mbps download and 100 ms network latency:

| Viewport | Ready | Render sample | Average rendered FPS | rAF p95 |
| --- | ---: | ---: | ---: | ---: |
| Desktop 1440 × 1100 | 2.083 s | 36 frames / 6.179 s | 5.83 | 383.4 ms |
| Touch emulation 390 × 844 | 1.516 s | 69 frames / 6.103 s | 11.31 | 166.6 ms |

Both record **15,536 triangles / 22 draw calls**, zero page errors and no horizontal overflow. Size, these loading samples, and scene complexity meet their recorded budgets. Software-rendered motion does not meet 30 FPS and is not a smoothness pass. The <=100 ms input-feedback budget and >=30 FPS for five minutes on a baseline physical phone remain unverified; rAF intervals are not input latency.

## Preservation, files and delivery

- New runtime: `src/pilot-main.js`, `src/pilot-state.js`, `src/pilot-model.js`, `src/pilot.css`; pilot `index.html`.
- New checks/evidence: `tests/pilot-state.test.js`, `tests/pilot-model.test.js`, `tests/pilot.browser.spec.js`, `tests/pilot-measure.mjs`, `review/parts-explorer/`.
- Build/test routing: `vite.config.js` includes both HTML entries; default Playwright configuration runs the pilot.
- Documentation: this report, pilot plan, current README, appended mechanical assumptions; original README preserved as `PROTOTYPE005_README.md`.
- `prototype-005.html` matches baseline `index.html` exactly. Original `src/main.js`, `src/style.css`, `src/engine.js`, `src/subassembly.js` and `src/mechanics.js` remain unchanged. Earlier branches and historical evidence are preserved.

Only the pilot branch's separate Preview is authorized. No production merge/promotion, dependency installation, credentials, permission, infrastructure, deployment-protection or recurring-cost changes. Delivery uses the existing GitHub/Vercel integration and actual commit status/check-run evidence. The desktop connector/browser's previously established scope/authentication limitation is not bypassed; deployment readiness does not itself verify the hosted user journey.

Actual iPhone/Safari usability, real OS interactions and sustained device performance remain owner acceptance. No unfinished implementation is claimed to be running in the background.
