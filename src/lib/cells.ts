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

  if (noSchool) return { kind: "no_school" };

  if (booking?.status === "confirmed") return { kind: "confirmed", booking };

  const entry = findEntry(entries, date, period);
  if (booking) {
    return entry
      ? { kind: "blocked", entry, booking }
      : { kind: "pending", booking };
  }

  if (past) return { kind: "past" };
  if (entry) return { kind: "blocked", entry };
  if (selected) return { kind: "selected" };
  return { kind: "open" };
}

export function cellIsClickable(state: CellState): boolean {
  return (
    state.kind === "open" ||
    state.kind === "selected" ||
    state.kind === "blocked" ||
    state.kind === "pending" ||
    state.kind === "confirmed"
  );
}

export function cellKey(date: Date | string, period: string): string {
  const iso = typeof date === "string" ? date : toIso(date);
  return `${iso}|${period}`;
}
