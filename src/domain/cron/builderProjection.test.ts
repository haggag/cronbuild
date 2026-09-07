import { expect, it } from "vitest";
import { parseField } from "./grammar";
import { serializeSelection } from "./builderProjection";
it("serializes all minute selections within the token limit without a wildcard", () => {
  const all = Array.from({ length: 60 }, (_, i) => i);
  expect(serializeSelection(all)).toBe("0-59");
  for (const values of [
    all,
    all.filter((n) => n !== 32),
    all.filter((n) => n % 2),
    all.filter((n) => n % 3),
  ]) {
    const token = serializeSelection(values);
    expect(token.length).toBeLessThanOrEqual(128);
    expect(parseField(token, 0).values).toEqual(values);
  }
});
