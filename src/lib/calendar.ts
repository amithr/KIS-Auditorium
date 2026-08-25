import type { DayKind, Dow, ScheduleEntry } from "./types";
import { periodInRange } from "./periods";

export const YEAR = {
  start: "2026-08-20",
  end: "2027-06-18",
} as const;

export const TERMS = [
  { n: 1, start: "2026-08-20", end: "2026-12-11" },
  { n: 2, start: "2027-01-04", end: "2027-03-26" },
  { n: 3, start: "2027-03-29", end: "2027-06-18" },
] as const;

export const DOWS: Dow[] = ["MON", "TUE", "WED", "THU", "FRI"];

const MONTHS_SHORT = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
] as const;

const DOW_FULL = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

/** Parse YYYY-MM-DD as a local calendar date (no timezone shift). */
export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Monday of the week containing `d`. */
export function mondayOf(d: Date): Date {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}

export function todayLocal(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function buildHolidays(): Record<string, string> {
  const h: Record<string, string> = {};
  const range = (a: string, b: string, name: string) => {
    let d = parseIso(a);
    const e = parseIso(b);
    while (d <= e) {
      h[toIso(d)] = name;
      d = addDays(d, 1);
    }
  };
  h["2026-08-24"] = "Independence Day";
  h["2026-10-01"] = "Defender Day";
  range("2026-10-19", "2026-10-23", "Fall break");
  h["2026-11-06"] = "P-T Conferences";
  range("2026-11-19", "2026-11-20", "PD days");
  range("2026-12-14", "2027-01-01", "Winter break");
  h["2027-01-29"] = "Advocacy Conf.";
  range("2027-02-22", "2027-02-26", "February break");
  h["2027-03-08"] = "Women's Day";
  range("2027-04-19", "2027-04-23", "Spring break");
  h["2027-05-03"] = "Labor Day";
  h["2027-05-10"] = "Remembrance Day";
  h["2027-05-21"] = "Student-Led Conf.";
  return h;
}

let _holidays: Record<string, string> | null = null;
export function holidays(): Record<string, string> {
  return (_holidays ??= buildHolidays());
}

export function holidayName(iso: string): string | undefined {
  return holidays()[iso];
}

export function isSchoolDay(d: Date): boolean {
  const iso = toIso(d);
  if (iso < YEAR.start || iso > YEAR.end) return false;
  if (d.getDay() === 0 || d.getDay() === 6) return false;
  if (holidays()[iso]) return false;
  return true;
}

let _redBlack: Record<string, "RED" | "BLACK"> | null = null;
/** Red/black alternates over school days only, starting RED on Aug 20. */
export function redBlackMap(): Record<string, "RED" | "BLACK"> {
  if (_redBlack) return _redBlack;
  const map: Record<string, "RED" | "BLACK"> = {};
  let red = true;
  let d = parseIso(YEAR.start);
  const end = parseIso(YEAR.end);
  while (d <= end) {
    if (isSchoolDay(d)) {
      map[toIso(d)] = red ? "RED" : "BLACK";
      red = !red;
    }
    d = addDays(d, 1);
  }
  return (_redBlack = map);
}

export function dayKind(iso: string): DayKind {
  const rb = redBlackMap()[iso];
  if (rb) return rb;
  return "NO_SCHOOL";
}

export function dowOf(d: Date): Dow {
  return DOWS[(d.getDay() + 6) % 7];
}

export function formatShortDate(d: Date): string {
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export function formatDayHeading(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatAdminDate(d: Date): {
  dow: string;
  dd: string;
  mon: string;
} {
  return {
    dow: DOW_FULL[d.getDay()],
    dd: String(d.getDate()).padStart(2, "0"),
    mon: MONTHS_SHORT[d.getMonth()],
  };
}

export function formatOnceLabel(iso: string): string {
  const d = parseIso(iso);
  return `${DOW_FULL[d.getDay()]} ${String(d.getDate()).padStart(2, "0")} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function termForWeek(weekStart: Date, weekEnd: Date): string {
  const startIso = toIso(weekStart);
  const endIso = toIso(weekEnd);
  const term = TERMS.find((t) => endIso >= t.start && startIso <= t.end);
  return term ? `Term ${term.n} · 2026–27` : "Break · 2026–27";
}

export function termForDay(iso: string): string {
  const term = TERMS.find((t) => iso >= t.start && iso <= t.end);
  return term ? `TERM ${term.n}` : "BREAK";
}

/**
 * Monday of the first week that contains a bookable school day ≥ today
 * (clamped into the school year).
 */
export function startMonday(today = todayLocal()): Date {
  const yearStart = parseIso(YEAR.start);
  let m = mondayOf(new Date(Math.max(today.getTime(), yearStart.getTime())));
  for (let g = 0; g < 60; g++) {
    for (let o = 0; o < 5; o++) {
      const d = addDays(m, o);
      if (d >= today && isSchoolDay(d)) return m;
    }
    m = addDays(m, 7);
  }
  return m;
}

export function yearMondayBounds(): { first: Date; last: Date; maxOffset: number } {
  const first = mondayOf(parseIso(YEAR.start));
  const last = mondayOf(parseIso(YEAR.end));
  const maxOffset = Math.round((last.getTime() - first.getTime()) / 6048e5);
  return { first, last, maxOffset };
}

/** Week offset relative to startMonday(), clamped to the school year. */
export function clampWeekOffset(offset: number, today = todayLocal()): number {
  const week0 = startMonday(today);
  const { first, maxOffset } = yearMondayBounds();
  const curWeeks = Math.round((week0.getTime() - first.getTime()) / 6048e5);
  const absolute = curWeeks + offset;
  if (absolute < 0) return -curWeeks;
  if (absolute > maxOffset) return maxOffset - curWeeks;
  return offset;
}

export function weekDates(weekOffset: number, today = todayLocal()): Date[] {
  const week0 = startMonday(today);
  const wkStart = addDays(week0, weekOffset * 7);
  return [0, 1, 2, 3, 4].map((o) => addDays(wkStart, o));
}

export function canGoPrev(weekOffset: number, today = todayLocal()): boolean {
  return clampWeekOffset(weekOffset - 1, today) < weekOffset;
}

export function canGoNext(weekOffset: number, today = todayLocal()): boolean {
  return clampWeekOffset(weekOffset + 1, today) > weekOffset;
}

/** Advance/rewind by one school day (skip weekends & out-of-year). */
export function adjacentSchoolDay(iso: string, dir: 1 | -1): string {
  let d = addDays(parseIso(iso), dir);
  const start = parseIso(YEAR.start);
  const end = parseIso(YEAR.end);
  for (let i = 0; i < 30; i++) {
    if (d < start) return YEAR.start;
    if (d > end) return YEAR.end;
    if (d.getDay() !== 0 && d.getDay() !== 6) return toIso(d);
    d = addDays(d, dir);
  }
  return iso;
}

export function findEntry(
  entries: ScheduleEntry[],
  date: Date,
  periodId: string,
): ScheduleEntry | undefined {
  const iso = toIso(date);
  const dow = dowOf(date);
  return entries.find((e) => {
    if (!periodInRange(periodId as never, e.from_period, e.to_period)) {
      return false;
    }
    if (e.repeat === "once") return e.date === iso;
    return e.dow === dow && (!e.until || iso <= e.until);
  });
}

export function entryAppliesToDate(e: ScheduleEntry, iso: string): boolean {
  if (e.repeat === "once") return e.date === iso;
  const d = parseIso(iso);
  return dowOf(d) === e.dow && (!e.until || iso <= e.until);
}
