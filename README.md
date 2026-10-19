# Project 442

A mobile-first, interactive engine study inspired by the 1969 Oldsmobile Rocket 400.

Prototype 003 is a bounded **3D visual proof**, built with Three.js. Inspect a sectioned V8 block, crankshaft, and one piston/connecting-rod assembly; align and seat that assembly, then hand-turn or step the connected mechanism. The workshop, parts, lighting environment, and label texture are authored procedurally. There are no purchased assets, external model downloads, accounts, or live services.

Geometry, dimensions, finish, and abbreviated assembly actions are illustrative, **not factory-verified specifications or a service procedure**. Bearings and other preparation are represented as already completed. The moving assembly uses a fixed-length slider-crank constraint rather than independent part animations; combustion, loads, tolerances, lubrication, balancing, and full engine assembly are outside this proof.

## Development

Node 24 is used in the cloud workspace. Install the pinned dependencies with `npm ci`, then:

- `npm run dev` — development server.
- `npm run build` — static production bundle in `dist/`.
- `npm run preview` — serve that built bundle locally.
- `npm test` — mechanical constraints and state-transition tests.
- `npm run test:browser` — browser checks against the built bundle; run the build first. Uses `/usr/bin/chromium` by default; set `CHROMIUM_PATH` to another installed Chromium executable if necessary.

The browser suite uses headless Chromium with SwiftShader software rendering. Its mobile viewport/touch emulation is not evidence of testing on a physical phone or Safari. Browser initialization and graphics-context failures show a reloadable fallback.

## Controls

Tap a part in the scene or choose its named button. Drag to orbit and pinch to zoom, or use the view and zoom buttons. Select the piston/rod, choose **Find the connection**, then seat it using the blue destination or the equivalent inspector button. Cancel or Escape returns to inspection. **Reset** restores the entire exploration; the circular camera button resets only the view.

After placement, turn slowly, step 15 degrees, or use the crank-angle slider. Reduced-motion preference disables continuous turning and preserves stepping. The cutaway switch exposes the mechanism without moving its mounting points.

Seating the assembly opens the Detail view to reveal the connection. On portrait phone layouts, crank controls stay on screen while viewing the mechanism.

Rendering uses cached static workshop shadows and a 128-pixel procedural lighting environment. Installed moving internals retain material lighting but do not cast animated shadows. The renderer rests when nothing changes. These are deliberate proof-stage performance tradeoffs.

## Structure

- `src/engine.js`: detailed procedural geometry, materials, and cutaway visibility.
- `src/mechanics.js`: illustrative dimensions, analytic linkage, and shared interaction state.
- `src/main.js`: scene, lighting, camera, selection, controls, and error fallback.
- `src/style.css`: responsive workshop presentation.
- `tests/`: mathematical, state, and browser checks.

## Preservation and delivery

Prototype 002 is recoverable at commit `4d62d6471ad3c3886abc2e08c2130b383df7d8b3`; the cloud checkout also retains local tag `baseline/prototype-002-4d62d64`. Prototype 003 work belongs on `dev/prototype-003-visual-proof`. Only Preview publication is authorized. Do not merge into `main`, promote a deployment, or change production settings without explicit approval.

Actual phone validation and owner assessment of visual quality remain separate from automated checks. Use the immutable deployment URL and tested commit when recording acceptance.

See [verification and architecture evaluation](VERIFICATION.md) for checks, measured limitations, and reproduction instructions.

Technical references: [Three.js](https://threejs.org/docs/), [slider-crank mechanism principles](https://ocw.metu.edu.tr/pluginfile.php/6885/mod_resource/content/1/ch7/7-2.htm). Neither reference establishes Oldsmobile-specific dimensions.
