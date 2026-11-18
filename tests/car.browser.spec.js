import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { parts } from "../src/car-catalog.js";

const evidence = "review/full-car/";
const snapshot = (page) => page.evaluate(() => window.__garage442.snapshot());
for (const touch of [false, true]) {
  test(
    (touch ? "Touch" : "Desktop") + " complete build, finishes and rebuild",
    async ({ browser }) => {
      test.setTimeout(360000);
      const ctx = await browser.newContext({
        viewport: touch
          ? { width: 390, height: 844 }
          : { width: 1440, height: 950 },
        hasTouch: touch,
        isMobile: touch,
        reducedMotion: "reduce",
      });
      const page = await ctx.newPage(),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const hit = async (sel) =>
        touch ? page.locator(sel).tap() : page.locator(sel).click();
      const shot = async (name) => {
        await mkdir(evidence, { recursive: true });
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({
          path: evidence + (touch ? "phone-" : "desktop-") + name + ".png",
        });
      };
      await page.goto("/");
      await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
      await shot("reference");
      if (touch) {
        const cdp = await ctx.newCDPSession(page),
          bounds = await page.locator("canvas").boundingBox();
        const x = bounds.x + bounds.width / 2,
          y = bounds.y + bounds.height / 2,
          prior = (await snapshot(page)).metrics.eye;
        for (const [type, spread] of [
          ["touchStart", 24],
          ["touchMove", 40],
          ["touchMove", 62],
          ["touchEnd", 0],
        ]) {
          await cdp.send("Input.dispatchTouchEvent", {
            type,
            touchPoints: spread
              ? [
                  { x: x - spread, y, id: 1 },
                  { x: x + spread, y, id: 2 },
                ]
              : [],
          });
        }
        expect((await snapshot(page)).metrics.eye).not.toEqual(prior);
        await page.selectOption("#camera", "side");
        await page.selectOption("#camera", "front");
      }
      const initialEye = (await snapshot(page)).metrics.eye;
      await hit("#plus");
      expect((await snapshot(page)).metrics.eye).not.toEqual(initialEye);
      const canvas = page.locator("canvas");
      await canvas.focus();
      await page.keyboard.press("ArrowRight");
      if (!touch) {
        const box = await canvas.boundingBox();
        await page.mouse.move(box.x + 110, box.y + 130);
        await page.mouse.down();
        await page.mouse.move(box.x + 190, box.y + 160, { steps: 5 });
        await page.mouse.up();
      }
      await hit("[data-part=front-crossmember]");
      await hit("#detail button");
      await expect(page.locator("#detail")).toContainText("Perimeter frame");
      const pool = touch ? [...parts].reverse() : parts,
        installed = new Set();
      let lastCat = parts[0].category;
      while (installed.size < parts.length) {
        const p = pool.find(
          (x) =>
            !installed.has(x.id) && x.needs.every((id) => installed.has(id)),
        );
        if (lastCat !== p.category) {
          await hit('[data-category="' + p.category + '"]');
          lastCat = p.category;
        }
        await hit('[data-part="' + p.id + '"]');
        installed.add(p.id);
        if (installed.size === 25) {
          await shot("partial");
          await page.reload();
          await expect(page.locator("#count")).toHaveText("25 / 100");
          lastCat = parts[0].category;
        }
      }
      await expect(page.locator("#count")).toHaveText("100 / 100");
      expect((await snapshot(page)).metrics.visible).toHaveLength(100);
      await hit("#paint-tab");
      for (const label of [
        "Juniper",
        "Satin",
        "Ivory",
        "Torque spoke",
        "Saddle",
      ]) {
        const b = page
          .locator("#paint button")
          .filter({ hasText: label })
          .first();
        if (touch) await b.tap();
        else await b.click();
      }
      await hit('[data-key=stripe][data-value="#f1ead7"]');
      await page.reload();
      await expect(page.locator("#count")).toHaveText("100 / 100");
      expect((await snapshot(page)).state.style).toMatchObject({
        paint: "#2e6455",
        roof: "#e8e0ca",
        stripe: "#f1ead7",
        finish: "satin",
        interior: "#9d6844",
        wheels: "torque",
      });
      await hit("#paint-tab");
      await shot("custom");
      await page.selectOption("#camera", "rear");
      await shot("rear");
      await page.selectOption("#camera", "side");
      await shot("side");
      await page.selectOption("#camera", "inside");
      expect((await snapshot(page)).metrics.visible.length).toBeLessThan(100);
      await shot("cabin");
      await hit("#assembly-tab");
      await page.locator("#search").fill("air cleaner");
      await hit("[data-part=air-cleaner]");
      await hit("#detail button:first-of-type");
      expect((await snapshot(page)).metrics.visible).toEqual(["air-cleaner"]);
      await hit("#detail button:first-of-type");
      await hit("#detail button:last-of-type");
      await expect(page.locator("#count")).toHaveText("99 / 100");
      await hit("[data-part=air-cleaner]");
      await page.locator("#search").fill("perimeter");
      await hit("[data-part=frame]");
      await hit("#detail button:last-of-type");
      await hit("#cancel");
      await expect(page.locator("#count")).toHaveText("100 / 100");
      await hit("#detail button:last-of-type");
      await hit("#accept");
      await expect(page.locator("#count")).toHaveText("0 / 100");
      await hit("#undo");
      await expect(page.locator("#count")).toHaveText("100 / 100");
      await hit("#reset");
      await hit("#accept");
      await page.reload();
      await expect(page.locator("#count")).toHaveText("0 / 100");
      await hit("[data-part=frame]");
      await expect(page.locator("#count")).toHaveText("1 / 100");
      if (touch) await page.setViewportSize({ width: 844, height: 390 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(errors).toEqual([]);
      await ctx.close();
    },
  );
}
test("storage denial, WebGL recovery and archived page", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("unavailable");
    };
  });
  await page.goto("/");
  await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
  await page.locator("[data-part=frame]").click();
  await expect(page.locator("#saved")).toContainText("unavailable");
  await page.evaluate(() =>
    document
      .querySelector("canvas")
      .getContext("webgl2")
      .getExtension("WEBGL_lose_context")
      .loseContext(),
  );
  await expect(page.locator("#loading")).toContainText("Reload");
  await page.goto("/stage-007.html");
  await expect(page.locator("[data-ready=true]")).toBeVisible();
});
