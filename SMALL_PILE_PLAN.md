# Prototype 004 — small pile

Authorized by the owner through the coordinating desktop chat, “Review prototype tool installation.” The coordinator model checkpoint is complete and carries forward. Baseline: `204847da55a3566df6d83f3fef971cb158f0cc01`; work stays on `dev/prototype-004-small-pile`. Main and earlier previews are preserved.

## Experiment

Four real loose components surround an engine-block anchor: crankshaft, matching main-cap set, one piston/rod unit and rod cap. Grab their visible geometry and move it continuously around the bench. Select and roll a piece in 15° increments, inspect the assembly by orbiting, and release near its connection. No mounting-location menu, tool selection, fastening checklist or tap-to-install. All pieces are available from the beginning; only mechanically necessary support dependencies constrain connection.

This bounded spatial experiment uses a horizontal X/Z work plane, one adjustable roll axis, and automatic vertical seating. Axial orientation is preset. It is not unrestricted six-axis CAD or a collision/insertion simulation. The render height keeps a loose part above the bench and lifts a held part to at least its connection height; the fit check compares its bench position and roll against the connection. Snap radius: 0.65 illustrative scene units; orientation tolerance: 12°. Feedback appears only within 1.1 units of the selected part's own connection, or after an attempted drop. No default answer highlight. Optional hints progress through clue, direction, destination and walkthrough.

A tap selects only. Pointer movement past a small threshold starts a drag. Dragging an installed part lifts it and returns dependent parts to the bench; the mechanism first returns to its inspection pose. Undo restores a complete consistent assembly snapshot. Escape/cancel, interrupted capture, a second finger, resize and backgrounding cancel the pending drag and preserve the prior assembly. A second finger cancels a part gesture; after both fingers lift, a fresh two-finger camera gesture is available. Blank-space drag or explicit camera mode orbits; camera gestures never place a part. Loose positions are bounded; a recover-view control frames the whole bench.

Keyboard/non-precision fallback: choose a part, pick up, move with four directional controls or arrows, roll with buttons or Q/E, drop with Enter, cancel with Escape. This fallback uses exactly the same position/orientation fit and dependency checks as direct manipulation. It must never offer an auto-solve button. Remove, undo and reset remain available. Connected assembly exposes hand-turn, step and optional continuous motion. Reduced motion retains slider/step. Keep module-load and WebGL recovery.

## Acceptance and budgets recorded before implementation

- Direct desktop pointer and emulated phone touch journeys assemble all four actual meshes, with continuously changing loose transforms before release.
- Wrong location, orientation and order reject without losing a piece. A generic tap never installs. Nearby fit feedback is limited to the selected connection.
- Cancel/capture loss, second finger, resize/background, remove/reconnect after motion, undo, reset and optional hints preserve consistent state.
- Keyboard fallback can complete the same assembly and motion test. Full crank sweep preserves connected centers, rod length, bore travel and 2r stroke.
- Desktop, phone portrait and landscape show usable controls, recoverable pieces and no horizontal overflow. Visually inspect production-build screenshots.
- Budget targets: <=5 MB compressed initial assets, <=5 s ready at 10 Mbps/100 ms, <=100 ms input feedback, >=30 FPS during a five-minute baseline-phone session. These are targets, not claimed acceptance. Record single cloud samples separately; SwiftShader is not a physical iPhone or hardware-GPU result.
- Reuse Three.js/Vite and existing illustrative geometry/kinematics. Lower pixel/shadow cost before adding geometry. No factory accuracy, torque/service procedure, new backend, purchased assets or cost/infrastructure changes.

## Delivery

Bounded implementer requested GPT-6.1 Sol / medium; independent read-only reviewer requested GPT-6.1 Sol / high. Coordinator owns integration and verification; no recursive delegation or overlapping file ownership. Commit source, plan, verification and labeled screenshots. Push only the new branch through the existing Vercel Preview integration. Report literal playable URL if accessible, otherwise exact deployment/status evidence and access blocker. Actual-phone usability/performance acceptance remains explicitly pending.
