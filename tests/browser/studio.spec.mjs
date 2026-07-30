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

  await page.getByRole("tab", { name: "Entities" }).click();
  await page.getByLabel("Entity type").selectOption("people");
  await expect(page.locator(".entity-list-item").first()).toContainText("Synthetic");
  await page.locator(".entity-list-item").first().click();
  await expect(page.locator(".entity-detail")).toContainText(
    "Role and relationship contexts",
  );
  await expect(page.locator(".entity-boundary")).toHaveText(
    "Synthetic · non-authoritative",
  );

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

test("local project workspace survives reload and round-trips a project file", async ({ page }) => {
  await page.goto("/#/projects");
  await expect(page.locator("#project-status")).toHaveText("Local workspace ready.");
  await page.getByLabel("Project name").fill("Fictional retailer study");
  await page.getByLabel("Description").fill("Local deterministic project.");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.locator("#project-status")).toContainText("Project created");

  await page.locator("#seed").fill("persisted-project-seed");
  await page.locator("#seed").blur();
  await expect(page.locator("#project-status")).toContainText("configuration saved");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.locator("#run-status")).toHaveText("complete", { timeout: 20_000 });
  const digest = await page.locator(".metric").filter({ hasText: "Digest" }).locator("strong").textContent();
  await expect(page.locator("#project-status")).toContainText("project saved");

  await page.reload();
  await expect(page.locator("#project-status")).toContainText(
    "Project and last run restored locally",
    { timeout: 20_000 },
  );
  await expect(page.locator(".metric").filter({ hasText: "Digest" }).locator("strong")).toHaveText(digest);

  await page.getByLabel("Project name").fill("Renamed fictional retailer");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.locator("#project-context")).toHaveText("Renamed fictional retailer");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export project" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    "renamed-fictional-retailer.aether-project.json",
  );
  const projectPath = await download.path();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.locator("#project-count")).toHaveText("0 projects");

  await page.locator("#project-import").setInputFiles(projectPath);
  await expect(page.locator("#project-count")).toHaveText("1 project");
  await expect(page.locator("#project-context")).toHaveText("Renamed fictional retailer");
  await expect(page.locator("#project-status")).toContainText(
    "Project and last run restored locally",
    { timeout: 20_000 },
  );
});

test("visual scenario blueprint validates, exports, and compiles to the run workspace", async ({ page }) => {
  await page.goto("/#/design");
  await page.locator("#blueprint-depth").selectOption("economy");
  await page.locator("#blueprint-scenario").selectOption("stable-baseline");
  await page.locator("#blueprint-scale").fill("2");
  await page.locator("#blueprint-duration").fill("120");
  await page.locator("#blueprint-intervention").fill("20");
  await page.locator("#blueprint-seed").fill("visual-blueprint-seed");
  await expect(page.locator("#blueprint-status")).toContainText("valid");
  await expect(page.locator(".blueprint-node")).toHaveCount(5);

  await page.locator("[data-blueprint-node='population']").click();
  await expect(page.locator("#blueprint-scale")).toBeFocused();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export blueprint" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    "economy-stable-baseline.blueprint.json",
  );

  await page.locator("#blueprint-scale").fill("0");
  await expect(page.getByRole("button", { name: "Apply to run" })).toBeDisabled();
  await expect(page.locator("#blueprint-status")).toContainText("scale");
  await page.locator("#blueprint-scale").fill("2");
  await page.getByRole("button", { name: "Apply to run" }).click();

  await expect(page).toHaveURL(/#\/run$/);
  await expect(page.locator("#depth")).toHaveValue("economy");
  await expect(page.locator("#scenario")).toHaveValue("stable-baseline");
  await expect(page.locator("#scale")).toHaveValue("2");
  await expect(page.locator("#duration")).toHaveValue("120");
  await expect(page.locator("#intervention")).toHaveValue("20");
  await expect(page.locator("#seed")).toHaveValue("visual-blueprint-seed");
});

test("scenario laboratory runs a fixed baseline and exports bounded variants", async ({ page }) => {
  await page.goto("/#/lab");
  await expect(page.getByRole("heading", { name: "Hold the world still" })).toBeVisible();
  await page.locator("#experiment-a").fill("8");
  await page.locator("#experiment-b").fill("20");
  await page.getByRole("button", { name: "Run experiment" }).click();
  await expect(page.locator("#experiment-status")).toContainText(
    "Experiment complete",
    { timeout: 30_000 },
  );
  await expect(page.locator(".experiment-table tbody tr")).toHaveCount(2);
  await expect(page.locator(".experiment-table tbody tr").nth(0)).toContainText("8");
  await expect(page.locator(".experiment-table tbody tr").nth(1)).toContainText("20");
  await expect(page.locator(".experiment-results")).toContainText(
    "not real-world causal estimates",
  );

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export results" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("aether-experiment-results.json");
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
