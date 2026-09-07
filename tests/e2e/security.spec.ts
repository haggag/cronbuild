import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
test("the shipped CSP supports editing, workers, and static documents", async ({
  page,
}) => {
  const rules = readFileSync("public/_headers", "utf8");
  const policy = rules.match(/Content-Security-Policy: (.+)/)![1];
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") violations.push(message.text());
  });
  await page.route("http://127.0.0.1:4173/**", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        "content-security-policy": policy,
        "x-content-type-options": "nosniff",
      },
    });
  });
  await page.goto("/");
  await expect(page.locator(".next-runs li")).toHaveCount(5);
  await page.getByLabel("Expression", { exact: true }).fill("*/5 * * * *");
  await expect(
    page.getByText("2,016 runs this week", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(violations).toEqual([]);
});
