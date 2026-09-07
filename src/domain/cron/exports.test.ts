import { expect, it } from "vitest";
import { parse } from "yaml";
import { requireModel } from "./grammar";
import { EXPORT_TABS, actionsWarning, buildExport } from "./exports";
const model = requireModel("*/15 9-17 * * 1/2");
it("exports safe cron and explicit target timezones", () => {
  for (const tab of EXPORT_TABS)
    expect(buildExport(tab, model, "Asia/Riyadh", null)).toContain(
      "*/15 9-17 * * 1-6/2",
    );
  const github = parse(
    buildExport("GitHub Actions", model, "Asia/Riyadh", null),
    { version: "1.2" },
  );
  expect(github.on.schedule[0]).toEqual({
    cron: model.safeExpression,
    timezone: "Asia/Riyadh",
  });
  const kube = parse(buildExport("Kubernetes", model, "UTC", null));
  expect(kube.spec.timeZone).toBe("UTC");
  expect(kube.spec.jobTemplate.spec.template.spec.restartPolicy).toBe(
    "OnFailure",
  );
  expect(
    kube.spec.jobTemplate.spec.template.spec.containers[0].command,
  ).toHaveLength(3);
  expect(buildExport("AI Prompt", model, "UTC", null)).toContain(
    "Next run: unavailable",
  );
});
it("warns about sub-five-minute gaps including adjacent hours", () => {
  expect(actionsWarning(requireModel("1,59 9,10 * * *"))).toContain(
    "less than five",
  );
  expect(actionsWarning(requireModel("1,3 9 * * *"))).toContain(
    "less than five",
  );
});
it.each([
  "1,59 0,23 * * *",
  "1,59 0,23 31,1 1,2 *",
  "1,59 0,23 31,1 12,1 *",
  "1,59 0,23 28,29 2 *",
  "1,59 0,23 31 2 1,2",
])("warns about a sub-five-minute midnight gap for %s", (expression) => {
  expect(actionsWarning(requireModel(expression))).toContain("less than five");
});
it.each(["1,59 0,23 31 * *", "1,59 0,23 * * 1", "1,59 0,23 31 2 1"])(
  "does not invent consecutive dates for %s",
  (expression) => {
    expect(actionsWarning(requireModel(expression))).not.toContain(
      "less than five",
    );
  },
);
