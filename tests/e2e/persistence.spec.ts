import { test, expect } from "@playwright/test";
test("a theme-only storage event preserves the captured forecast", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-09-07T08:59:00Z"));
  await page.goto("/#0_9_*_*_*");
  const first = page.locator(".next-runs time").first();
  await expect(first).toHaveText("2026-09-07 09:00:00 +00:00");
  await page.clock.setFixedTime(new Date("2026-09-08T08:59:00Z"));
  await page.evaluate(() =>
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "cronbuild:preferences:v1",
        newValue: JSON.stringify({ theme: "light", timezone: "local" }),
      }),
    ),
  );
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(first).toHaveText("2026-09-07 09:00:00 +00:00");
});
test("clear cancels pending autosave but explicit preset selection can save again", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/#0_*_*_*_*");
  const raw = page.getByLabel("Expression", { exact: true });
  await raw.press("Enter");
  await page
    .getByRole("button", { name: "Clear history", exact: true })
    .click();
  await page.clock.runFor(1000);
  await expect(page.locator(".recent-chips button")).toHaveCount(0);
  await page.getByRole("button", { name: "Presets" }).click();
  await page.getByRole("combobox").fill("Hourly");
  await page.getByRole("combobox").press("Enter");
  await expect(page.locator(".recent-chips button")).toHaveCount(1);
  await expect(page.locator(".recent-chips button").first()).toHaveText(
    "0 * * * *",
  );
});
