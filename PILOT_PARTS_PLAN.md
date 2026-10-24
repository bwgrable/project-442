# Pilot 006 — parts and relationships

Authorized outcome: Brent's revised October 24 direction replaces assembly manipulation with selecting parts that install automatically. This is a small pilot, not a continuation of Prototype005's interaction design. Baseline `6eaa665f2a8cda1b14fa9a515358f3dd296a52ca`; isolated branch `dev/pilot-006-parts-explorer`. Preserve previous source and branches.

## Concrete design before implementation

- Show one working cylinder as a focused section of an illustrative engine block. The block is prepared; select crankshaft, piston, connecting rod and wrist pin from large, descriptive part controls. No dragging, roll, alignment, placement targets or tool mechanics.
- Let crankshaft and piston install in either order. The rod needs both connection points; the wrist pin needs the piston/rod joint. Invalid selection leaves installed state unchanged and gives a short explanation, with optional additional relationship detail. These are learning dependencies, not a claimed factory assembly sequence.
- Selection is immediate and idempotent. Selecting an installed part highlights it and presents its role without duplicating it. Reset clears the assembly and motion so another order can be tried.
- Use existing constrained linkage mathematics. Enable slow crank motion only after the four selectable components are present. Provide pause, angle slider and small steps; reduced motion keeps manual controls. Pause when backgrounded.
- Improve visible detail and comprehension: clear cut surfaces, contrasting machined/cast surfaces, readable journals and bores, piston ring grooves, rod cross-section and separate wrist pin. Keep details illustrative. No factory-specific dimensions or repair claims.
- Provide a small selected-part inspection view with clear return to the assembly. Keep camera controls distinct from part selection; mobile controls remain adjacent to the scene and at least 44px high. Optional explanations stay user-controlled.
- Preserve loading, WebGL and module-load recovery. Native buttons and range inputs provide keyboard operation. No hidden input shortcuts or precision fallback are needed.

## Ownership

Repository coordinator preference: GPT-6 Astra/high, with the new-task model check explicitly confirmed by Brent on October 24. Effective serving settings are not independently introspectable. Bounded implementation will request GPT-6.1 Sol/medium for state/model code; coordinator owns interface, integration and browser verification. Independent GPT-6.1 Sol/high review must examine the actual rendered experience and evidence as well as state. No recursive delegation or overlapping edits.

## Acceptance and retained budgets

- Actual mouse and touch-emulated selection: invalid order, both valid starting orders, repeated installed selection, complete assembly, slow/manual motion, reset/replay, optional explanations and inspection/return.
- Check state/geometry relationships through a full crank revolution and after replay. No test-only state mutation in browser journeys.
- Inspect desktop, phone portrait and landscape screenshots. Verify visible install feedback, readable part details, controls without overlap and no horizontal overflow. Actual iPhone/Safari acceptance remains separate.
- Retain initial compressed assets <=5MB, ready <=5s at 10Mbps/100ms, input feedback <=100ms and >=30FPS over five minutes on the baseline phone. Report cloud measurements separately; do not infer phone performance from SwiftShader. Aim for <=80k visible triangles and <=60 draw calls in the main assembly view, without dynamic shadows.
- Production build, meaningful state/geometry tests, focused browser journeys, and independent review. Preserve original Prototype005 evidence as historical.

## Delivery boundary

Prepare a clean committed pilot branch and evidence. Brent explicitly authorized this pilot’s separate Preview publication on October 24 after the model/publication question. Push only this pilot branch through the existing Git/Vercel integration, verify deployment evidence and return its actual URL. No main merge, production promotion, permissions/infrastructure/cost changes or deletions.
