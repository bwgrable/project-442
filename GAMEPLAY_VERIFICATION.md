# Assisted-challenge verification

This report applies to `dev/prototype-003-assisted-challenge`, based on visual proof `45950d0212c463733b307fef3dc863004d840950`. The commit containing this report identifies the delivered source. Prototype 002, main, and the existing visual-proof branch/Preview are preserved.

## What changed

The formerly guided one-part placement is now a bounded assembly challenge. Four components begin on the bench: crankshaft, matching main cap set, representative piston/rod, and matching rod cap. The player chooses components and mounting locations. Caps require a selected socket wrench and two representative fastener operations. The test is locked until the assembly is connected and secured. Hints are request-only, progress through four levels, and never install or select components automatically.

The engine retains the approved procedural style. Supporting caps are actual separate geometry with open mating halves; they are not duplicate decorations. Installed crankpin, rod and piston transforms share the same constrained kinematics. Cutaway purpose and the outside-scope cylinders are stated in the scene. Prepared bearings/rings, preset orientation, grouped main caps, representative fastening and unverified proportions are disclosed.

## Environment and scope of evidence

Debian cloud workspace; Node 24.19.0; Chromium 154.0.8037.57; Three.js 0.186.1; Playwright 1.64.1; Vite 8.3.4. Browser tests use SwiftShader software rendering, device scale factor 1, desktop and phone-sized touch viewports. Visibility and graphics-context events are simulated. This does not establish iPhone/Safari/Android behavior, real OS background recovery or target-device performance.

The owner's positive visual-proof iPhone feedback predates this gameplay build and is not presented as gameplay acceptance or a quantitative measurement.

## Checks and review

Mechanical/state checks cover rod length, joined pin centers, bore constraint, crank radius, dead centers and stroke over a full revolution; explicit selection, order/location/cap/tool validation; representative fasteners; idempotence; per-stage optional hints; cancellation; full reset; motion gating; slider and stepped completion; and rejection of back-and-forth travel as a complete turn. Geometry ray checks cover open bearings and clearance through the pin bores.

Browser journeys cover a scripted no-hint completion/replay, invalid operations, requested hint progression, keyboard controls, mobile touch selection versus pinch, scene placement, portrait/landscape overflow, fixed phone motion controls, reduced-motion controls, background/resume pause, context loss, initialization failure and application-bundle loading failure. A scripted no-hint journey demonstrates reachable completion; it does not establish that an uncoached human will understand the challenge.

Independent review found and prompted fixes for slider-only test completion, rod-bore interference and front-cover journal clearance. A further review found that Vite removed the script ID used by bundle-load recovery; the recovery handler now matches the emitted module script and registers before its request, deferring DOM updates until parsing is complete. The first browser run passed five scenarios and failed mobile placement: the generic pressed-button transform displaced scene markers under the finger. The marker styling was corrected and an immediate selection assertion added. The next seven-scenario browser run passed the six gameplay/graphics scenarios, including the corrected mobile tap; its bundle-load scenario reproduced the separately reviewed build-output issue. These failures are recorded rather than counted as passes.

## Recorded automated results

- `npm test`: 22 passed, 0 failed (18 state/kinematic checks and 4 geometry checks).
- After the final recovery correction and rebuild, targeted normal-start/full desktop completion and failed-bundle recovery both passed (2/2). All seven browser scenarios have passing results; the five unaffected scenarios were not redundantly rerun after the HTML-only recovery change.
- Production build succeeds. Vite reports a 633.34 kB JavaScript chunk (162.64 kB gzip) and 18.21 kB CSS (4.93 kB gzip). The >500 kB raw-chunk warning remains; it is not a build failure or evidence of phone performance.
- Independent read-only review found no additional material gameplay or accessibility regressions after the listed corrections. Physical-device behavior remains unverified.

## Captured evidence and measurements

Persistent [screenshots and raw measurements](review/gameplay/README.md) are committed with this source. Visual inspection confirmed the separated bench components, the connected assembly, requested destination hint, and phone-sized fixed motion controls. No horizontal overflow or page errors were recorded.

At the emulated 10 Mbps / 100 ms profile, readiness was 3.98 s at 1440×1080 and 3.64 s at 390×844, DPR 1. These are single cloud samples, not device acceptance. Resource entries reported 166,975 transfer bytes excluding the HTML navigation; estimated HTML/CSS/JS gzip totals are 171.26 kB. No external models or fonts load.

Short animation samples recorded 0.95 desktop and 1.38 phone-sized rendered FPS using SwiftShader (43 draw calls, 68,604 triangles during motion). This cloud configuration does not meet the proposed 30 FPS target. Hardware-GPU phone performance, a five-minute sustained session, and input-feedback latency remain unmeasured; the prior visual-proof phone feedback does not cover this build.

## Delivery and remaining acceptance

The previous network attempts established that this executor's HTTPS CONNECT proxy denies hosted Preview access. No proxy bypass or unauthorized credential route is used. Deployment status and the exact Preview URL must be distinguished from hosted interaction evidence.

The shell GitHub API lookup (`gh api repos/bwgrable/project-442`) returned Forbidden; it was not retried. Git transport remains separately available.

The current Library helper connection check failed at tool discovery with a network error before any upload. No Library screenshot IDs are claimed. Captured local-production-build evidence is labeled separately from hosted or physical-device evidence.

Before expanding scope, Brent should test the new Preview on his actual phone/browser: an uncoached assembly attempt; optional hints; wrong-order recovery; controls and orientation; complete hand-turn test; reset/replay; and a five-minute animation session. Record device/browser, commit and network profile. Proposed budgets remain 5 MB initial compressed transfer, 5 seconds playable at 10 Mbps/100 ms, 100 ms input feedback and minimum 30 fps sustained on the baseline phone. Cloud emulation cannot accept the physical-device budgets.
