import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PRESETS } from "../../src/domain/cron/presets";
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-07T08:59:00Z"));
  await page.goto("/");
  await expect(page.locator(".next-runs li")).toHaveCount(5);
});
test("all presets synchronize raw expression and worker results", async ({
  page,
}) => {
  for (const [, name, expression] of PRESETS) {
    await page.getByRole("button", { name: "Presets" }).click();
    await page.getByRole("combobox").fill(name);
    await page.getByRole("combobox").press("Enter");
    await expect(page.getByLabel("Expression", { exact: true })).toHaveValue(
      expression,
    );
    await expect(page.locator(".next-runs li")).toHaveCount(5);
    expect(
      decodeURIComponent(new URL(page.url()).hash.slice(1)).replaceAll(
        "_",
        " ",
      ),
    ).toBe(expression);
  }
});
test("field builders preserve custom syntax, empty selections, and raw caret", async ({
  page,
}) => {
  const raw = page.getByLabel("Expression", { exact: true });
  await raw.fill("20/15 09-17 * * 1-5");
  await page.getByRole("tab", { name: "Hour", exact: true }).click();
  await expect(raw).toHaveValue("20/15 09-17 * * 1-5");
  await expect(page.getByText("Custom syntax preserved")).toBeVisible();
  await page.getByRole("button", { name: "Hour 10 AM", exact: true }).click();
  await expect(raw).toHaveValue("20/15 9,11,12,13,14,15,16,17 * * 1-5");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(raw).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("button", { name: "Share URL" })).toBeDisabled();
  await page.getByRole("button", { name: "Hour 9 AM", exact: true }).click();
  await expect(raw).toHaveValue("20/15 9 * * 1-5");
  await page.getByRole("tab", { name: "Day of week", exact: true }).click();
  await page.getByRole("button", { name: "Weekends", exact: true }).click();
  await expect(raw).toHaveValue("20/15 9 * * 0,6");
  await page.getByRole("radio", { name: "At an interval" }).check();
  await page
    .getByRole("spinbutton", { name: "Interval in weekday values" })
    .fill("2");
  await expect(raw).toHaveValue("20/15 9 * * 0-6/2");
  await page
    .getByRole("spinbutton", { name: "Interval in weekday values" })
    .fill("");
  await expect(raw).toHaveAttribute("aria-invalid", "true");
  await page
    .getByRole("spinbutton", { name: "Interval in weekday values" })
    .fill("3");
  await expect(raw).toHaveAttribute("aria-invalid", "false");
  await raw.fill("5 * * * *");
  await raw.evaluate((element: HTMLInputElement) =>
    element.setSelectionRange(1, 1),
  );
  await raw.press("0");
  await expect(raw).toHaveValue("50 * * * *");
  expect(
    await raw.evaluate((element: HTMLInputElement) => element.selectionStart),
  ).toBe(2);
});
test("all exports copy the displayed text and denied clipboard offers manual text", async ({
  page,
}) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as unknown as { copied: string }).copied = value;
        },
      },
    });
  });
  for (const name of ["crontab", "GitHub Actions", "Kubernetes", "AI Prompt"]) {
    await page.getByRole("tab", { name, exact: true }).click();
    const text = await page.locator("pre").textContent();
    await page.getByRole("button", { name: "Copy snippet" }).click();
    expect(
      await page.evaluate(
        () => (window as unknown as { copied: string }).copied,
      ),
    ).toBe(text);
    await expect(page.getByText("Copied!", { exact: true })).toBeVisible();
  }
  await expect(page.getByText("Copied!", { exact: true })).not.toBeVisible({
    timeout: 3000,
  });
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
    });
  });
  await page.getByRole("button", { name: "Copy snippet" }).click();
  await expect(
    page.getByRole("textbox", { name: "Text to copy manually" }),
  ).toHaveValue((await page.locator("pre").textContent())!);
  await expect(page.getByText("Copied!", { exact: true })).not.toBeVisible();
});
test("keyboard presets search, no results, escape restores input focus", async ({
  page,
}) => {
  const raw = page.getByLabel("Expression", { exact: true });
  await raw.focus();
  await raw.press("Control+k");
  const search = page.getByRole("combobox");
  await expect(search).toBeFocused();
  await search.fill("does-not-exist");
  await expect(
    page.getByText("No schedules found.", { exact: false }),
  ).toBeVisible();
  await search.press("Escape");
  await expect(raw).toBeFocused();
});
test("no stale preview survives rapid valid and invalid edits or timezone changes", async ({
  page,
}) => {
  const raw = page.getByLabel("Expression", { exact: true });
  for (const expression of [
    "* * * * *",
    "0 0 29 2 *",
    "80 * * * *",
    "0 9 * * 1-5",
  ])
    await raw.fill(expression);
  await page.getByRole("radio", { name: "UTC", exact: true }).check();
  await expect(page.locator(".next-runs time").first()).toHaveText(
    "2026-09-07 09:00:00 +00:00",
  );
  await raw.fill("0 0 31 2 *");
  await expect(page.locator(".next-runs")).toHaveCount(0);
  await expect(page.locator("pre")).toHaveCount(0);
});
test("history caps at ten and supports clear undo without overwriting the draft", async ({
  page,
}) => {
  const raw = page.getByLabel("Expression", { exact: true });
  for (let i = 0; i < 11; i++) {
    await raw.fill(`${i} * * * *`);
    await raw.press("Enter");
  }
  await expect(page.locator(".recent-chips button")).toHaveCount(10);
  await page
    .getByRole("button", { name: "Clear history", exact: true })
    .click();
  await expect(page.locator(".recent-chips button")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo clear", exact: true }).click();
  await expect(page.locator(".recent-chips button")).toHaveCount(10);
  await raw.fill("unfinished");
  await page.evaluate(() =>
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "cronbuild:history:v1",
        newValue: '[{"expression":"0 0 * * *","usedAt":1}]',
      }),
    ),
  );
  await expect(raw).toHaveValue("unfinished");
});
test("public documents are static and documented links restore", async ({
  page,
  request,
}) => {
  for (const path of ["/llms.txt", "/cronbuild-guide.md"]) {
    const response = await request.get(path);
    expect(response.ok()).toBeTruthy();
    const body = await response.text();
    expect(body).toContain("# CronBuild");
    expect(body).not.toContain("<!doctype html>");
    for (const match of body.matchAll(
      /\]\(https:\/\/cronbuild\.com\/(#[^\s)]+)\)/g,
    )) {
      await page.goto("/" + match[1]);
      await expect(
        page.getByLabel("Expression", { exact: true }),
      ).toHaveAttribute("aria-invalid", "false");
    }
  }
});
for (const theme of ["dark", "light"])
  test(`accessible ${theme} workspace, dialog, and errors`, async ({
    page,
  }) => {
    if (theme === "light")
      await page.getByRole("button", { name: "Switch to light theme" }).click();
    const scan = async () => {
      const result = await new AxeBuilder({ page }).analyze();
      expect(
        result.violations.filter((v) =>
          ["serious", "critical"].includes(v.impact ?? ""),
        ),
      ).toEqual([]);
    };
    await scan();
    await page.getByRole("button", { name: "Presets" }).click();
    await scan();
    await page.getByRole("combobox").press("Escape");
    await page.getByLabel("Expression", { exact: true }).fill("80 * * 13 *");
    await scan();
  });
for (const width of [320, 390, 768, 1024, 1440])
  test(`responsive workspace at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`dark-${width}.png`),
      fullPage: true,
    });
    await page.getByRole("tab", { name: "Minute", exact: true }).click();
    await page.getByRole("radio", { name: "Specific values" }).check();
    await page.getByRole("button", { name: "Minute 07", exact: true }).click();
    await page.getByRole("button", { name: "Switch to light theme" }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`light-${width}.png`),
      fullPage: true,
    });
  });
test("computes without third-party requests or further network activity", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.getByLabel("Expression", { exact: true }).fill("*/5 * * * *");
  await expect(
    page.getByText("2,016 runs this week", { exact: true }),
  ).toBeVisible();
  expect(requests).toEqual([]);
  expect(
    await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistrations()).length,
    ),
  ).toBe(0);
});
