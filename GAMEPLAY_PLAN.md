# Prototype 003 — authorized assisted challenge

These provisions were recovered from the revised October 18 plan and supplied by the owner’s coordinating thread on October 19. Historical planning-only restrictions were superseded by explicit approval to implement this bounded challenge. The approved procedural Three.js visual style and architecture are retained. No paid assets are authorized.

## Playable challenge

Opening objective: “Build a connected rotating assembly, then turn it by hand to see how it works.”

Inspect a small bench, choose plausible parts, identify mounting locations, seat components, select the appropriate fastening tool and secure representative fasteners. Include the crankshaft, one piston/rod unit and their relevant supporting parts. Other cylinders are visibly outside this challenge. Do not automatically select the next correct part or highlight its location.

Wrong part, location or order produces a useful explanation without wiping progress. Hints advance only on request: conceptual clue, direction, destination highlight, walkthrough. Hints never install components automatically. The test offers hand-turn, pause and single-step controls. Incomplete or unsecured assemblies cannot pass.

## Mechanical fidelity

Preserve crankshaft support, the offset crankpin, fixed rod length, wrist-pin connection, piston travel along its bore axis, and matching component/cap relationships. One crank angle drives constrained slider-crank motion, rather than independent animations that disconnect joints or stretch rods.

Before presenting geometry as authentic to the Rocket 400, establish a reference register using suitable factory documentation or other authoritative engineering sources. Record dimensions, orientation, provenance and uncertainty. Verify general kinematics separately from engine-specific dimensions. No Rocket 400 dimensions or torque specifications have been verified in this review.

Explicitly label beforehand preparation, omitted components, representative fastening and unverified proportions. Preserve the relationships that explain how the mechanism works; simplify repetitive actions, not the causal mechanics. This is not a repair procedure, combustion simulation or validated load/friction model.

Mechanical acceptance: sweep a full revolution, confirm joined pin centers, invariant rod length, bore-constrained piston travel, correct dead-center positions and stroke equal to twice crank radius for the selected in-line mechanism. Verify independently of frame rate and presentation. Any engine-specific offsets must be sourced and reflected in the model rather than silently assumed away.

## Mobile testing and acceptance

Provide tap selection with generous hit regions, readable selection/status feedback, cancel, view presets, zoom and camera reset. Distinguish orbit gestures from placement; handle occlusion deliberately. Provide equivalent HTML controls, keyboard access and reduced-motion stepping.

Proposed initial budgets, subject to agreement: initial compressed transfer at most 5 MB; playable within five seconds on a recorded 10 Mbps/100 ms network profile; input feedback within 100 ms; sustained minimum 30 fps during a five-minute baseline-phone session, with 60 fps preferred where feasible. These are unmeasured targets, not current capabilities.

Verify unaided completion and all hint levels; invalid order, repeated input, cancellation and reset; full-state reset including hints/fasteners/motion; connected mechanism behavior; portrait/landscape, background/resume, failed loading and graphics-context loss. Test on Brent’s actual phone/browser and an agreed Android device if Android support is in scope. Record device, browser, commit, network profile, measurements and failures. Emulation is supplementary, not proof of physical-device performance. Lower shadows, resolution or texture costs before compromising mechanical correctness.

Definition of delivered: approved challenge playable at the verified Preview URL, visual and mechanical evidence supplied, required browser checks complete, and actual mobile testing completed or explicitly pending with named limitations. A ready deployment alone is not proof the experience works.

## Branch and release boundaries

Gameplay develops on `dev/prototype-003-assisted-challenge`, based on visual-proof commit `45950d0212c463733b307fef3dc863004d840950`. Preserve `main`, Prototype 002, the visual-proof branch and its immutable Preview. Publish only a separate development Preview through the existing repository integration. No production promotion, billing, asset purchase, permission change or unrelated systems.

Brent’s first iPhone feedback accepted the visual proof’s look and subjective responsiveness. It is not quantitative performance evidence and does not validate the new gameplay build.
