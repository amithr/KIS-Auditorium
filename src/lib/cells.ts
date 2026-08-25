import type { Booking, CellState, ScheduleEntry } from "@/lib/types";
import {
  findEntry,
  isSchoolDay,
  toIso,
  todayLocal,
} from "@/lib/calendar";
import type { PeriodId } from "@/lib/types";

export function resolveCell(
  date: Date,
  period: PeriodId,
  booking: Booking | undefined,
  entries: ScheduleEntry[],
  selected: boolean,
): CellState {
  const today = todayLocal();
  const noSchool = !isSchoolDay(date);
  const past = date.getTime() < today.getTime();

  if (booking && !noSchool) {
    return booking.status === "pending"
      ? { kind: "pending", booking }
      : { kind: "confirmed", booking };
  }

  if (noSchool) return { kind: "no_school" };
  if (past) return { kind: "past" };

  const entry = findEntry(entries, date, period);
  if (entry && entry.kind === "block") {
    return { kind: "blocked", entry };
  }
  if (entry && entry.kind === "drama") {
    return { kind: "drama", entry };
  }
  if (selected) return { kind: "selected" };
  return { kind: "open" };
}

export function cellIsClickable(state: CellState): boolean {
  return (
    state.kind === "open" ||
    state.kind === "selected" ||
    state.kind === "drama" ||
    state.kind === "pending" ||
    state.kind === "confirmed"
  );
}

export function cellKey(date: Date | string, period: string): string {
  const iso = typeof date === "string" ? date : toIso(date);
  return `${iso}|${period}`;
}
