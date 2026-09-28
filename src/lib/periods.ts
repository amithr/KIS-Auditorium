import type { Period, PeriodId } from "./types";

export const PERIODS: Period[] = [
  { id: "1", label: "P1", time: "8:45 – 9:25" },
  { id: "2", label: "P2", time: "9:30 – 10:10" },
  { id: "3", label: "P3", time: "10:30 – 11:10" },
  { id: "4", label: "P4", time: "11:15 – 11:55" },
  { id: "5", label: "P5", time: "12:50 – 1:30" },
  { id: "6", label: "P6", time: "1:35 – 2:15" },
  { id: "7", label: "P7", time: "2:35 – 3:15" },
  { id: "8", label: "P8", time: "3:20 – 4:00" },
  { id: "AS", label: "After School", time: "4:00 – 5:15" },
];

export const PERIOD_IDS = PERIODS.map((p) => p.id);

export function periodIndex(id: PeriodId): number {
  return PERIODS.findIndex((p) => p.id === id);
}

export function periodLabel(id: PeriodId): string {
  return PERIODS.find((p) => p.id === id)?.label ?? id;
}

export function periodTime(id: PeriodId): string {
  return PERIODS.find((p) => p.id === id)?.time ?? "";
}

export function periodRangeLabel(from: PeriodId, to: PeriodId): string {
  return from === to
    ? periodLabel(from)
    : `${periodLabel(from)}–${periodLabel(to)}`;
}

export function normalizePeriodRange(
  from: PeriodId,
  to: PeriodId,
): { from: PeriodId; to: PeriodId } {
  const a = periodIndex(from);
  const b = periodIndex(to);
  return a <= b
    ? { from, to }
    : { from: PERIODS[b].id, to: PERIODS[a].id };
}

export function periodInRange(
  id: PeriodId,
  from: PeriodId,
  to: PeriodId,
): boolean {
  const i = periodIndex(id);
  const a = periodIndex(from);
  const b = periodIndex(to);
  return i >= Math.min(a, b) && i <= Math.max(a, b);
}
