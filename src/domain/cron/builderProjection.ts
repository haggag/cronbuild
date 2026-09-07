import { FIELDS, type CronField } from "./grammar";
export function projectField(
  field: CronField | null | undefined,
  index: number,
) {
  if (!field)
    return {
      mode: "specific",
      values: [] as number[],
      start: String(FIELDS[index].min),
      step: "1",
    };
  const interval = field.token.match(/^(\*|\d+)(?:-(\d+))?\/(\d+)$/);
  const start =
    interval?.[1] === "*"
      ? FIELDS[index].min
      : Number(interval?.[1] ?? field.values[0]);
  const step = Number(interval?.[3] ?? 1);
  const supported =
    interval &&
    index !== 3 &&
    (!interval[2] || Number(interval[2]) === FIELDS[index].max) &&
    step <= FIELDS[index].max - FIELDS[index].min + 1;
  return {
    mode: field.unrestricted
      ? "every"
      : supported
        ? "interval"
        : /^\d+(,\d+)*$/.test(field.token)
          ? "specific"
          : "custom",
    values: field.values,
    start: String(start),
    step: String(step),
  };
}
export function intervalToken(
  index: number,
  start: string,
  step: string,
): string | null {
  const { min, max } = FIELDS[index];
  if (!/^\d+$/.test(start) || !/^\d+$/.test(step)) return null;
  const x = Number(start),
    n = Number(step);
  if (x < min || x > max || n < 1 || n > max - min + 1) return null;
  if (index === 4) return `${x}-${max}/${n}`;
  return x === min ? `*/${n}` : `${x}/${n}`;
}

/** Keep authored-style lists when possible, compress long GUI selections without using a wildcard. */
export function serializeSelection(values: number[]): string {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  const list = sorted.join(",");
  if (list.length <= 128) return list;
  const ranges: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const first = sorted[i];
    while (i + 1 < sorted.length && sorted[i + 1] === sorted[i] + 1) i++;
    ranges.push(first === sorted[i] ? String(first) : `${first}-${sorted[i]}`);
  }
  return ranges.join(",");
}
