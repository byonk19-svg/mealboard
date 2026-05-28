import { describe, expect, it } from "vitest";
import {
  formatDateKey,
  getWeekDates,
  getWeekStartDate
} from "./week-dates";

describe("week date helpers", () => {
  it("resolves the Sunday week start for any date in the week", () => {
    expect(getWeekStartDate("2026-05-27")).toBe("2026-05-24");
    expect(getWeekStartDate("2026-05-24")).toBe("2026-05-24");
  });

  it("returns seven dates from Sunday through Saturday", () => {
    expect(getWeekDates("2026-05-24").map((date) => date.dateKey)).toEqual([
      "2026-05-24",
      "2026-05-25",
      "2026-05-26",
      "2026-05-27",
      "2026-05-28",
      "2026-05-29",
      "2026-05-30"
    ]);
  });

  it("formats dates as stable local date keys", () => {
    expect(formatDateKey(new Date(Date.UTC(2026, 4, 28, 12)))).toBe(
      "2026-05-28"
    );
  });
});
