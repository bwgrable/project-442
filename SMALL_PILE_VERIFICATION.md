# Prototype 004 verification

This report belongs to the source commit containing it on `dev/prototype-004-small-pile`, based on Prototype 003 `204847da55a3566df6d83f3fef971cb158f0cc01`.

## Behavior and scope

Replaced the mounting-location/seat/tool/fastener workflow with continuous actual-mesh dragging, explicit roll, forgiving spatial snap, bounded loose positions, nearby fit feedback, cancellation, dependency-aware lift-out, undo, recovery and reset. Named keyboard controls are an alternative using the same state/fit checks. Hints reveal help only on request. The existing geometry and slider-crank solver are preserved.

The experiment uses X/Z translation and one roll axis; vertical seating and axial orientation are preset. This abstraction is disclosed in the UI and plan. Loose parts may overlap; there is no rigid-body collision or physical insertion simulation. This is not an authentic service procedure.

## Review and test history

The bounded implementer was requested as GPT-6.1 Sol / medium. Independent read-only reviewer was requested as GPT-6.1 Sol / high. The coordinator checkpoint carried forward from the desktop authorization; serving-model settings are not independently introspectable here.

Independent review identified three UI gesture issues: Undo during pickup consumed an extra history step; switching from fallback pickup to another mesh moved the originally held part; and a second finger could start a part drag during camera orbit. All three were corrected with focused browser regression coverage. Follow-up read-only review found no new concrete blocker. The initial direct desktop journey passed before those corrections. The state implementation was also corrected to preserve independently rearranged loose descendants when lifting an ancestor, and history is bounded to 50 snapshots.

## Recorded verification

- `npm test`: 21/21 pass: 15 small-pile state tests, two unchanged analytic linkage tests and four preserved geometry checks.
- Full seven-scenario browser suite passed, including direct desktop assembly/motion/removal/reconnection; wrong position/orientation/order; touch drag and two-finger gesture separation; requested hints and keyboard assembly; resize, capture-loss and visibility cancellation; WebGL recovery; and failed module loading.
- The full suite was repeated after shadow refresh and capture-loss/background regression coverage: 7/7 passed in 3.1 minutes.
- After the final lift-height, phone framing, touch-region and control-layout refinements, the affected desktop and phone journeys were rerun: 2/2 passed in 1.5 minutes. These also assert that part dragging does not move the camera, two-finger camera interaction does not alter parts, and the loose rod cap has a forgiving touch region.
- After removing the phone toolbar's sticky positioning, the affected phone journey passed again (1/1, 24.7 seconds).
- The final evidence run additionally dragged an installed piston mesh after continuous motion on desktop and touch emulation. Both passed: piston and rod cap detached, inspection angle returned to zero, then cancellation restored exact prior part state and crank angle with motion paused.
- Production build succeeds. Current output: HTML 6.51 kB (2.90 kB gzip), CSS 9.41 kB (2.88 kB gzip), JavaScript 627.48 kB (161.34 kB gzip). Total estimated gzip: 167.12 kB. Vite retains its >500 kB raw JavaScript chunk warning; no build error or new dependency.
- Final read-only review found no new concrete blocker. The original geometry file and repository working agreement are unchanged.

Visual review corrected a mobile toolbar overlap, moved motion controls next to the scene and enlarged the loose rod cap's pick region to 44 pixels without scaling the mechanical geometry. Held pieces rise to at least their connection height; rotation and the shared fit rules still determine whether release connects them. Shadows refresh once when a part starts/stops moving, preventing a stale shadow from remaining at the previous position.

## Evidence limits and delivery

[Eight visually inspected screenshots and raw measurements](review/small-pile/README.md) are committed alongside the source. They show initial pile, incorrect roll near a connection, the connected mechanism at 135°, and an installed piston lifted after motion. Captured from the final local production build; hosted access is not implied.

Final single-run results at 10 Mbps / 100 ms, with 63,794 triangles and 34 draw calls:

| Viewport | Ready | Render sample | Average rendered FPS | rAF interval p95 |
|---|---:|---:|---:|---:|
| Desktop 1440 × 1080 | 2.604 s | 10 frames / 5.038 s | 1.99 | 716.6 ms |
| Touch emulation 390 × 844 | 1.631 s | 16 frames / 5.337 s | 3.00 | 816.6 ms |

Both had zero captured page errors and no horizontal overflow. Measured resource transfer was 163,677 bytes excluding the HTML navigation. The local loading sample meets the 5-second target, and compressed build size is below 5 MB. Software rendering is far below the 30 FPS target. These samples do not establish the 100 ms input-feedback or five-minute physical-phone budgets; rAF intervals are not input latency measurements.

Browser checks use Chromium 154, SwiftShader software rendering and device scale factor 1. Touch/viewport emulation, visibility events and context-loss simulation do not prove actual iPhone/Safari or Android behavior. A scripted no-hint path demonstrates reachability, not uncoached human understanding.

Targets recorded before implementation: <=5 MB compressed initial assets; <=5 s ready at 10 Mbps/100 ms; <=100 ms input feedback; >=30 FPS for five minutes on the baseline phone. Cloud single-run samples do not establish physical-device acceptance. The actual phone drag/rotate/retry journey, orientation changes, OS backgrounding and sustained performance remain pending.

The existing Vercel connector's visible projects exclude Project 442; the desktop coordinator confirmed the prior Preview hostname responds but requires accepted Vercel authentication. These are access-scope limits, not evidence that the project is missing. Do not change deployment protection or retry the same failed setup. Use the separate development branch's GitHub deployment status and retain exact revision/deployment identity for the desktop coordinator.
