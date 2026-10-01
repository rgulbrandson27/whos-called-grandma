// Pure month-grid math, no UI. Same logic powers both the main 5-week
// calendar and the add page's 2-week picker -- they just call this with
// different date ranges.

export type MonthGrid = {
  firstWeekday: number; // 0-6, 0 = Sunday
  daysInMonth: number;
};

export function getMonthGrid(year: number, monthIndex: number): MonthGrid {
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  return { firstWeekday, daysInMonth };
}

export function isToday(
  year: number,
  monthIndex: number,
  day: number,
): boolean {
  const today = new Date();
  return (
    today.getFullYear() === year &&
    today.getMonth() === monthIndex &&
    today.getDate() === day
  );
}

export function formatDateKey(
  year: number,
  monthIndex: number,
  day: number,
): string {
  const mm = String(monthIndex + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export const MONTH_SHORT = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

export const WEEKDAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

export type CalendarCell = {
  day: number | null;
  dateKey: string | null;
  isToday: boolean;
};

export function buildMonthCells(
  year: number,
  monthIndex: number,
  weekStart: "sunday" | "monday" = "sunday",
): CalendarCell[] {
  const { firstWeekday, daysInMonth } = getMonthGrid(year, monthIndex);
  const cells: CalendarCell[] = [];

  const leadingDays = (firstWeekday + (weekStart === "monday" ? 6 : 0)) % 7;
  for (let i = 0; i < leadingDays; i++) {
    cells.push({ day: null, dateKey: null, isToday: false });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      day,
      dateKey: formatDateKey(year, monthIndex, day),
      isToday: isToday(year, monthIndex, day),
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ day: null, dateKey: null, isToday: false });
  }

  return cells;
}

export function chunkIntoWeeks(cells: CalendarCell[]): CalendarCell[][] {
  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export function buildTwoWeekWindow(
  startDate: Date = new Date(),
): CalendarCell[] {
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const year = d.getFullYear();
    const monthIndex = d.getMonth();
    const day = d.getDate();
    cells.push({
      day,
      dateKey: formatDateKey(year, monthIndex, day),
      isToday: isToday(year, monthIndex, day),
    });
  }
  return cells;
}
