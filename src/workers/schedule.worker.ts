import {
  calculateSchedule,
  type ScheduleRequest,
} from "../domain/time/schedule";
self.onmessage = (event: MessageEvent<ScheduleRequest>) => {
  try {
    self.postMessage({ ...event.data, result: calculateSchedule(event.data) });
  } catch (error) {
    self.postMessage({
      ...event.data,
      error:
        error instanceof Error
          ? error.message
          : "Could not calculate this schedule. Retry the preview.",
    });
  }
};
