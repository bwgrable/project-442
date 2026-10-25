# Stage 007 visual evidence

Captured October 25, 2026 from the final production build in cloud Chromium/SwiftShader. Desktop is 1440 × 1100 with full-page captures; phone is touch-emulated 390 × 844, plus 844 × 390 landscape. These are not physical iPhone captures. All thirteen images were visually inspected; the independent reviewer also checked final bank labels on desktop and phone.

| Capture | What it shows |
| --- | --- |
| [Desktop opening](desktop-opening.png) | Prepared block, all choices available, no installed parts |
| [Desktop assembly](desktop-assembly.png) | All 21 parts installed; both banks at 135 degrees |
| [Desktop Bank B](desktop-bank-B.png) | Four bore labels, B2 selected, matching cylinder controls |
| [Desktop underside](desktop-underside.png) | Crank, rod joints and pump/pickup exposed by cutaway |
| [Desktop full pan](desktop-pan-full.png) | Restored pan encloses the underside, drain attached to floor |
| [Desktop rod detail](desktop-rod-detail.png) | Isolated A3 rod joint set with wrist pin and matched cap |
| [Phone blocked choice](phone-blocked.png) | Missing pan prerequisites visible beside the scene |
| [Phone Bank A](phone-bank-A.png) | A3 selected, readable bore labels and adjacent touch controls |
| [Phone Bank B](phone-bank-B.png) | B2 selected and its piston/rod controls |
| [Phone underside](phone-underside.png) | Pump and crank visible without caption overlap |
| [Phone pan detail](phone-pan-detail.png) | Hollow sump and mounting flange; accessible return control |
| [Phone pump detail](phone-pump-detail.png) | Isolated pump housing and pickup screen |
| [Phone landscape](phone-landscape.png) | Responsive scene and controls at 844 × 390 |

[Raw cloud measurements](measurements.json) record readiness, rendering samples, triangle/draw-call counts, overflow and page errors. Network shaping: 10 Mbps, 100 ms latency. Readiness was approximately 1.6 seconds; cloud software rendering was 2–4 FPS. Neither proves physical-phone smoothness. See [verification and limitations](../../V8_BOTTOM_END_VERIFICATION.md).

Reproduce with `npm run build`, a production preview at port4190, then `node tests/v8-measure.mjs`. `PROOF_URL`, `EVIDENCE_DIR` and `CHROMIUM_PATH` are optional overrides.
