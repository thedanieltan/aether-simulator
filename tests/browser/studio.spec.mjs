import { expect, test } from "@playwright/test";
import axe from "axe-core";

test("complete local studio journey is deterministic and accessible", async ({ page }) => {
  await page.addInitScript({ content: axe.source });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Model a fictional enterprise",
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.locator("#run-status")).toHaveText("complete", { timeout: 20_000 });
  const firstDigest = await page.locator(".metric").filter({ hasText: "Digest" }).locator("strong").textContent();
  await expect(page.locator(".graph")).toBeVisible();

  await page.getByRole("tab", { name: "Event timeline" }).click();
  await expect(page.locator(".timeline button").first()).toBeVisible();
  await page.locator(".timeline button").first().click();
  await expect(page.getByRole("tab", { name: "State inspector" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(".json-view")).toContainText("event_id");

  await page.getByRole("button", { name: "Checkpoint" }).click();
  await expect(page.locator("#run-status")).toHaveText("complete");
  await page.getByRole("button", { name: "Replay" }).click();
  await expect(page.locator("#run-status")).toHaveText("complete");
  expect(
    await page.locator(".metric").filter({ hasText: "Digest" }).locator("strong").textContent(),
  ).toBe(firstDigest);

  await page.getByRole("button", { name: "Branch" }).click();
  await expect(page.locator("#run-status")).toHaveText("complete");
  await page.getByRole("button", { name: "Compare" }).click();
  await expect(page.locator("#run-status")).toHaveText("complete");
  await page.getByRole("tab", { name: "Exports" }).click();
  await expect(page.getByRole("button", { name: "Download comparison.json" })).toBeVisible();

  await page.keyboard.press("Control+K");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByPlaceholder(/Type overview/).fill("lineage");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("tab", { name: "PII lineage" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  const results = await page.evaluate(() =>
    globalThis.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    }),
  );
  expect(results.violations).toEqual([]);
});

test("product shell supports stable routes and honest gated states", async ({ page }) => {
  await page.goto("/#/explore/timeline");
  await expect(page.locator("[data-route='explore']").first()).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("tab", { name: "Event timeline" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByText("Requires a completed run").first()).toBeVisible();

  await page.locator("[data-route='design']").first().click();
  await expect(page).toHaveURL(/#\/design$/);
  await expect(page.locator("[data-route='design']").first()).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.keyboard.press("Control+K");
  await page.getByPlaceholder(/Type overview/).fill("research boundary");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/boundary$/);
  await expect(page.getByRole("heading", { name: "Research boundaries stay visible" })).toBeVisible();
});

for (const width of [320, 375, 414, 768]) {
  test(`studio has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const dimensions = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
  });
}
