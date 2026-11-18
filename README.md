# Project 442 • Whole-car build studio

Build and paint an illustrative 1969 Oldsmobile 4–4–2 hardtop with a 400 V8. The opening car is a finished reference. Choose **Perimeter frame** on the parts bench to begin your own assembly. The progress counter tracks your work.

Browse the six systems or search all 100 parts. Selecting a ready part installs it. Selecting a blocked part opens its description and optional connection hint. Select an installed part to inspect it on its own or remove it. A supporting part's removal lists all affected parts before confirmation. Undo restores the preceding change.

**Paint & trim** changes body color, finish, roof, stripes, wheels and upholstery. The finished reference lets you try colors while the body is still under construction. The garage saves parts and finishes in this browser on this origin. Returning on a different browser, device or preview hostname opens a separate garage.

Drag to orbit, pinch or use the zoom buttons, or focus the canvas and use arrow keys and +/−. Choose a camera angle to look into the engine bay or cabin. Cutaway hides the body and trim for inspection. The separate engine study remains available at [Stage 007](stage-007.html).

The parts, dimensions and finishes are illustrative. The bench counts recognizable pieces and named subassemblies, including the rotating assembly, left/right lamp pairs and exhaust system. The dependency graph supports learning and experimentation.

## Development

Run `npm ci`, `npm run build`, `npm test` and `npm run test:browser` from the repository root. Browser checks use Chromium (`CHROMIUM_PATH` overrides the executable). To reproduce the cold-load samples, serve the production build on port 4194 and run `node tests/car-measure.mjs`. Use `PROOF_URL` for another preview origin. The garage runs entirely in the browser.

[Stage plan](FULL_CAR_BUILDER_PLAN.md) · [Review evidence](review/full-car/README.md) · [Stage 007 guide](STAGE007_README.md) · [Pilot 006](pilot-006.html) · [Prototype 005](prototype-005.html)
