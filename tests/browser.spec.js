import { test, expect } from '@playwright/test';
const ready = async (page) => { await page.goto('/'); await expect(page.locator('[data-ready=true]')).toBeVisible(); };
const snapshot = (page) => page.evaluate(() => window.__PROJECT442__.snapshot());
const align = async (page) => {
  await page.getByRole('button', { name: 'Piston + connecting rod' }).click();
  await page.getByRole('button', { name: 'Find the connection' }).click();
};

test('desktop: inspect, camera, cancel, place, connected motion, reset', async ({ page }) => {
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  const before = (await snapshot(page)).camera;
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  expect((await snapshot(page)).camera).not.toEqual(before);
  await page.getByRole('button', { name: 'Reset camera', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).camera).toEqual(before);
  await align(page); await expect(page.locator('#placement-target')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel placement' }).click();
  expect((await snapshot(page)).state.phase).toBe('bench');
  await page.getByRole('button', { name: 'Find the connection' }).dblclick();
  expect((await snapshot(page)).state.phase).toBe('aligned');
  await page.locator('#placement-target').click();
  expect((await snapshot(page)).state.phase).toBe('installed');
  await expect(page.getByRole('button', { name: 'Detail', exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (const degrees of [0, 45, 90, 135, 180, 225, 270, 315, 360]) {
    await page.locator('#angle').fill(String(degrees));
    const s = await snapshot(page);
    const error = Math.hypot(...s.positions.rodSmall.map((v, i) => v - s.positions.piston[i]));
    expect(error).toBeLessThan(1e-9);
  }
  await page.getByRole('button', { name: 'Turn crank' }).click();
  const angle = (await snapshot(page)).state.angle;
  await expect.poll(async () => (await snapshot(page)).state.angle).not.toBe(angle);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  expect((await snapshot(page)).state.playing).toBe(false);
  await page.getByRole('button', { name: 'Reset entire exploration' }).click();
  expect((await snapshot(page)).state).toMatchObject({ phase: 'bench', selected: 'block', playing: false, section: true });
  expect(errors).toEqual([]);
});

test('canvas tap selects a part, while orbit never selects or places it', async ({ page }) => {
  await ready(page);
  const point = (await snapshot(page)).pistonScreen;
  await page.mouse.click(point.x, point.y);
  expect((await snapshot(page)).state.selected).toBe('piston');
  await page.getByRole('button', { name: 'Find the connection' }).click();
  const canvas = await page.locator('canvas').first().boundingBox();
  const before = (await snapshot(page)).camera;
  await page.mouse.move(canvas.x + canvas.width * .4, canvas.y + canvas.height * .5);
  await page.mouse.down(); await page.mouse.move(canvas.x + canvas.width * .7, canvas.y + canvas.height * .6, { steps: 15 }); await page.mouse.up();
  expect((await snapshot(page)).state.phase).toBe('aligned');
  expect((await snapshot(page)).camera).not.toEqual(before);
});

test('mobile-size touch: orbit and pinch do not place, layout remains within viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await context.newPage(); await ready(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await align(page);
  await expect.poll(async () => Math.abs((await page.locator('#viewport').boundingBox()).y)).toBeLessThan(3);
  const bounds = await page.locator('canvas').first().boundingBox();
  const cdp = await context.newCDPSession(page);
  const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height * .68;
  expect(await page.evaluate(({x,y}) => document.elementFromPoint(x,y)?.tagName, {x:x-35,y})).toBe('CANVAS');
  const before = (await snapshot(page)).camera;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x-35, y, id: 0 }, { x: x+35, y, id: 1 }] });
  for (let i=0;i<8;i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x-35-i*4, y, id: 0 }, { x: x+35+i*4, y, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect((await snapshot(page)).state.phase).toBe('aligned');
  expect((await snapshot(page)).camera).not.toEqual(before);
  await page.locator('#placement-target').tap();
  expect((await snapshot(page)).state.phase).toBe('installed');
  const motion = await page.locator('#motion-controls').boundingBox();
  expect(motion.y + motion.height).toBeLessThanOrEqual(844);
  expect(await page.locator('#motion-controls').evaluate(el => getComputedStyle(el).position)).toBe('fixed');
  await page.getByRole('button', { name: 'Turn crank', exact: true }).tap();
  await expect.poll(async () => (await snapshot(page)).state.playing).toBe(true);
  await page.getByRole('button', { name: 'Pause', exact: true }).tap();
  await page.getByRole('button', { name: 'Step 15°' }).tap();
  expect((await snapshot(page)).state.playing).toBe(false);
  await context.close();
});

test('reduced motion offers deliberate stepping with autoplay disabled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await ready(page);
  await align(page); await page.getByRole('button', { name: 'Seat in selected cylinder' }).click();
  await expect(page.getByRole('button', { name: 'Turn crank' })).toBeDisabled();
  const before = (await snapshot(page)).state.angle;
  await page.getByRole('button', { name: 'Step 15°' }).click();
  expect((await snapshot(page)).state.angle).toBeCloseTo(before + Math.PI / 12);
});

test('WebGL initialization failure shows useful fallback and disables scene actions', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return String(type).includes('webgl') ? null : original.call(this, type, ...args); };
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'The 3D view couldn’t start.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reload workshop' })).toBeEnabled();
  await expect(page.locator('#primary-action')).toBeDisabled();
});
