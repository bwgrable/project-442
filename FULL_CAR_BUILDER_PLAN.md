# Stage 008 — 1969 442 whole-car builder

## Scope and starting point

Brent requested approximately 100 meaningful parts, paint and customization for a whole Oldsmobile 442, referencing his former 1969 car with a 400. Implementation and a separate Preview are authorized by the November 18 delegation. No new paid services, AI API usage, infrastructure changes, production promotion or deletion.

Verified cloud checkout: `/workspace/project-442`, origin `https://github.com/bwgrable/project-442.git`. The restored checkout initially contained the clean main baseline on local `work`. Fetched Stage007 and created `dev/stage-008-full-car-builder` from `f6dbf893186a4b8a9c88a86be72ff997d35e1ad2`. All existing remote branch revisions remain unchanged. No repository or workspace `.agents` skills are present.

The repository's AGENTS.md requires coordinator model confirmation for each new substantive task. Recommend Astra/high; earlier confirmations were for the engine stages. The coordinator confirmed Astra/high for this whole-car build after plan preparation.

## Experience

A light, polished garage with a large orbitable car, category tabs, searchable part cards and clear installed/available/needs-connection states. Tapping a ready part installs it automatically at its authored location. Selecting an installed part highlights it and exposes a short explanation, inspection and removal. The user chooses order; no precision positioning or required tools. Optional hints explain prerequisites and can focus the missing part without installing it.

Start with an empty stand and a faint optional silhouette reference; show a finished reference view separately without altering build progress. Frame is the foundation. Category progress and an overall 0–100 count make additions legible. A movable camera supports pointer orbit, wheel/pinch zoom, generous preset-view buttons and keyboard alternatives. Presets include front three-quarter, rear, side, engine bay, interior and underside. A reversible inspection view hides body occlusion without removing parts or corrupting progress.

Paint studio: body color swatches plus custom color, gloss/satin finish, optional contrasting roof, stripe color/on-off, interior upholstery and two wheel styles. These change installed meshes immediately and persist for pieces installed later. These are custom choices, not a factory paint-code or option catalog. No color changes counted as extra parts.

Versioned localStorage autosave stores installed IDs and customization, validates restored data and survives reload. Indicate saved/unsaved status accurately; storage denial/corruption must not crash the builder. Reset requires a concrete confirmation, clears the saved assembly and returns to a clean build. No account or cloud sync claim. Offer undo for the latest installation/removal/customization/reset.

## Concrete 100-choice catalog

Each choice has a stable ID, visible geometry, category, role and explicit prerequisites. Left/right items are separate when they represent physically separate pieces. Small hardware is bundled openly rather than padded into a screw-count exercise.

- **Chassis — 12:** frame; front crossmember; rear crossmember; transmission crossmember; floorpan; firewall; trunk floor; fuel tank; fuel filler; brake lines; fuel line; dual exhaust system.
- **Running gear — 28:** left/right lower front arms; left/right upper front arms; left/right front springs; left/right front dampers; rear axle; left/right rear springs; left/right rear dampers; steering box; steering linkage; driveshaft; left/right front brake assemblies; left/right rear brake assemblies; four individual wheels; four individual tires.
- **Engine and drivetrain — 20:** engine mounts; block; rotating assembly; oil pump; oil pan; left/right cylinder heads; intake manifold; carburetor; air cleaner; left/right valve covers; distributor; water pump; fan; radiator; alternator; starter; battery; transmission. The rotating assembly is an explicit grouped subassembly, reusing sound prior geometry where proportionate; prior detailed V8 study remains available separately.
- **Interior — 16:** carpet; dashboard; instruments; steering column; steering wheel; pedals; console; shifter; left/right front seats; rear bench; left/right door panels; headliner; seat-belt set; parcel shelf.
- **Body — 14:** roof/pillar structure; left/right front fenders; left/right doors; left/right rear quarters; hood; trunk lid; front valance; rear valance; windshield; rear window; side-glass set.
- **Trim — 10:** split grille; front bumper; rear bumper; left/right headlamp pairs; left/right tail lamps; badge set; mirror pair; door-handle pair.

## Rules, removal and architecture

Keep `src/car-catalog.js`, `car-state.js`, `car-model.js`, `car-main.js` and `car.css` separate. State owns installation, missing prerequisites, progress, customization, undo and save serialization; rendering never invents installation state. Every ID must have visible model geometry and every dependency must resolve in an acyclic graph.

