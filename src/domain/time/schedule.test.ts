import { describe, expect, it } from "vitest";
import { calculateSchedule } from "./schedule";
import { requireModel } from "../cron/grammar";
import { occurrenceStream } from "../cron/parserAdapter";
const next = (
  expression: string,
  reference: string,
  count = 5,
  zone = "UTC",
) => {
  const stream = occurrenceStream(
    requireModel(expression),
    zone,
    Date.parse(reference),
    Date.parse("2140-01-01T00:00:00Z"),
  );
  return Array.from({ length: count }, () => new Date(stream()!).toISOString());
};
const week = (
  expression: string,
  reference = "2026-09-07T08:59:00Z",
  zone = "UTC",
) =>
  calculateSchedule({
    expression,
    reference: Date.parse(reference),
    zone,
    revision: 1,
  });
describe("independent schedule fixtures", () => {
  it("forecasts business hours and enumerates the entire week", () => {
    const result = week("*/15 9-17 * * 1-5");
    expect(result.runs.map((t) => new Date(t).toISOString())).toEqual([
      "2026-09-07T09:00:00.000Z",
      "2026-09-07T09:15:00.000Z",
      "2026-09-07T09:30:00.000Z",
      "2026-09-07T09:45:00.000Z",
      "2026-09-07T10:00:00.000Z",
    ]);
    expect(result.total).toBe(180);
    expect(result.counts.flat().filter(Boolean)).toEqual(Array(45).fill(4));
  });
  it("counts all 10080 minutes", () => {
    const result = week("* * * * *");
    expect(result.total).toBe(10080);
    expect(result.counts.flat()).toEqual(Array(168).fill(60));
  });
  it("restarts numeric-base steps each hour", () =>
    expect(next("20/15 * * * *", "2026-09-07T00:00:00Z")).toEqual([
      "2026-09-07T00:20:00.000Z",
      "2026-09-07T00:35:00.000Z",
      "2026-09-07T00:50:00.000Z",
      "2026-09-07T01:20:00.000Z",
      "2026-09-07T01:35:00.000Z",
    ]));
  it("restricts DOW steps to Monday Wednesday Friday", () =>
    expect(next("0 0 * * 1/2", "2026-09-06T00:00:00Z", 4)).toEqual([
      "2026-09-07T00:00:00.000Z",
      "2026-09-09T00:00:00.000Z",
      "2026-09-11T00:00:00.000Z",
      "2026-09-14T00:00:00.000Z",
    ]));
  it("merges DOM OR DOW without duplicates", () =>
    expect(next("0 0 1 * 1", "2026-08-31T00:00:00Z")).toEqual([
      "2026-09-01T00:00:00.000Z",
      "2026-09-07T00:00:00.000Z",
      "2026-09-14T00:00:00.000Z",
      "2026-09-21T00:00:00.000Z",
      "2026-09-28T00:00:00.000Z",
    ]));
  it("allows weekdays when DOM is impossible", () =>
    expect(next("0 0 31 2 1", "2026-02-01T00:00:00Z", 4)).toEqual([
      "2026-02-02T00:00:00.000Z",
      "2026-02-09T00:00:00.000Z",
      "2026-02-16T00:00:00.000Z",
      "2026-02-23T00:00:00.000Z",
    ]));
  it("distinguishes literal wildcard, full range, and wildcard steps", () => {
    expect(next("0 0 * * 1", "2026-09-07T00:00:00Z", 1)[0]).toBe(
      "2026-09-14T00:00:00.000Z",
    );
    expect(next("0 0 1-31 * 1", "2026-09-07T00:00:00Z", 1)[0]).toBe(
      "2026-09-08T00:00:00.000Z",
    );
    expect(next("0 0 */2 * 1", "2026-09-07T00:00:00Z", 1)[0]).toBe(
      "2026-09-09T00:00:00.000Z",
    );
  });
  it("skips short months and non-leap century years", () => {
    expect(next("0 0 31 * *", "2026-01-31T00:00:00Z", 2)).toEqual([
      "2026-03-31T00:00:00.000Z",
      "2026-05-31T00:00:00.000Z",
    ]);
    expect(next("0 0 29 2 *", "2096-03-01T00:00:00Z")).toEqual([
      "2104-02-29T00:00:00.000Z",
      "2108-02-29T00:00:00.000Z",
      "2112-02-29T00:00:00.000Z",
      "2116-02-29T00:00:00.000Z",
      "2120-02-29T00:00:00.000Z",
    ]);
  });
  it("allows an empty week and excludes exactly now", () => {
    expect(week("0 0 1 1 *").total).toBe(0);
    expect(next("0 0 * * *", "2026-09-07T00:00:00Z", 1)[0]).toBe(
      "2026-09-08T00:00:00.000Z",
    );
  });
  it("interprets local schedules, including fractional-hour zones", () => {
    expect(
      next("0 9 * * 1-5", "2026-09-07T05:59:00Z", 1, "Asia/Riyadh")[0],
    ).toBe("2026-09-07T06:00:00.000Z");
    expect(
      next("0 9 * * *", "2026-09-07T00:00:00Z", 1, "Asia/Kathmandu")[0],
    ).toBe("2026-09-07T03:15:00.000Z");
  });
  it("uses calendar weeks across the year boundary", () => {
    const result = week("0 0 * * *", "2027-01-01T00:00:00Z");
    expect(result.dates).toEqual([
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
    ]);
    expect(result.total).toBe(7);
  });
});
describe("pinned cron-parser 5.10 DST behavior", () => {
  it("moves a nonexistent 02:30 run to 03:30 during spring-forward", () => {
    expect(
      next("30 2 * * *", "2026-03-07T00:00:00Z", 4, "America/New_York"),
    ).toEqual([
      "2026-03-07T07:30:00.000Z",
      "2026-03-08T07:30:00.000Z",
      "2026-03-09T06:30:00.000Z",
      "2026-03-10T06:30:00.000Z",
    ]);
    const result = week(
      "30 2 * * *",
      "2026-03-08T12:00:00Z",
      "America/New_York",
    );
    expect(result.counts[6][2]).toBe(0);
    expect(result.counts[6][3]).toBe(1);
    expect(result.hourDurations[6][2]).toBe(0);
  });
  it("runs fixed 01:30 only once in the fall-back repeated hour", () => {
    expect(
      next("30 1 * * *", "2026-10-31T00:00:00Z", 4, "America/New_York"),
    ).toEqual([
      "2026-10-31T05:30:00.000Z",
      "2026-11-01T05:30:00.000Z",
      "2026-11-02T06:30:00.000Z",
      "2026-11-03T06:30:00.000Z",
    ]);
    const result = week(
      "30 1 * * *",
      "2026-11-01T12:00:00Z",
      "America/New_York",
    );
    expect(result.counts[6][1]).toBe(1);
    expect(result.hourDurations[6][1]).toBe(2);
  });
  it("counts actual hourly instants in 167- and 169-hour weeks", () => {
    const spring = week(
      "0 * * * *",
      "2026-03-08T12:00:00Z",
      "America/New_York",
    );
    const fall = week("0 * * * *", "2026-11-01T12:00:00Z", "America/New_York");
    expect(spring.total).toBe(167);
    expect(fall.total).toBe(169);
    expect(fall.counts[6][1]).toBe(2);
  });
});
