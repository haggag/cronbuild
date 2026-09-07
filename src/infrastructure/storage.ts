import { validate } from "../domain/cron/grammar";
export const HISTORY_KEY = "cronbuild:history:v1";
export const PREFERENCES_KEY = "cronbuild:preferences:v1";
export interface HistoryEntry {
  expression: string;
  usedAt: number;
}
export interface Preferences {
  theme: "dark" | "light";
  timezone: "local" | "utc";
}
export function parseHistory(raw: string | null): HistoryEntry[] {
  if (!raw || raw.length > 16000) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const seen = new Set<string>();
    return data
      .slice(0, 100)
      .filter((item): item is HistoryEntry => {
        if (
          !item ||
          typeof item !== "object" ||
          typeof item.expression !== "string" ||
          typeof item.usedAt !== "number" ||
          !Number.isFinite(item.usedAt)
        )
          return false;
        const model = validate(item.expression).model;
        if (!model || seen.has(model.expression)) return false;
        item.expression = model.expression;
        seen.add(model.expression);
        return true;
      })
      .sort((a, b) => b.usedAt - a.usedAt)
      .slice(0, 10);
  } catch {
    return [];
  }
}
export function parsePreferences(raw: string | null): Preferences {
  const defaults: Preferences = { theme: "dark", timezone: "local" };
  if (!raw || raw.length > 1024) return defaults;
  try {
    const value = JSON.parse(raw);
    return {
      theme: value?.theme === "light" ? "light" : "dark",
      timezone: value?.timezone === "utc" ? "utc" : "local",
    };
  } catch {
    return defaults;
  }
}
export function remember(
  history: HistoryEntry[],
  expression: string,
  usedAt: number,
): HistoryEntry[] {
  const model = validate(expression).model;
  if (!model) return history;
  return [
    { expression: model.expression, usedAt },
    ...history.filter((entry) => entry.expression !== model.expression),
  ].slice(0, 10);
}
