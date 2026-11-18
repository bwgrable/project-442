# Whole-car preview verification

Tested the production build in the Project 442 cloud workspace on November 18, 2026 with Node 24.19 and Chromium 154 using SwiftShader. This evidence accompanies the tested source on `dev/stage-008-full-car-builder`. Stage 007 is preserved as a separate entry and branch.

## Experience and coverage

- Exactly 100 part choices cover chassis (12), running gear (28), engine/drivetrain (20), interior (16), body (14) and trim (10). Every choice has a named role and independently visible geometry. The rotating assembly and several matched sets are grouped for this whole-car scale.
- State and model tests cover multiple valid orders, incomplete supports, duplicate selection, cascading removal, immutable undo snapshots, reset, customization, repaired saves, finite geometry, independent visibility, open wheel arches and clearance above the air cleaner.
- Desktop and touch-emulated browser journeys build all 100 parts in different orders using the parts bench. They open a blocked-part hint, resume a partial build, change all six customization settings, reload, isolate a component, remove and replace a leaf, cancel and confirm a complete dependent removal, undo, reset and replay. Camera checks include drag, touch pinch, zoom controls, keyboard and presets. A third scenario exercises unavailable storage, WebGL context loss and the archived V8 entry.
- Independent read-only review included a complete build and a five-part save/removal/undo sequence, custom paint persistence, real pointer input, emulated touch drag/pinch, portrait and landscape, and visual inspection. The review found hood/air-cleaner intersection and clipped side framing. These were fixed and rechecked. The body flanks, rocker panels, badges, wheel arch trim and seat shapes were revised during visual QA. No blocking review findings remain.
- Requested roles were Astra/high coordinator, two bounded Sol/medium implementers (rules and geometry), and a Sol/high independent reviewer. These identify requested configurations only.
- Run `npm run build`, `npm test`, and `npm run test:browser`. The build produces four HTML entries. The main shared Three.js chunk triggers Vite’s size advisory.

## Visual evidence

| View | Desktop | Phone emulation |
| --- | --- | --- |
| Finished reference | [Front three-quarter](desktop-reference.png) | [Front three-quarter](phone-reference.png) |
| Partial build | [25 installed](desktop-partial.png) | [Alternate order](phone-partial.png) |
| Customized car | [Green body and ivory roof](desktop-custom.png) | [Paint studio](phone-custom.png) |
| Side profile | [Side](desktop-side.png) | [Side](phone-side.png) |
| Rear three-quarter | [Rear](desktop-rear.png) | [Rear](phone-rear.png) |
| Interior cutaway | [Cabin](desktop-cabin.png) | [Cabin](phone-cabin.png) |

## Budgets and limitations

Measured a cold browser context at 10 Mbps, 100 ms latency and device pixel ratio 1. Time to ready plus two animation frames was 2.77 seconds at 1440 × 950 and 2.07 seconds at 390 × 844. The complete reference rendered 75,978 triangles in 192 draw calls. Decoded initial transfer was 660,103 bytes in both runs, already below the 5 MB compressed budget. Both viewports fit without horizontal overflow. Camera and paint updates render on demand. Physical iPhone/Safari, sustained 30 FPS and the 100 ms input-feedback target still need device measurements. [Raw samples](measurements.json)

The model is an authored interpretation of the 1969 hardtop, with simplified panel contours, drivetrain and interior. The installation dependencies are educational. Custom paints and trims are creative options. The reference view shows the completed model independently of saved progress. Saves use browser local storage scoped to the current origin. Test evidence here comes from the local production build; the delivery receipt identifies the hosted check separately.
