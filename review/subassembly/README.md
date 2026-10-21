# Prototype 005 visual evidence

These images show the local production build from the source commit containing this directory, on `dev/prototype-005-subassembly`. They do not establish hosted-deployment access or actual-phone behavior.

Chromium 154 / SwiftShader software rendering, device-scale factor 1. Desktop viewport 1440 × 1080; phone emulation 390 × 844 with touch enabled. Full-page captures can exceed viewport height. See [measurements.json](measurements.json) for network/loading and short render samples; resource totals exclude the HTML navigation.

| State | Desktop | Phone emulation |
|---|---|---|
| Three separate joint pieces, prepared engine and loose final cap | [Opening](desktop-opening.png) | [Opening](mobile-opening.png) |
| Rod fitted at the repositioned piston; joint still unpinned | [Temporary fit](desktop-fitted.png) | [Temporary fit](mobile-fitted.png) |
| Separate pin partway through its continuous insertion gesture | [Insertion](desktop-insertion.png) | [Insertion](mobile-insertion.png) |
| Pinned unit with rod pivoted 45° about the fixed wrist center | [Pivot](desktop-pivot.png) | [Pivot](mobile-pivot.png) |
| Completed unit and rod cap in the prepared engine, crank at 135° | [Engine](desktop-engine.png) | [Engine](mobile-engine.png) |

All ten captures were visually inspected. They use real mouse/touch input and read-only projection diagnostics. Joint-center and rod-length assertions run during the capture journey. Engine captures and render samples use the optional closer mechanism view. Automated reachability does not establish whether a new player understands the assembly without help. Software-rendering samples are far below 30 FPS and cannot establish five-minute physical-phone performance or input latency.

See [the verification report](../../SUBASSEMBLY_VERIFICATION.md) for reviewed behavior, test results and remaining acceptance limits.
