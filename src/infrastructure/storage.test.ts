import { expect, it } from "vitest";
import { parseHistory, parsePreferences, remember } from "./storage";
it("keeps ten valid deduplicated authored expressions", () => {
  let history = parseHistory(null);
  for (let i = 0; i < 11; i++) history = remember(history, `${i} * * * *`, i);
  expect(history).toHaveLength(10);
  expect(history[0].expression).toBe("10 * * * *");
  history = remember(history, "5 * * * *", 20);
  expect(history).toHaveLength(10);
  expect(history[0].expression).toBe("5 * * * *");
  expect(remember(history, "80 * * * *", 21)).toEqual(history);
});
it("rejects corrupted, oversized, and wrong-shaped storage", () => {
  for (const input of [
    "{",
    "null",
    "{}",
    "[]".repeat(10000),
    '[{"expression":"80 * * * *","usedAt":1}]',
  ])
    expect(parseHistory(input)).toEqual([]);
  expect(
    parsePreferences('{"theme":"invalid","timezone":"Europe/Paris"}'),
  ).toEqual({ theme: "dark", timezone: "local" });
});
