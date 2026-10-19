// Reproducible cloud-browser evidence. These numbers are NOT physical-phone results.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const origin = process.env.PROOF_URL || 'http://127.0.0.1:4174';
const directory = process.env.EVIDENCE_DIR || '/tmp/project442-artifacts';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = { origin, browser: browser.version(), gpu: 'SwiftShader (software rendering)', physicalDevice: false, scenarios: [] };
for (const [name, width, height, mobile] of [['desktop', 1440, 1080, false], ['mobile', 390, 844, true]]) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 100, downloadThroughput: 10_000_000 / 8, uploadThroughput: 10_000_000 / 8 });
  await page.goto(origin);
  await page.locator('[data-ready=true]').waitFor({ timeout: 30000 });
  await page.screenshot({ path: `${directory}/${name}-bench.png`, fullPage: true });
  const initial = await page.evaluate(() => ({ readyMs: window.__PROJECT442__.snapshot().metrics.readyMs, bytes: performance.getEntriesByType('resource').reduce((n,r) => n + r.transferSize, 0), overflow: document.documentElement.scrollWidth > innerWidth }));
  await page.getByRole('button', { name: 'Piston + connecting rod' }).click();
  await page.getByRole('button', { name: 'Find the connection' }).click();
  if (mobile) await page.waitForFunction(() => Math.abs(document.getElementById('viewport').getBoundingClientRect().top) < 3);
  await page.screenshot({ path: `${directory}/${name}-alignment.png`, fullPage: true });
  await page.locator('#placement-target').click();
  await page.locator('#angle').fill('135');
  if (mobile) await page.locator('#viewport').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${directory}/${name}-connected.png`, fullPage: true });
  if (mobile) await page.screenshot({ path: `${directory}/${name}-connected-viewport.png` });
  await page.getByRole('button', { name: 'Turn crank', exact: true }).click();
  if (mobile) await page.locator('#viewport').scrollIntoViewIfNeeded();
  const timing = await page.evaluate(async () => {
    const start = performance.now(), beginning = window.__PROJECT442__.snapshot().metrics.frames;
    const samples = []; let previous = start;
    await new Promise(resolve => { function frame(t) { samples.push(t-previous); previous=t; if(t-start<5000) requestAnimationFrame(frame); else resolve(); } requestAnimationFrame(frame); });
    const elapsed = performance.now()-start;
    const snap = window.__PROJECT442__.snapshot();
    samples.sort((a,b)=>a-b);
    return { elapsedMs: elapsed, renderedFrames: snap.metrics.frames-beginning, averageRenderedFps: (snap.metrics.frames-beginning)/(elapsed/1000), rafP95Ms: samples[Math.floor(samples.length*.95)], trianglesIncludingShadowPass: snap.metrics.triangles, drawCallsIncludingShadowPass: snap.metrics.drawCalls };
  });
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Cutaway', exact: true }).click();
  await page.screenshot({ path: `${directory}/${name}-full-casting.png`, fullPage: true });
  results.scenarios.push({ name, width, height, ...initial, ...timing, errors });
  await context.close();
}
await browser.close();
await writeFile(`${directory}/measurements.json`, JSON.stringify(results, null, 2)+'\n');
console.log(JSON.stringify(results, null, 2));
