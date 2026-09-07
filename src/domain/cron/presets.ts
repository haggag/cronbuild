export const PRESETS = [
  ["Common", "Every minute", "* * * * *"],
  ["Common", "Every 5 minutes", "*/5 * * * *"],
  ["Common", "Every 15 minutes", "*/15 * * * *"],
  ["Common", "Hourly", "0 * * * *"],
  ["Common", "Daily at midnight", "0 0 * * *"],
  ["Common", "Weekly on Sunday at 3 AM", "0 3 * * 0"],
  ["Business", "Weekdays at 9 AM", "0 9 * * 1-5"],
  ["Business", "Twice daily, noon and midnight", "0 0,12 * * *"],
  ["Business", "First of every month", "0 0 1 * *"],
  ["Business", "Quarterly, Jan/Apr/Jul/Oct 1st", "0 0 1 1,4,7,10 *"],
] as const;
