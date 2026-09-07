import { describe, expect, it } from "vitest";
import { parseField, requireModel, validate } from "./grammar";
import { decodeHash, encodeHash } from "../../infrastructure/hashState";
import { PRESETS } from "./presets";
describe("bounded five-field dialect", () => {
  it.each([
    "80 * * * *",
    "* * * 13 *",
    "*/0 * * * *",
    "1,,2 * * * *",
    "10-2 * * * *",
    "1/2/3 * * * *",
    "@daily",
    "* * * *",
    "* * * * * *",
    "0 0 * JAN MON",
    "0 0 * * 7",
    "0 0 L * *",
    "0 0 ? * *",
    "0 0 1W * *",
    "0 0 * * 1#2",
    "H * * * *",
    "0 0 * * * command",
    "0 0 * * *\n",
    "0 0 * * １",
    "0.5 * * * *",
    "-1 * * * *",
    "0 0 31 2 *",
  ])("rejects %s", (raw) => expect(validate(raw).model).toBeNull());
  it("identifies affected fields and source spans", () => {
    expect(
      validate("80 * * 13 *").issues.map((i) => [i.field, i.start, i.end]),
    ).toEqual([
      ["minute", 0, 2],
      ["month", 7, 9],
    ]);
  });
  it("preserves authored spelling and expands set unions", () => {
    expect(requireModel("  05,01,05\t09-17 * * 1-5 ").expression).toBe(
      "05,01,05 09-17 * * 1-5",
    );
    expect(parseField("5,1,5,1-3", 0).values).toEqual([1, 2, 3, 5]);
    expect(parseField("20/15", 0).values).toEqual([20, 35, 50]);
    expect(parseField("*/100", 0).values).toEqual([0]);
    expect(parseField("2-2", 0).values).toEqual([2]);
  });
  it("keeps restricted day flags and bounds weekday steps", () => {
    expect(requireModel("0 0 * * 1/2").safeExpression).toBe("0 0 * * 1-6/2");
    expect(requireModel("0 0 */2 * 1").safeExpression).toBe("0 0 1-31/2 * 1");
    expect(requireModel("0 0 1-31 * 1").dayOr).toBe(true);
    expect(requireModel("0 0 * * 1").dayOr).toBe(false);
  });
  it("bounds raw input, tokens, and integers", () => {
    expect(validate("1".repeat(513)).issues[0].code).toBe("length");
    expect(validate(`${"0".repeat(129)} * * * *`).model).toBeNull();
    expect(validate("*/9007199254740992 * * * *").model).toBeNull();
  });
  it.each(PRESETS)("round trips %s: %s", (_category, _name, expression) => {
    expect(decodeHash(encodeHash(expression))).toBe(expression);
  });
  it("restores raw and encoded BRD links without storage", () => {
    expect(decodeHash("#0_2_*_*_1-5")).toBe("0 2 * * 1-5");
    expect(decodeHash("#*%2F15_09-17_*_*_1-5")).toBe("*/15 09-17 * * 1-5");
  });
  it.each([
    "#%_0_*_*_*",
    "#0_0_*_*",
    "#" + "*".repeat(2049),
    "#0%200_0_*_*_*",
    "#%252A_0_*_*_*",
  ])("rejects malformed hash %s", (hash) =>
    expect(() => decodeHash(hash)).toThrow(),
  );
});