Use mechanically sensible teaching dependencies: frame before supports; arms/axle before attached brakes/wheels; wheel before tire; mounts before engine block; block before heads and bottom-end groups; heads before intake/covers; intake before carburetor and carburetor before cleaner. Body panels attach to their authored support; interior attaches to floor/body as appropriate. Assembly sequence is simplified, not a workshop procedure. Avoid requiring all systems before harmless cosmetic choices.

For removing a support, compute the complete installed dependent closure. Show the exact affected count/names and require confirmation for that multi-part removal; remove dependents atomically and allow undo. Removing a leaf is immediate and reversible. Repeated installation cannot duplicate geometry/progress. Undo restores exact prior assembly/customization and persists it. Inspection/camera state must not change installed state.

Preserve Stage007 index as `stage-007.html` and its README as a stage-specific guide before changing active entry. Preserve all prior source, tests, captures and runnable HTML entries. Extend the existing Vite multi-entry build without replacing the stack or introducing dependencies unless necessary. Existing Three.js OrbitControls is available within the installed package once dependencies are restored.

## Visual fidelity

Author a recognizable two-door 1969-inspired silhouette: long hood, short rear deck, curved flanks, wheel openings, sloped glass, distinct pillars, divided grille with paired round lamps, narrow vertical rear lamps, chrome bumpers and 442 badges. Use shaped indexed geometry and curves rather than a stack of boxes for exterior panels; prioritize front/side/rear recognition before filling the catalog. Match wheel openings, glazing and door seams across independently removable parts. Interior, running gear and engine must remain useful under inspection.

Initial reference discovery: [1969 Olds FAQ](https://oldsjunction.classicoldsmobile.com/oldsfaq/of442.htm) and [1969 visual comparison](https://musclecarsmatter.com/1969-models/) identify styling cues. These are secondary leads, not verified dimensional data. Consult period brochure imagery or direct vehicle photographs before substantive modeling; record actual references used. No factory dimensions, exact torque, service procedure, firing-order or paint-code claims. Label procedural geometry and grouped subassemblies clearly as illustrative.

## Budgets and acceptance before graphics

Targets: initial compressed assets <=5 MB, ready <=5 seconds at 10 Mbps/100 ms; complete car <=180k visible triangles and <=200 draw calls; feedback <=100 ms and >=30 FPS on a physical phone. Cap pixel ratio and render on demand when idle. Measure cloud behavior and report physical-phone targets as unverified until tested. No remote runtime assets or paid APIs required.

Unit tests: exactly 100 unique catalog entries; acyclic valid dependencies; complete alternative valid orders; blocked choices; repeat installs; leaf and cascading removal; undo; reset; validated persistence/corrupt data; customization bounds. Model tests: finite geometry, all IDs represented, bounded coordinates, wheel/body alignment and material updates isolated correctly.

Production-build browser journeys with actual controls: desktop and touch-emulated full build in different orders, optional hints, blocked choices, search/category navigation, removal/cancel/undo/rebuild, paint/roof/stripes/wheels/interior changes, reload/resume, reset and replay. Verify orbit/pinch/preset/keyboard, mobile portrait/landscape, >=44px targets, no horizontal overflow, reduced motion, backgrounding, resize, WebGL/load recovery and unavailable localStorage. Read-only diagnostics may support assertions; tests must not install by mutating internal state.

Capture and visually inspect opening, partial chassis, engine/interior, completed front/side/rear, custom paint, and mobile layouts. Independent reviewer must inspect actual experience and recognizable styling, not only tests. Fix findings, then run final checks on edited code. Preserve historical entries with smoke coverage.

## Team and delivery

After coordinator confirmation: bounded implementers requested GPT-6.1 Sol/medium for catalog/state and car geometry with focused tests; coordinator owns the workbench, scene, integration and final verification. Independent read-only reviewer requested GPT-6.1 Sol/high. No recursive workers, no overlapping edits or worker pushes. Requested configurations are not proof of effective serving models.

Commit/push only `dev/stage-008-full-car-builder`, using existing GitHub/Vercel Preview integration. Obtain literal URL from the new commit's check-run output, verify commit-specific deployment success, attempt hosted browser access without changing protection, and qualify any access limit. Report commit, branch, deployment, tests, screenshots, known limits and preservation checks. No merge or production promotion.
