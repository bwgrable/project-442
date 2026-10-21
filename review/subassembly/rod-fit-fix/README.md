# Rod-fit correction evidence

- [Before, mobile](before-mobile.png): original b714f9f delivery, effectively exact wrist-center alignment at the initial 30° angle rejected; on-scene feedback absent after release.
- [After, desktop](after-desktop.png): correction in the commit containing this evidence, rod fitted at a repositioned piston with its chosen 30° angle retained, separate wrist pin still loose.
- [After, mobile](after-mobile.png): same correction and state at 390 × 844, persistent nearby success message and adjacent controls.

All three were visually inspected in the cloud. After captures come from ordinary pointer/touch input on the production build; diagnostics only read/project rendered geometry. Chromium/SwiftShader, DPR 1; mobile is touch emulation, not a physical iPhone or hosted browser result. See [the correction report](../../../ROD_FIT_FIX.md) for checks, review and limits.
