# Prototype 004 visual evidence

These images show the local production build from the source commit containing this directory, on `dev/prototype-004-small-pile`. They are not hosted-deployment screenshots or physical-phone evidence.

Chromium 154, SwiftShader software rendering, device scale factor 1. Desktop: 1440 × 1080. Phone emulation: 390 × 844 with touch enabled. Full-page captures can be taller than the viewport. See [measurements.json](measurements.json) for the single-run 10 Mbps / 100 ms network samples, render counts and direct installed-mesh lift/cancel assertions. Resource transfer totals exclude the HTML navigation.

| State | Desktop | Phone emulation |
|---|---|---|
| Initial four-part pile | [Opening](desktop-opening.png) | [Opening](mobile-opening.png) |
| Held crank near its connection; roll still required | [Alignment](desktop-alignment.png) | [Alignment](mobile-alignment.png) |
| Connected mechanism, crank at 135° | [Connected](desktop-connected.png) | [Connected](mobile-connected.png) |
| Installed piston lifted after motion; rod cap also detached | [Lifted](desktop-lifted.png) | [Lifted](mobile-lifted.png) |

The screenshots were visually inspected. The lift captures precede cancellation, which restores the exact previous parts and crank angle. Automated interaction checks establish reachability, not uncoached human understanding. The five-minute 30 FPS target and actual iPhone/Safari usability remain unverified; short cloud software-rendering samples are below 30 FPS.

See [the full verification report](../../SMALL_PILE_VERIFICATION.md).
