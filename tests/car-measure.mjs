import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const results = [];
try {
  for (const [width, height] of [
    [1440, 950],
    [390, 844],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: width < 500,
      hasTouch: width < 500,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage(),
      cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 100,
      downloadThroughput: 1.25e6,
      uploadThroughput: 1.25e6,
    });
    await page.goto(process.env.PROOF_URL || "http://127.0.0.1:4194/");
    await page.locator("[data-ready=true]").waitFor();
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    results.push(
      await page.evaluate(() => {
        const { triangles, calls } = window.__garage442.snapshot().metrics;
        const entries = performance.getEntriesByType("resource");
        return {
          width: innerWidth,
          height: innerHeight,
          readyAndTwoFramesMs: Math.round(performance.now()),
          triangles,
          drawCalls: calls,
          uncompressedBytes: entries.reduce(
            (n, r) => n + r.decodedBodySize,
            performance.getEntriesByType("navigation")[0].decodedBodySize,
          ),
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      }),
    );
    await context.close();
  }
} finally {
  await browser.close();
}
const report = {
  renderer:
    "Cloud Chromium / SwiftShader, DPR 1, 10 Mbps / 100 ms, cold context, finished reference",
  results,
};
await writeFile(
  "review/full-car/measurements.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(report);
