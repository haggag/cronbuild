export const MAX_RAW_LENGTH = 512;
export const MAX_TOKEN_LENGTH = 128;
export const MAX_HASH_LENGTH = 2048;
export const DEFAULT_EXPRESSION = "*/15 9-17 * * 1-5";
export const FIELDS = [
  { id: "minute", label: "Minute", min: 0, max: 59, unit: "minutes" },
  { id: "hour", label: "Hour", min: 0, max: 23, unit: "hours" },
  { id: "dom", label: "Day of month", min: 1, max: 31, unit: "date values" },
  { id: "month", label: "Month", min: 1, max: 12, unit: "months" },
  { id: "dow", label: "Day of week", min: 0, max: 6, unit: "weekday values" },
] as const;
export type FieldId = (typeof FIELDS)[number]["id"];
export interface Issue {
  code: string;
  field?: FieldId;
  start: number;
  end: number;
  message: string;
  remedy: string;
}
export interface CronField {
  token: string;
  values: number[];
  unrestricted: boolean;
}
export interface CronModel {
  expression: string;
  fields: CronField[];
  safeExpression: string;
  dayOr: boolean;
}
export interface Validation {
  tokens: string[];
  fields: (CronField | null)[];
  issues: Issue[];
  model: CronModel | null;
}

export function parseField(token: string, index: number): CronField {
  const { min, max, label } = FIELDS[index];
  if (!token)
    throw new Error(`Select at least one ${label.toLowerCase()} value.`);
  if (token.length > MAX_TOKEN_LENGTH)
    throw new Error(`Keep ${label} within ${MAX_TOKEN_LENGTH} characters.`);
  const values = new Set<number>();
  for (const item of token.split(",")) {
    if (!item)
      throw new Error("Lists need a value on each side of every comma.");
    if (!/^(?:\*|\d+(?:-\d+)?)(?:\/\d+)?$/.test(item))
      throw new Error(
        "Use numeric values, *, ascending ranges, lists, or a single /step. Names and cron extensions are not supported.",
      );
    const [base, stepText] = item.split("/");
    const step = stepText === undefined ? 1 : Number(stepText);
    if (!Number.isSafeInteger(step) || step <= 0)
      throw new Error("A step must be a positive safe integer (at least 1).");
    const endpoints = base.split("-").map(Number);
    const start = base === "*" ? min : endpoints[0];
    const end =
      base === "*"
        ? max
        : (endpoints[1] ?? (stepText === undefined ? start : max));
    if (
      ![start, end].every(
        (n) => Number.isSafeInteger(n) && n >= min && n <= max,
      )
    )
      throw new Error(
        `${label} values must be ${min}–${max}${index === 4 ? "; Sunday is 0, not 7" : ""}.`,
      );
    if (start > end)
      throw new Error(
        "Ranges must ascend. Use a comma-separated list for a wraparound range.",
      );
    // At most the field span iterations, including extremely large valid steps.
    for (let n = start; n <= end; n += step) values.add(n);
  }
  return {
    token,
    values: [...values].sort((a, b) => a - b),
    unrestricted: token === "*",
  };
}

function safeToken(field: CronField, index: number): string {
  const { min, max } = FIELDS[index];
  return field.token
    .split(",")
    .map((item) => {
      const [base, step] = item.split("/");
      if (step === undefined) return item;
      // Explicit bounds preserve our restricted-day semantics and avoid Sunday=7.
      if ((index === 2 || index === 4) && base === "*")
        return `${min}-${max}/${step}`;
      if (index === 4 && /^\d+$/.test(base)) return `${base}-${max}/${step}`;
      return item;
    })
    .join(",");
}

export function feasibleDomMonths(fields: CronField[]): number[] {
  const days = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return fields[3].values.filter((month) =>
    fields[2].values.some((day) => day <= days[month - 1]),
  );
}

export function validate(raw: string): Validation {
  if (raw.length > MAX_RAW_LENGTH) {
    return {
      tokens: [],
      fields: [],
      model: null,
      issues: [
        {
          code: "length",
          start: 0,
          end: raw.length,
          message: `Expression exceeds ${MAX_RAW_LENGTH} characters.`,
          remedy: "Shorten the expression; input is never truncated.",
        },
      ],
    };
  }
  const matches = [...raw.matchAll(/[^ \t]+/g)];
  const tokens = matches.map((m) => m[0]);
  const issues: Issue[] = [];
  const fields: (CronField | null)[] = [];
  const add = (
    code: string,
    message: string,
    remedy: string,
    index?: number,
  ) => {
    const match = index === undefined ? undefined : matches[index];
    issues.push({
      code,
      message,
      remedy,
      field: index === undefined ? undefined : FIELDS[index].id,
      start: match?.index ?? 0,
      end: match ? match.index + match[0].length : raw.length,
    });
  };
  if (raw.length > MAX_RAW_LENGTH)
    add(
      "length",
      `Expression exceeds ${MAX_RAW_LENGTH} characters.`,
      "Shorten the expression; input is never truncated.",
    );
  if (/[^\x20-\x7e\t]/.test(raw))
    add(
      "characters",
      "Use ASCII cron characters with spaces or tabs between fields.",
      "Remove line breaks, control characters, and non-ASCII punctuation.",
    );
  if (tokens.length !== 5)
    add(
      "field-count",
      `Expected five fields; found ${tokens.length}.`,
      "Use minute hour day-of-month month day-of-week, without a command.",
    );
  if (tokens.length === 5 && raw.length <= MAX_RAW_LENGTH) {
    tokens.forEach((token, i) => {
      try {
        fields.push(parseField(token, i));
      } catch (error) {
        fields.push(null);
        add(
          "field-syntax",
          `${FIELDS[i].label}: ${(error as Error).message}`,
          `Edit ${FIELDS[i].label.toLowerCase()} or choose a preset.`,
          i,
        );
      }
    });
  }
  let model: CronModel | null = null;
  if (!issues.length) {
    const complete = fields as CronField[];
    const dayOr = !complete[2].unrestricted && !complete[4].unrestricted;
    if (!dayOr && !feasibleDomMonths(complete).length)
      add(
        "calendar",
        "These dates do not exist in the selected months.",
        "Choose another date/month, or a restricted weekday that can match independently.",
        2,
      );
    else
      model = {
        expression: tokens.join(" "),
        fields: complete,
        safeExpression: complete.map(safeToken).join(" "),
        dayOr,
      };
  }
  return { tokens, fields, issues, model };
}

export function requireModel(raw: string): CronModel {
  const result = validate(raw);
  if (!result.model)
    throw new Error(result.issues.map((issue) => issue.message).join(" "));
  return result.model;
}
