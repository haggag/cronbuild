import { test, expect } from "@playwright/test";

test("native raw-editor undo and redo keep outputs synchronized", async ({
  page,
}) => {
  await page.goto("/#0_2_*_*_1-5");
  const raw = page.getByLabel("Expression", { exact: true });
  await raw.press("Home");
  await raw.press("ArrowRight");
  await raw.press("Backspace");
  await raw.pressSequentially("5");
  await expect(raw).toHaveValue("5 2 * * 1-5");
  await expect(page.locator(".next-runs time").first()).toHaveText(
    "2026-09-08 02:05:00 +00:00",
  );
  // Delete and insertion may be separate native undo transactions.
  for (
    let attempt = 0;
    attempt < 2 && (await raw.inputValue()) !== "0 2 * * 1-5";
    attempt++
  )
    await raw.press("ControlOrMeta+z");
  await expect(raw).toHaveValue("0 2 * * 1-5");
  await expect(page.locator(".next-runs time").first()).toHaveText(
    "2026-09-08 02:00:00 +00:00",
  );
  for (
    let attempt = 0;
    attempt < 2 && (await raw.inputValue()) !== "5 2 * * 1-5";
    attempt++
  )
    await raw.press("ControlOrMeta+Shift+z");
  await expect(raw).toHaveValue("5 2 * * 1-5");
  await expect(page).toHaveURL(/#5_2_\*_\*_1-5$/);
  await expect(page.locator(".next-runs time").first()).toHaveText(
    "2026-09-08 02:05:00 +00:00",
  );
});

test("landscape presets and exports remain reachable in both themes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  for (const theme of ["dark", "light"]) {
    if (theme === "light")
      await page.getByRole("button", { name: "Switch to light theme" }).click();
    await page.getByRole("button", { name: /^Presets/ }).click();
    const search = page.getByRole("combobox", { name: "Search presets" });
    await expect(search).toBeInViewport();
    await search.fill("hourly");
    await search.press("Enter");
    await expect(page.getByLabel("Expression", { exact: true })).toHaveValue(
      "0 * * * *",
    );
    await expect(page.locator(".next-runs li")).toHaveCount(5);
    await page.getByRole("tab", { name: "Kubernetes", exact: true }).click();
    const copy = page.getByRole("button", { name: "Copy snippet" });
    await copy.scrollIntoViewIfNeeded();
    await expect(copy).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-07T08:59:00Z"));
});
test("restores a share link, computes in a real worker, edits and persists theme", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#0_2_*_*_1-5");
  await expect(page.getByLabel("Expression", { exact: true })).toHaveValue(
    "0 2 * * 1-5",
  );
  await expect(page.locator(".next-runs li")).toHaveCount(5);
  await page
    .getByLabel("Expression", { exact: true })
    .fill("*/15 9-17 * * 1-5");
  await expect(
    page.getByText("180 runs this week", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".heat-cell.active")).toHaveCount(45);
  await expect(page.locator(".next-runs time").first()).toHaveText(
    "2026-09-07 09:00:00 +00:00",
  );
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByLabel("Expression", { exact: true }).fill("80 * * * *");
  await expect(page.getByText(/Minute: Minute values must be/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copy snippet" }),
  ).toBeDisabled();
  await expect(page.locator(".next-runs")).toHaveCount(0);
  await page.getByRole("button", { name: "Presets" }).click();
  await page.getByRole("combobox", { name: "Search presets" }).fill("hourly");
  await page.getByRole("combobox", { name: "Search presets" }).press("Enter");
  await expect(page.getByLabel("Expression", { exact: true })).toHaveValue(
    "0 * * * *",
  );
  await expect(page.locator(".next-runs li")).toHaveCount(5);
  expect(errors).toEqual([]);
});
