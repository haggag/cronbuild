import { MAX_HASH_LENGTH, requireModel } from "../domain/cron/grammar";
export function encodeHash(expression: string): string {
  return (
    "#" +
    requireModel(expression)
      .fields.map((field) => encodeURIComponent(field.token))
      .join("_")
  );
}
export function decodeHash(hash: string): string {
  if (hash.length > MAX_HASH_LENGTH)
    throw new Error("This link is too long. Use a five-field expression.");
  const parts = hash.replace(/^#/, "").split("_");
  if (parts.length !== 5)
    throw new Error("The link needs five underscore-separated cron fields.");
  let decoded: string[];
  try {
    decoded = parts.map((part) => decodeURIComponent(part));
  } catch {
    throw new Error("The link contains invalid percent encoding.");
  }
  if (decoded.some((part) => /\s/.test(part)))
    throw new Error("Each link segment must contain one cron field.");
  return requireModel(decoded.join(" ")).expression;
}
