# Prototype 005 verification

This report records the original Prototype 005 delivery at `b714f9f1142e4ec56412f97400f3969e17b418a8` on `dev/prototype-005-subassembly`, based on `53eaf2eccbb4a3e7f29e4a9274c3cb8c89983f07`. Scope and budgets were recorded before implementation in [SUBASSEMBLY_PLAN.md](SUBASSEMBLY_PLAN.md).

The subsequent playtest correction and its current evidence are recorded in [ROD_FIT_FIX.md](ROD_FIT_FIX.md). The measurements and screenshots below remain historical evidence for the original delivery.

## Implementation

Separate piston, connecting rod and wrist pin begin on a close inspection bench. The piston can be repositioned and rolled; the rod target follows its actual current wrist center. Temporary fit is distinct from a pinned joint. The pin first aligns, then a separate continuous axial gesture inserts it; ordinary taps/drops do not finish the joint. Partial insertion remains unfinished. Pinned pieces travel together, and the adjacent pivot control swings the rod around the fixed wrist center. The completed unit fits into the prepared engine, then the loose rod cap closes the crank connection and enables motion.

State owns placement, temporary fit, pin depth, pinned unit, pivot, installation, cap, undo/cancel and motion eligibility. Removing or unpinning after motion resets dependent components coherently; cancellation restores the previous parts, pivot and crank angle with animation paused. Direct drag and accessible controls use the same rules. Optional hints are requested explicitly.

`src/engine.js` now exposes a separate pin group and actual open piston wrist bosses/skirt windows. The illustrative pin radius is .075, piston bore .079 and rod bore .078 in scene units, with pin length .57 and unchanged rod length 1.45. Bore rays confirm clearance from both sides. These are internal model dimensions, not factory specifications or service advice. The slider-crank solver is unchanged.

## Team and independent review

The existing coordinator checkpoint carried forward. The bounded implementer was requested as GPT-6.1 Sol/medium and owned state, geometry and their unit tests. The independent read-only reviewer was requested as GPT-6.1 Sol/high; no recursive workers or overlapping ownership. These are requested tool configurations; effective serving settings are not independently introspectable.

Review found one small rendering defect: manual crank changes did not invalidate cached shadows. Paused angle now invalidates the map, moving crank shadows are suppressed during continuous motion, and pause restores them. Follow-up review verified the fix and control-state guards, with no remaining findings. Visual inspection also corrected the piston card to identify the pinned unit and added an optional close mechanism view beside the crank controls. The reviewer checked those bounded changes without new findings. The reviewer did not run a browser; browser evidence belongs to coordinator verification.

## Verification record

- `npm test`: 32/32 passed: ten current subassembly state tests, five geometry tests, two analytic linkage tests, and fifteen retained historical small-pile state tests.
- Initial desktop direct-input journey passed in 2.9 minutes: relocated piston, temporary rod fit, separate axial pin insertion, unit carrying/pivot, engine installation/cap, full revolution, direct lift/cancel, unpin and reconnect, reset. No test-only state mutation.
- The full eight-scenario browser run passed seven scenarios, including both complete mouse and touch journeys, wrong order/orientation and partial insertion, touch/camera separation, the 44 px pin target, keyboard/hints, WebGL recovery and failed-bundle recovery. The remaining recovery test incorrectly tried to click Undo with the same pointer still captured by a held drag: its mouse movement moved the part toward the toolbar, and the click stayed captured. The test now focuses Undo and presses Enter while holding the drag, a valid keyboard activation. No application bypass/state mutation was added.
- The corrected cancellation/recovery case and keyboard/hint case both passed on the final build (2/2 in 37.4 seconds). All eight scenarios have passing results across those runs. Recovery checks cover fallback-to-pointer switching, Undo during pickup without consuming earlier history, resize, pointer cancellation, lost capture and backgrounding. Phone landscape has no horizontal overflow. The final state guard also rejects fake roll on the pin's prepared axis; ten focused state tests passed again.
- Production build succeeds using existing dependencies: HTML 7.58 kB / 3.25 kB gzip, CSS 10.24 kB / 3.04 kB gzip, JavaScript 633.37 kB / 163.09 kB gzip; total estimated gzip 169.38 kB. The raw JavaScript chunk remains above Vite's 500 kB advisory threshold.
- After the final pinned-unit label and close mechanism view, the full phone touch journey passed again (1/1 in 54 seconds), including direct lifting/cancellation from that closer view.

## Changed files

- Runtime: `index.html`, `src/main.js`, `src/style.css`, `src/engine.js`, new `src/subassembly.js`.
- Checks: `tests/browser.spec.js`, `tests/helpers.mjs`, `tests/measure.mjs`, `tests/geometry.test.js`, new `tests/subassembly.test.js`.
- Documentation: `README.md`, `MECHANICAL_REFERENCES.md`, new `SUBASSEMBLY_PLAN.md` and this report.
- Evidence: `review/subassembly/README.md`, `measurements.json`, and desktop/mobile `opening`, `fitted`, `insertion`, `pivot`, and `engine` PNGs.

The repository working agreement, linkage solver, dependency manifests, deployment configuration and earlier evidence directories are unchanged.

## Inspected evidence and measured budgets

[Ten visually inspected screenshots and raw samples](review/subassembly/README.md) show separate pieces, temporary fit at the moved piston, 45% pin insertion, the pinned unit pivoted 45°, and the installed mechanism at 135°. Controls remain in document flow beside/below the scene without overlap. The close engine view intentionally crops some surrounding casting to enlarge the working connection; Engine + bench recovers the wider view.

Final local production-build samples at 10 Mbps / 100 ms, Chromium 154.0.8037.57, SwiftShader, DPR 1:

| Viewport | Ready | Close mechanism render sample | Average rendered FPS | rAF p95 |
|---|---:|---:|---:|---:|
| Desktop 1440 × 1080 | 2.835 s | 4 frames / 5.944 s | 0.67 | 1733.2 ms |
| Touch emulation 390 × 844 | 1.633 s | 9 frames / 5.485 s | 1.64 | 716.6 ms |

Both recorded 64,390 triangles, 33 draw calls, 165,572 resource transfer bytes excluding the HTML navigation, zero page errors and no horizontal overflow. Compressed build size and these loading samples meet the recorded size/loading targets. The software renderer is far below 30 FPS, especially in the close view; this is not a smoothness pass. The 100 ms input-feedback and five-minute physical-phone budgets remain unverified. An earlier wide-view sample was also below target (1.40 desktop / 2.55 emulated-phone FPS); the committed sample measures the final close mechanism view.

## Limits

Bench translation is X/Z with one roll axis and prepared pin-axis orientation. Pin insertion is constrained to that axis. Final engine orientation and vertical seating are preset. This is a focused connection experiment, not a collision/force or service-procedure simulator.

Chromium with SwiftShader, device-scale factor 1 and touch/viewport emulation establishes automated reachability only. It does not establish actual iPhone/Safari behavior, OS gesture/background reliability, uncoached understanding or smoothness. Actual-phone acceptance remains with the owner.

Retained budgets: <=5 MB compressed initial assets, <=5 seconds ready at 10 Mbps/100 ms, <=100 ms input feedback, >=30 FPS for five minutes on a baseline phone. Short software-rendering samples cannot establish physical-phone acceptance; rAF intervals are not input latency.

The desktop Vercel connector scope excludes Project 442, and its browser reaches Vercel sign-in. Those known failed setup paths were not repeated. Delivery uses the existing Git branch Preview integration and GitHub deployment/check-run evidence; hosted browser verification must be qualified and protection remains unchanged.
