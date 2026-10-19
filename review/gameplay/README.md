# Local production-build evidence

These captures belong to the source revision containing this directory. They are from the cloud workspace's local production server, not the hosted Preview or a physical phone. Chromium 154 / SwiftShader, device scale factor 1; desktop 1440×1080 and touch-enabled mobile viewport 390×844. Network emulation: 10 Mbps download/upload, 100 ms latency.

- [Desktop opening, no hint requested](desktop-opening-viewport.png)
- [Desktop connected assembly, 135°](desktop-connected.png)
- [Phone-sized opening](mobile-opening-viewport.png)
- [Phone-sized connected assembly and fixed hand-turn controls](mobile-connected-viewport.png)
- [Phone-sized destination hint, explicitly requested level 3](mobile-hint.png)
- [Raw cloud measurements](measurements.json)

Both captures reported no horizontal overflow and no page errors. Ready times were 3.98 s desktop and 3.64 s mobile-sized. Resource transfer entries totaled 166,975 bytes each; that counter excludes the HTML navigation and is not a complete initial-transfer measurement. Build gzip estimates total about 171.26 kB for HTML, CSS and JS.

Short animation samples measured 0.95 and 1.38 rendered FPS respectively under software rendering. They do not satisfy the proposed 30 FPS target in this environment and cannot establish physical-phone performance. The five-minute baseline-phone check, 100 ms input-feedback measurement and uncoached human gameplay acceptance remain pending. These captures show states, not animation smoothness.
