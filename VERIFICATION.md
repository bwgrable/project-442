# Prototype 003 visual proof verification

This records the bounded preview proof, not acceptance of a complete game or of physical-phone performance. Source is on `dev/prototype-003-visual-proof`; Prototype 002 remains at `4d62d6471ad3c3886abc2e08c2130b383df7d8b3`. See the commit containing this document for the tested application revision.

## Architecture evaluation

Three.js supports the required real 3D inspection, orbit/pinch camera, sectioned casting, part picking, and connected motion in a static application. Vite bundles the scene and dependencies; no backend, live AI, purchased model, or new service is needed. A small pure mechanics module owns the state transitions and analytic slider-crank constraint. Rendering and controls consume that state rather than maintaining independent installation state.

The proof is intentionally one crankshaft and one installable piston/rod assembly in an illustrative V8 casting. It does not establish authentic Rocket 400 dimensions, assembly procedures, production asset quality, or full gameplay. Procedural geometry makes this evaluation self-contained, but should not substitute for factory-reference modeling if historical fidelity becomes an approved requirement.

## Completed checks

- Four Node tests passed: fixed rod length, cylinder alignment, crankpin radius across 1,440 angular increments, dead centers/periodicity, placement prerequisites/idempotence, cancellation, and reset.
- Five Chromium/Playwright checks passed: desktop journey; canvas selection versus orbit; emulated phone pinch/placement/stepping; reduced motion; WebGL initialization failure.
- After the final portrait control layout change, the affected mobile check passed again, including visible fixed controls, play/pause and stepping. The final static build passed.
- Independent read-only source/geometry review found no remaining blocker. Continuous shaft and crank-cheek intersections were corrected. The section rail clears the piston skirt by approximately 0.0339 scene units at bottom dead center. Placement now opens Detail to expose the connected assembly.
- Desktop and phone-size screenshots were inspected. Earlier layout smoke checks at 360px portrait and 844px landscape found no horizontal overflow; context-loss handling displayed the recovery UI.
- The approved `AGENTS.md` remains unchanged, SHA-256 `d2fb30e2f14040d2fb30bc0be10f02483ac1f978366a74348da323008af2c449`.

Earlier browser failures exposed a moving placement button and a test sampling touch coordinates before smooth scrolling completed. Both were fixed before the passing runs. Those failures are not presented as passes.

## Environment and reproduction

Debian 13 cloud workspace; Node 24.19.0; Chromium 154.0.8037.57; Playwright 1.64.1; Three.js 0.186.1; Vite 8.3.4. Chromium uses SwiftShader software rendering. This is neither a physical phone nor a hardware-GPU benchmark.

Run `npm test`, `npm run build`, and `npm run test:browser`. For screenshots and measurements, serve the production bundle with `npm run preview -- --port 4174`, then run `node tests/measure.mjs`. `PROOF_URL` and `EVIDENCE_DIR` can override the origin and artifact directory. The script emulates 10 Mbps download throughput and 100 ms latency at device scale factor 1, captures 1440×1080 desktop and 390×844 touch layouts, and records a five-second animation sample.

The build has a 619.45 kB minified JavaScript bundle (158.54 kB gzip), 13.67 kB CSS (3.90 kB gzip), and 7.78 kB HTML (2.88 kB gzip). Vite warns about the JavaScript chunk exceeding 500 kB; the build succeeds. The proof uses one Three.js scene and no external asset requests.

Latest local production-bundle measurement, after the Detail camera and portrait controls changes:

| Cloud SwiftShader scenario | Ready time | Observed rendered frames / sample | Average rendered fps | Horizontal overflow | JavaScript errors |
| --- | --- | --- | --- | --- | --- |
| Desktop 1440×1080 | 6.08 s | 7 / 5.27 s | 1.33 | None | None |
| Touch viewport 390×844 | 3.91 s | 2 / 5.30 s | 0.38 | None | None |

Resource transfer entries totaled 161,919 bytes per scenario (excludes the navigation HTML). The active render recorded 64,480 triangles and 32 draw calls. These short, variable software-rendered samples are poor and do not establish an acceptable animation budget. Initial Workshop-camera samples were also slow (about 1.5–2.2 fps); the final closer Detail view is not an identical performance workload. Static shadow caching and the smaller lighting environment reduce rendering work, but performance acceptance is still open.

Screenshots and raw measurements were captured under `/tmp/project442-artifacts/` in the cloud workspace. That temporary directory is not a permanent artifact store; the measurement script reproduces them.

## Remaining acceptance work

Review the actual Preview URL for appearance and the complete interaction flow. Check loading, sustained animation, touch recovery, rotation/orientation, and browser behavior on the owner's phone. Cloud viewport emulation cannot establish physical-device usability or frame rate. Owner visual acceptance and device performance remain open; expansion into full gameplay is not part of this delivery.
