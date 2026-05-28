export type WeekDate = {
  date: Date;
  dateKey: string;
  dayLabel: string;
};

const dayLabels = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

export function getWeekStartDate(input: string | Date) {
  const date = parseDate(input);
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  return formatDateKey(start);
}

export function getWeekDates(weekStartDate: string): WeekDate[] {
  const start = parseDate(weekStartDate);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
    );
    date.setUTCDate(start.getUTCDate() + index);

    return {
      date,
      dateKey: formatDateKey(date),
      dayLabel: dayLabels[index] ?? ""
    };
  });
}

export function formatDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDate(input: string | Date) {
  if (input instanceof Date) {
    return input;
  }

  const [year, month, day] = input.split("-").map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(Date.UTC(year, month - 1, day));
}
