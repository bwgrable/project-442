# Project 442

A mobile-first Three.js assisted challenge inspired by the 1969 Oldsmobile Rocket 400.

**Build a connected rotating assembly, then turn it by hand to see how it works.** Inspect and choose a crankshaft, its matching main cap set, one piston/connecting-rod unit, and its matching rod cap. Choose mounting locations, seat the parts, select a fastening tool, and secure two representative fasteners per cap operation. Nothing automatically selects the next correct part or its destination.

Hints are optional and advance only when requested: conceptual clue, direction, destination highlight, then walkthrough. Mistakes explain the issue and preserve progress. The hand-turn test stays locked until the assembly is connected and secured; pass it with a complete revolution using the slider, slow turning, or 15° steps.

The procedural model, materials, lighting and labels are authored locally. No backend, accounts, live AI, paid assets or external model downloads are used.

## Scope and preparation

Geometry and proportions are illustrative, **not factory-verified specifications or a repair procedure**. Bearings, piston rings and the wrist pin are prepared. Main caps are handled as one matching set; two fasteners represent each cap operation. Orientation and seating are simplified. There are no torque values, friction/load validation, combustion, or full-engine assembly. Other cylinders are outside this challenge, not mechanically invalid.

Cutaway deliberately opens one cylinder bank to reveal the mechanism. Switch **Cutaway** off for the modeled full casting. Its purpose is explained in the scene, and a preparation disclosure appears before the parts.

See [the recovered authorized plan](GAMEPLAY_PLAN.md), [mechanical assumptions and provenance](MECHANICAL_REFERENCES.md), and [gameplay verification](GAMEPLAY_VERIFICATION.md). The earlier [visual-proof evidence](VERIFICATION.md) is historical evidence for its original revision.

## Controls

Choose named parts or tap them in 3D. **Look closer** inspects a selection. **Choose mounting location** reveals equally styled location markers and equivalent HTML choices; selecting a location does not install anything. Use **Seat selected part** or the scene’s **Seat here** button to attempt installation. Cancel or Escape preserves installed progress.

For a seated cap, choose a tool and secure each representative fastener. **Test assembly** checks readiness. Turn, pause, step or drag the angle control. Reduced motion disables continuous turning and retains stepping. Backgrounding pauses motion until explicitly resumed. **Reset** and **Build it again** clear the entire challenge, including hints, tools, fasteners and motion.

Drag to orbit, pinch to zoom, or use the view presets and camera buttons. Camera gestures never place a part. Location markers intentionally remain visible through casting; choose a letter or the named HTML equivalent when surfaces are occluded. Portrait phone motion controls stay on screen during the test.

## Development and validation

Node 24 is used in the cloud workspace. Install pinned dependencies with `npm ci`, then:

- `npm run dev`: development server.
- `npm run build`: static production bundle in `dist/`.
- `npm run preview`: serve the built bundle.
- `npm test`: independent mechanics and assembly-state checks.
- `npm run test:browser`: complete browser journeys against a built bundle.

Browser checks use installed Chromium at `/usr/bin/chromium` unless `CHROMIUM_PATH` is supplied. They use SwiftShader software rendering. Viewport/touch emulation does not establish real iPhone, Safari, Android or hardware-GPU performance.

For screenshots and cloud measurements, run the preview on port 4174, then `node tests/measure.mjs`. Override `PROOF_URL` and `EVIDENCE_DIR` if needed. The measurement script records a 10 Mbps/100 ms network profile and short animation samples; it does not replace the proposed five-minute phone test.

## Structure and preservation

- `src/engine.js`: geometry, matching removable caps, materials and cutaway.
- `src/mechanics.js`: one assembly state owner and constrained slider-crank solver.
- `src/main.js`: scene, picking, controls, hints and recovery presentation.
- `src/style.css`: responsive workshop layout.
- `tests/`: mechanics, state, browser journeys and measurement tooling.

Gameplay is isolated on `dev/prototype-003-assisted-challenge`. Visual-proof branch `dev/prototype-003-visual-proof` stays at `45950d0212c463733b307fef3dc863004d840950`; its immutable Preview is https://project-442-ayjwuz05h-fat-dog.vercel.app/. Prototype 002 and remote `main` remain at `4d62d6471ad3c3886abc2e08c2130b383df7d8b3`.

Only a separate development Preview is authorized. Do not merge to main, promote production, change billing/permissions, or purchase assets. The owner’s positive first iPhone feedback concerned the visual proof, not this new gameplay revision.
