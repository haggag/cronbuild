import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { chromium } from "@playwright/test";
const port = 4175;
const url = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort",
  ],
  { stdio: "ignore" },
);
let chrome;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null)
      throw new Error("Production preview server exited.");
    try {
      ready = (await fetch(url)).ok;
    } catch {
      /* Wait for the local server. */
    }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error("Production preview server did not start.");
  chrome = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ["--headless", "--disable-dev-shm-usage"],
  });
  await mkdir("test-results/lighthouse", { recursive: true });
  const summaries = [];
  for (let i = 1; i <= 3; i++) {
    const { lhr } = await lighthouse(url, {
      port: chrome.port,
      output: "json",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      logLevel: "error",
    });
    await writeFile(
      `test-results/lighthouse/run-${i}.json`,
      JSON.stringify(lhr, null, 2),
    );
    const summary = {
      run: i,
      performance: lhr.categories.performance.score * 100,
      accessibility: lhr.categories.accessibility.score * 100,
      lcp: lhr.audits["largest-contentful-paint"].numericValue,
      cls: lhr.audits["cumulative-layout-shift"].numericValue,
      settings: lhr.configSettings.throttling,
      environment: lhr.environment,
    };
    summaries.push(summary);
    console.log(JSON.stringify(summary));
  }
  const median = (key) =>
    summaries.map((result) => result[key]).sort((a, b) => a - b)[1];
  const results = {
    runs: summaries,
    median: {
      performance: median("performance"),
      accessibility: median("accessibility"),
      lcp: median("lcp"),
      cls: median("cls"),
    },
  };
  await writeFile(
    "test-results/lighthouse/summary.json",
    JSON.stringify(results, null, 2),
  );
  if (
    results.median.performance < 90 ||
    results.median.accessibility < 95 ||
    results.median.lcp > 2500 ||
    results.median.cls > 0.1
  )
    process.exitCode = 1;
} finally {
  await chrome?.kill();
  server.kill("SIGTERM");
}
