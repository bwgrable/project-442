# Stage 007 — full V8 bottom end

Brent approved the build, Astra/high coordinator preference and separate Preview publication on October25. Baseline: Pilot006 commit43861f64c3ee1dc637f7e9bea229b9960a2daa1b. Branch: dev/stage-007-v8-bottom-end. Preserve prior branches, source, reports and runnable HTML entries.

## Design before implementation

Keep selection and automatic installation. The prepared block contains two banks of four cylinders. Select main bearings, crankshaft, main caps, eight pistons, eight connecting-rod joint sets, oil pump/pickup and oil pan: 21 selectable components. A rod set includes its wrist pin, big-end bearing and matching cap; the explanation makes this abstraction explicit. Teaching labels A1–A4/B1–B4 are not factory cylinder numbers or a firing order.

Dependencies: main bearings before crankshaft, crankshaft before main caps; each piston can be added independently, and its rod needs that piston and the secured crankshaft. The pump/pickup can be mounted independently to the prepared block. The pan requires the pump and all eight connected cylinders before closing the underside. Blocked choices name what is missing; optional explanations add context. Repeated selection pauses motion and inspects existing parts without duplicating them. Reset permits another order.

Motion becomes meaningful once the crankshaft is supported by bearings and caps. Connected piston/rod pairs follow the shared four-throw crank through both banks; disconnected installed pistons stay at their illustrative resting positions. Display the connected-cylinder count and explain partial motion. The pump drive and oil flow are not simulated; do not imply direct crank drive, combustion or a verified firing sequence.

Reuse proven slider-crank dimensions and extend them to four illustrative throw phases, two ±45° banks and small opposite axial offsets for paired rods. Match visible crankpin phases and cylinder positions to the solver. Preserve rod lengths and wrist/crank centers through a revolution; paired big ends must occupy distinct axial lanes. No exact Rocket400 service facts are introduced.

Retain Pilot006's readable palette, generous selection targets, contextual feedback and isolated inspection. Use a compact cylinder selector with a piston/rod pair for the active cylinder, rather than 16 indistinguishable cards. Bank views should make additions visible. Provide both-bank, individual-bank and underside views; cutaway exposes installed parts, while full oil-pan walls correctly obscure the underside. Inspect components without changing assembly state. No drag, roll or alignment mechanics; no heads or valvetrain.

## Ownership and verification

Bounded implementer requested GPT-6.1 Sol/medium: new V8 state, mechanics, model and focused tests. Coordinator: interface, integration, browser journeys, evidence and delivery. Independent read-only reviewer requested GPT-6.1 Sol/high must inspect the actual experience. No recursive workers or overlapping ownership. Requested configurations are not proof of effective serving settings.

Before delivery: unit/analytic geometry checks across all eight cylinders; desktop and touch-emulated alternate-order journeys, blocked choices, optional hints, repeats, reset/replay, inspection, cutaway/full pan, bank views and completed motion. Check keyboard/reduced motion, loading/WebGL recovery, background pause, target sizes, portrait/landscape and console errors. Capture and visually inspect desktop/mobile evidence; independent review and fixes precede final checks.

Retain <=5MB compressed initial assets, <=5s ready at10Mbps/100ms, <=100ms input feedback, and >=30FPS for five minutes on a baseline physical phone. Aim <=120k visible triangles and <=110 draw calls for this expanded assembly, without dynamic shadows. Record actual cloud metrics, not a phone-performance claim. No new dependencies, infrastructure, permissions, costs or deployment-protection changes.

Publish only the new branch through existing GitHub/Vercel integration. Verify the exact deployment revision and actual Preview URL. Do not merge/promote production. Report hosted-browser limitations separately from local cloud-browser evidence.
