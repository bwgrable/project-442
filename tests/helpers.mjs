export const ready = async page => { await page.goto('/'); await page.locator('[data-ready=true]').waitFor({timeout:45000}); };
export const snapshot = page => page.evaluate(() => window.__PROJECT442__.snapshot());
export async function place(page, part, location) {
  await page.locator(`[data-part="${part}"]`).click();
  await page.locator('#primary-action').click();
  await page.locator(`#location-list [data-location="${location}"]`).click();
  await page.locator('#seat').click();
}
export async function secure(page) {
  await page.locator('[data-tool="socket"]').click();
  await page.locator('[data-fastener="0"]').click();
  await page.locator('[data-fastener="1"]').click();
}
export async function assemble(page) {
  await place(page,'crank','mainLine');
  await place(page,'mainCaps','mainCaps'); await secure(page);
  await place(page,'piston','cylinder');
  await place(page,'rodCap','crankpin'); await secure(page);
}
