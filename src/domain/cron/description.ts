import cronstrue from "cronstrue";
import { FIELDS, type CronModel } from "./grammar";
export function describe(model: CronModel): string {
  try {
    const descriptionExpression = model.safeExpression
      .split(" ")
      .map((token, index) =>
        token
          .split(",")
          .some(
            (item) =>
              Number(item.split("/")[1]) >
              FIELDS[index].max - FIELDS[index].min + 1,
          )
          ? model.fields[index].values.join(",")
          : token,
      )
      .join(" ");
    if (model.dayOr) {
      const fields = descriptionExpression.split(" ");
      const time = cronstrue.toString(
        [fields[0], fields[1], "*", fields[3], "*"].join(" "),
        {
          use24HourTimeFormat: true,
          dayOfWeekStartIndexZero: true,
          monthStartIndexZero: false,
          throwExceptionOnParseError: true,
        },
      );
      const weekdays = model.fields[4].values.map(
        (day) =>
          [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ][day],
      );
      return `${time}; on dates ${model.fields[2].values.join(", ")} OR ${weekdays.join(", ")}. Both day fields are restricted.`;
    }
    return cronstrue.toString(descriptionExpression, {
      use24HourTimeFormat: true,
      dayOfWeekStartIndexZero: true,
      monthStartIndexZero: false,
      throwExceptionOnParseError: true,
    });
  } catch {
    return `Valid schedule: ${model.safeExpression}. See the dated preview for matching runs.`;
  }
}
