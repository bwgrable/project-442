# Prototype 005 rod-fit playtest correction

Scope: fix the reported “lined up but will not connect” rod-to-piston interaction on `dev/prototype-005-subassembly`, following original delivery `b714f9f1142e4ec56412f97400f3969e17b418a8`. Preserve separate pin insertion and all later assembly steps. No production or infrastructure change.

## Diagnosis and approach

The rod starts at 30°, while its original fit rule required an angle within 12° of the piston. A touch reproduction on the original build put its wrist center at approximately (1.40000006, 0.99999983), against the piston at (1.4, 1.0): effectively exact position, still rejected at 30°. The feedback said “Roll the part to align the connection,” but the scene feedback disappeared on release. The coordinator independently reproduced the same failure with a single ordinary mouse drag on the hosted Preview.

The proportionate correction is to accept the existing ±65° bench swing range when the small eye reaches the bore, retain the player's chosen rod angle, and show the result beside the parts. The positional fit radius stays .30 illustrative scene units. The pin remains a separate part requiring its own alignment and continuous insertion. This is a gameplay fit, not a validated service specification or collision simulation.

## Changes

- Rod fitting accepts ±65° relative to the movable piston and preserves that angle through temporary fit, pinning, carrying, pivoting and bench unpinning.
- Nearby drag feedback outlines the rod's small eye and piston wrist center. Guidance extends far enough to explain a mistaken big-end placement; the actual snap radius is unchanged. There is no default destination highlight.
- Excessive angle feedback states the required correction; a 90° rod needs at least 25° toward the piston skirt. Wrong-position feedback distinguishes the small round eye from the open crank end.
- Drop feedback stays visible in the scene until the next action. Successful rod fitting explicitly says the separate wrist pin is still required.
- Read-only geometry diagnostics can find a visible mesh point nearest the small eye for repeatable ordinary-input checks. They do not mutate application state.

## Verification

- `npm test`: **35/35 passed**: 13 current subassembly state tests, five geometry tests, two analytic linkage tests, and 15 retained historical small-pile state tests. Includes initial30° fit, ±65° boundaries, rotated/repositioned piston, excessive angle, unchanged position threshold, angle retention, undo/cancel and pin/carry/unpin consistency.
- `npm run build`: passed. HTML 7.58 kB / 3.25 kB gzip; CSS 10.24 kB / 3.04 kB gzip; JavaScript 634.69 kB / 163.50 kB gzip. Approximate total gzip 169.79 kB, below the retained 5 MB budget. Vite's existing raw-chunk advisory remains.
- Final focused browser run: **8/8 passed in 4.2 minutes** (`--grep 'visually aligned|fresh scene|wrong order|keyboard fallback|cancel'`). Fresh scenes each accept one small-eye-to-bore drag with mouse and emulated touch, without rotation, preserving 30° and leaving the pin loose. Two longer mouse/touch journeys reposition the piston, fit without rotation, preserve the visible rod direction, insert the separate pin, unpin/reconnect, install/cap and complete one revolution with joined centers. Remaining cases cover wrong order/90° rejection with visible 25° guidance, partial insertion, unpinned movement, keyboard/hints/reduced motion, touch/camera separation, landscape, resize, capture loss, backgrounding and cancellation.
- An earlier four-case run passed three; the longer phone test's iterative screen-alignment helper failed to reach the fit. That helper grabbed a far-end mesh point and drove its cursor toward the phone's right edge. It now grabs actual small-eye geometry and waits for an animation frame before reading the next projected position. The corrected phone journey passed alone, then in the final eight-case run. The separate one-drag acceptance replay passed on mouse and touch both before and after that helper correction. No gameplay rule was bypassed or test-only state mutation introduced.
- [Three inspected screenshots](review/subassembly/rod-fit-fix/README.md) distinguish the original failure from the corrected desktop/mobile fit. On phone the persistent message is readable above the assembly and the manipulation controls remain below the scene without overlap.

This focused run does not claim a new pass of every original Prototype005 scenario; unchanged module-load/WebGL recovery and original performance evidence remain in [the original report](SUBASSEMBLY_VERIFICATION.md).

## Review and limits

The bounded state implementer was requested as GPT-6.1 Sol/medium; the independent read-only reviewer as GPT-6.1 Sol/high. Coordinator integration owns input/render feedback and browser evidence. These are requested configurations, not independent proof of effective serving settings. No recursive workers or overlapping file ownership. The reviewer found no blockers, verified 18/18 state/geometry tests, and confirmed the added diagnostics do not change app state. The reviewer did not run a browser.

Tests run in the existing cloud workspace with Chromium/SwiftShader. Touch emulation does not establish actual iPhone/Safari usability or smoothness. Original performance measurements remain in the original verification report and were not repeated for this focused correction. Hosted browser access remains protected; deployment status alone does not establish the hosted user journey. No dependency, global configuration, deployment protection, infrastructure or cost changes.
