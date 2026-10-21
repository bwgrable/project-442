# Prototype 005 — make a subassembly

Owner authorization and coordinator model checkpoint carry forward from “Review prototype tool installation.” Baseline `53eaf2eccbb4a3e7f29e4a9274c3cb8c89983f07`; separate branch `dev/prototype-005-subassembly`. Preserve main and earlier previews.

## Concrete experiment, before implementation

Start with a separate piston, rod and visible wrist pin on a close bench view, plus a loose rod cap for the later crank connection. The larger engine has its crank and main caps prepared. Parts lie with their wrist axes normal to the horizontal bench; X/Z dragging and roll in the bench plane support exploration. The piston can be moved anywhere on the bounded bench. The rod's small end fits the current piston bore position and orientation, never a fixed bench hotspot.

Dropping the rod near the matching piston bore makes a temporary fit. It is not a carrying joint: moving either part separates it. Align the separate pin above those bores with a normal drag. Then drag the aligned pin down along its visible axis to insert it continuously; a mere tap or ordinary drop cannot pin the joint. Partial insertion remains unfinished. Accessible controls move that same insertion depth in increments. Axial orientation is prepared, and constrained insertion is explained briefly when applicable.

Once inserted, dragging piston, rod or pin carries the unit together. Adjacent pivot controls swing the rod about the fixed wrist center, visibly proving the joint. Explicit unpin separates the joint coherently. A freely chosen engine/workshop view includes the bench and prepared engine for direct transport. Fit the completed unit into the representative cylinder, then fit its rod cap to the crank. Final cylinder orientation and vertical seating are preset; installed motion uses the existing constrained solver. This remains illustrative geometry, not service data or a physical collision simulator.

State owns loose poses, temporary fit, pin alignment/depth, pinned unit, pivot, installation, cap, motion, transactions and hints. Undo/cancel restores exact previous state with animation paused. Unpin/removal returns dependent components to a coherent recoverable bench state. No generic install/auto-pin action, target menu, tool checklist or default answer highlight.

## Acceptance and budgets

- Real mouse and emulated touch: reposition piston, fit rod at its new location, align and continuously insert pin, carry unit, visibly pivot, install, cap and complete a revolution.
- Wrong fit/orientation/order, unpinned carrying/installation, tap-only interaction, partial insertion, unpin/removal/reconnect, undo/cancel/reset and optional hints.
- Same rules through keyboard; pointer capture/cancel, second finger, camera gestures, resize/background, reduced motion, module-load/WebGL recovery.
- Geometry checks for open wrist bores and separate pin; joint centers and rod length remain invariant during unit movement/pivot and constrained engine motion.
- Inspect desktop and phone screenshots. Adjacent controls without overlap; pin/cap hit regions at least 44 px. Touch emulation does not establish actual iPhone acceptance.
- Retain budgets: <=5 MB compressed assets, <=5 s ready at 10 Mbps/100 ms, <=100 ms input feedback, >=30 FPS over five minutes on baseline phone. Record actual software-rendering measurements separately; no phone-performance claim from SwiftShader.

## Ownership and delivery

Bounded implementer requested GPT-6.1 Sol/medium: pure subassembly state, mechanical geometry changes and their unit tests. Coordinator: UI/render/input integration, browser journeys, visual evidence and release. Independent read-only reviewer requested GPT-6.1 Sol/high after integration. No recursive delegation or overlapping edits. Serving-model configuration is not independently introspectable.

Commit evidence and push only the new development branch. Use GitHub status/check-run evidence for Vercel deployment and actual preview hostname. Keep protection unchanged; qualify hosted and physical-device verification. No new dependencies, infrastructure or costs.
