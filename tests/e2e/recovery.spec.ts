import { test, expect } from "@playwright/test";
test("invalid startup links recover without a successful-looking default", async ({
  page,
}) => {
  for (const hash of ["#%_0_*_*_*", "#0_0_31_2_*", "#" + "0".repeat(2050)]) {
    await page.goto("/" + hash);
    await expect(
      page.getByLabel("Expression", { exact: true }),
    ).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator(".next-runs")).toHaveCount(0);
    await page.getByRole("button", { name: "Use default expression" }).click();
    await expect(page.getByLabel("Expression", { exact: true })).toHaveValue(
      "*/15 9-17 * * 1-5",
    );
    await expect(page.locator(".next-runs li")).toHaveCount(5);
  }
});
test("blocked storage keeps a usable workspace and session history", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("blocked");
      },
    });
  });
  await page.goto("/#0_2_*_*_1-5");
  await expect(page.locator(".next-runs li")).toHaveCount(5);
  await expect(
    page.getByText("Browser storage is unavailable.", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Expression", { exact: true }).fill("0 0 * * *");
  await page.getByLabel("Expression", { exact: true }).press("Enter");
  await expect(page.locator(".recent-chips button").first()).toHaveText(
    "0 0 * * *",
  );
});
test("worker startup failure is recoverable, with valid YAML still available", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    let first = true;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        if (first) {
          first = false;
          throw new Error("test startup failure");
        }
        super(url, options);
      }
    };
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Retry preview" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "GitHub Actions", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Copy snippet" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Retry preview" }).click();
  await expect(page.locator(".next-runs li")).toHaveCount(5);
});
test("worker watchdog terminates a hung request and retry succeeds", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    let first = true;
    window.Worker = class extends NativeWorker {
      hung = false;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.hung = first;
        first = false;
      }
      postMessage(message: unknown) {
        if (!this.hung) super.postMessage(message);
      }
    };
  });
  await page.goto("/");
  await expect(
    page.getByText("Preview took too long.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry preview" }).click();
  await expect(page.locator(".next-runs li")).toHaveCount(5);
});
test("new-context timezone affects the preview, exports, and dates", async ({
  browser,
}) => {
  const context = await browser.newContext({ timezoneId: "Asia/Riyadh" });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date("2026-09-07T05:59:00Z"));
  await page.goto("http://127.0.0.1:4173/#0_9_*_*_1-5");
  await expect(page.locator(".next-runs time").first()).toHaveText(
    "2026-09-07 09:00:00 +03:00",
  );
  await page.getByRole("tab", { name: "GitHub Actions", exact: true }).click();
  await expect(page.locator("pre")).toContainText("timezone: 'Asia/Riyadh'");
  await page.getByRole("radio", { name: "UTC", exact: true }).check();
  await expect(page.locator(".next-runs time").first()).toHaveText(
    "2026-09-07 09:00:00 +00:00",
  );
  await expect(page.locator("pre")).toContainText("timezone: 'UTC'");
  await context.close();
});
test("all field modes, tab keys, and reduced motion remain usable at enlarged text", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const raw = page.getByLabel("Expression", { exact: true });
  await page.getByRole("tab", { name: "Minute", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("tab", { name: "Day of week", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Home");
  await expect(
    page.getByRole("tab", { name: "Minute", exact: true }),
  ).toBeFocused();
  for (const field of [
    "Minute",
    "Hour",
    "Day of month",
    "Month",
    "Day of week",
  ]) {
    await page.getByRole("tab", { name: field, exact: true }).click();
    await page
      .getByRole("radio", { name: `Every ${field.toLowerCase()}`, exact: true })
      .check();
    await expect(raw).toHaveAttribute("aria-invalid", "false");
    await page
      .getByRole("radio", { name: "Specific values", exact: true })
      .check();
    await expect(raw).toHaveAttribute("aria-invalid", "false");
    if (field !== "Month") {
      await page.getByRole("radio", { name: "At an interval" }).check();
      await expect(raw).toHaveAttribute("aria-invalid", "false");
    }
  }
  await page.setViewportSize({ width: 640, height: 450 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("an incomplete interval survives unrelated field edits and remains repairable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("spinbutton", { name: "Interval in minutes" }).fill("");
  await page.getByRole("tab", { name: "Hour", exact: true }).click();
  await page.getByRole("radio", { name: "Every hour", exact: true }).check();
  await expect(page.getByRole("button", { name: "Share URL" })).toBeDisabled();
  await page.getByRole("tab", { name: "Minute", exact: true }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Interval in minutes" }),
  ).toHaveValue("");
  await page.getByRole("spinbutton", { name: "Interval in minutes" }).fill("5");
  await expect(page.getByLabel("Expression", { exact: true })).toHaveValue(
    "*/5 * * * 1-5",
  );
  await expect(page.locator(".next-runs li")).toHaveCount(5);
});
