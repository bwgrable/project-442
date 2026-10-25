# Stage 007 verification

Verified October 25, 2026 in the existing cloud checkout, `/workspace/project-442`, on `dev/stage-007-v8-bottom-end`. Baseline: Pilot006 `43861f64c3ee1dc637f7e9bea229b9960a2daa1b`. This report and the captured evidence accompany the tested source in the delivery commit; deployment identity is reported separately after publication.

## Delivered behavior

Twenty-one selectable components build the full illustrative V8 bottom end: bearings, crankshaft, main caps, eight pistons, eight rod joint sets, pump/pickup and pan. Rod sets include wrist pin, bearing and cap. Valid alternative orders work; missing prerequisites are explained without adding manipulation chores. Connected cylinders follow a shared four-throw shaft, while unconnected pistons stay at their teaching rest positions. Bank labels map the selector to visible bores. Cutaway and isolated inspection explain installed parts and the pan's enclosure.

## Final checks

- `npm run build`: passed for Stage007, preserved Pilot006 and Prototype005 entries. Existing Vite shared-chunk size warning remains; initial compressed assets are approximately 167 kB, including Three.js, well below the 5 MB budget.
- `npm test`: 55 passing state, model and analytic tests, including 12 focused V8 tests. Analytic tests sweep 1,440 angles for all eight cylinders; rendered-model tests sweep a revolution, checking wrist/crank centers, rod length, bore axes, paired rod lanes, hollow pan and section visibility.
- `npm run test:browser`: 5 passing scenarios on final edited code. Desktop and touch-emulated builds cover alternative orders, blocked crank/rod/pan, optional explanations, repeated selection without duplication, partial and complete motion, all eight joints through 360 degrees, reset/replay, bank labels, isolated inspection, and actual full-pan/cutaway mesh visibility. Additional scenarios cover keyboard, reduced motion, background pause, portrait/landscape resize, WebGL/module-load recovery and preserved historical entries. Interactive targets checked at least 44 pixels; no horizontal overflow or page errors observed.
- `node tests/v8-measure.mjs`: completed against the production build. Thirteen desktop/mobile screenshots captured and visually inspected. Raw measurements and capture descriptions are in [visual evidence](review/v8-bottom-end/README.md).
- `git diff --check`: passed. No dependencies, global settings, deployment protection or infrastructure changed.

The final chained build/unit/browser/capture command exited successfully. A prior complete browser pass also passed all five scenarios; the final pass followed the bank-label and diagnostic additions.

## Independent review

Bounded model/rules implementer requested GPT-6.1 Sol / medium. Independent read-only experience reviewer requested GPT-6.1 Sol / high. The coordinator's requested Astra/high choice was explicitly confirmed in the task history; these requested settings are not proof of effective serving models.

The reviewer independently ran the 12 focused tests and completed desktop and touch-emulated journeys: all 21 parts in alternative orders, blocked choices, hints, partial motion, repeated selection, inspection, bank/underside views, pan enclosure and reset/replay. No blocking findings remained. A low-severity floating drain plug in cutaway was fixed by hiding it with the removed pan floor. The reviewer checked the fix, then independently inspected final desktop/phone bank captures and cleared readable, correctly ordered labels and active-cylinder highlighting. The coordinator also corrected camera framing to keep geometry below captions and above footer controls, and inspected all 13 final captures.

## Budgets and limits

| Measure | Desktop | Touch-emulated phone |
| --- | --- | --- |
| Viewport | 1440 × 1100 | 390 × 844; landscape 844 × 390 |
| Ready at 10 Mbps / 100 ms latency | 1.594 s | 1.642 s |
| Six-second software-rendered motion sample | 2.09 FPS | 3.89 FPS |
| rAF interval p95 | 1016.5 ms | 283.4 ms |
| Completed cutaway | 83,752 triangles / 97 draw calls | Same |

Full assembly geometry is 89,420 triangles / 107 meshes, within the planned 120k/110 geometry budget. Chromium 154 with SwiftShader, DPR 1, is cloud software rendering, not phone hardware. Loading passed the five-second cloud target; **30 FPS for five minutes on a physical phone and 100 ms input-feedback latency remain unverified**. The cloud FPS does not pass the frame-rate target and cannot establish actual iPhone performance. Physical iPhone/Safari usability remains user acceptance. No hosted-browser success is inferred from local tests or a successful deployment check.

Geometry, bank labels and assembly dependencies are educational abstractions. No factory dimensions, firing order, service procedure, oil flow, pump drive or combustion simulation are claimed. See [mechanical assumptions](MECHANICAL_REFERENCES.md).

## Preservation and delivery boundary

New code is confined to `src/v8-*`, V8 tests and this stage's evidence. The active HTML and build/test entry configuration now select Stage007. Original Pilot006 HTML/README are copied to `pilot-006.html` and `PILOT006_README.md`; its source and earlier prototype source remain unchanged. All old branches and production are retained. Only the new branch's separate Preview is authorized; no merge or production promotion.
