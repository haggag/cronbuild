import { CronExpressionParser } from "cron-parser";
import { feasibleDomMonths, type CronModel } from "./grammar";

// Compile deduplicated sets. Keep literal wildcards distinct from explicit full sets.
export function executionBranches(model: CronModel): string[] {
  const tokens = model.fields.map((field) =>
    field.unrestricted ? "*" : field.values.join(","),
  );
  const months = feasibleDomMonths(model.fields);
  const domBranch = [...tokens];
  domBranch[3] = months.join(",");
  if (!model.dayOr) return [domBranch.join(" ")];
  domBranch[4] = "*";
  const dowBranch = [...tokens];
  dowBranch[2] = "*";
  return [...(months.length ? [domBranch.join(" ")] : []), dowBranch.join(" ")];
}

export function occurrenceStream(
  model: CronModel,
  zone: string,
  after: number,
  end: number,
): () => number | null {
  const streams = executionBranches(model).map((expression) =>
    CronExpressionParser.parse(expression, {
      tz: zone,
      currentDate: after,
      endDate: end,
      strict: false,
    }),
  );
  const nextOf = (index: number): number | null => {
    try {
      return streams[index].next().toDate().getTime();
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Out of the time span range"
      )
        return null;
      throw error;
    }
  };
  // Lazy advancement avoids searching beyond the final requested occurrence.
  const heads: (number | null | undefined)[] = streams.map(() => undefined);
  let previous = after;
  return () => {
    for (let i = 0; i < streams.length; i++)
      if (heads[i] === undefined) heads[i] = nextOf(i);
    const available = heads.filter(
      (value): value is number => typeof value === "number",
    );
    if (!available.length) return null;
    const next = Math.min(...available);
    if (next <= previous)
      throw new Error("Schedule returned non-increasing timestamps.");
    previous = next;
    for (let i = 0; i < heads.length; i++)
      if (heads[i] === next) heads[i] = undefined;
    return next;
  };
}
