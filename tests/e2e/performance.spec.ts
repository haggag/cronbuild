import { test, expect } from "@playwright/test";
test("production editing and preview performance budgets", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.locator(".next-runs li")).toHaveCount(5);
  await page.evaluate(() => {
    const metrics = {
      previews: [] as number[],
      longTasks: [] as number[],
      started: 0,
    };
    (window as unknown as { metrics: typeof metrics }).metrics = metrics;
    document.getElementById("raw-cron")!.addEventListener("input", () => {
      metrics.started = performance.now();
    });
    new MutationObserver(() => {
      if (metrics.started && document.querySelector(".next-runs li")) {
        metrics.previews.push(performance.now() - metrics.started);
        metrics.started = 0;
      }
    }).observe(document.querySelector(".preview")!, {
      childList: true,
      subtree: true,
    });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        metrics.longTasks.push(entry.duration);
    }).observe({ type: "longtask", buffered: false });
  });
  for (let i = 0; i < 20; i++) {
    await page
      .getByLabel("Expression", { exact: true })
      .fill(["* * * * *", "*/5 * * * *", "0 9 * * 1-5", "0 0 29 2 *"][i % 4]);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as { metrics: { previews: number[] } }).metrics
              .previews.length,
        ),
      )
      .toBe(i + 1);
  }
  const metrics = await page.evaluate(
    () =>
      (
        window as unknown as {
          metrics: { previews: number[]; longTasks: number[] };
        }
      ).metrics,
  );
  const ordered = [...metrics.previews].sort((a, b) => a - b);
  const p95 = ordered[Math.ceil(ordered.length * 0.95) - 1];
  await testInfo.attach("production-performance.json", {
    body: JSON.stringify({ ...metrics, p95 }, null, 2),
    contentType: "application/json",
  });
  console.log(
    "Production editing metrics:",
    JSON.stringify({
      p95,
      maxLongTask: Math.max(0, ...metrics.longTasks),
      samples: metrics.previews.length,
    }),
  );
  expect(p95).toBeLessThanOrEqual(250);
  expect(Math.max(0, ...metrics.longTasks)).toBeLessThanOrEqual(50);
});
