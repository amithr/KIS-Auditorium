export type PeriodId = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "AS";
export type BookingStatus = "pending" | "confirmed";
export type EntryKind = "block" | "drama";
export type EntryRepeat = "once" | "weekly";
export type Dow = "MON" | "TUE" | "WED" | "THU" | "FRI";
export type DayKind = "RED" | "BLACK" | "NO_SCHOOL";

export interface Period {
  id: PeriodId;
  label: string;
  time: string;
}

export interface Booking {
  id: string;
  date: string; // YYYY-MM-DD
  period: PeriodId;
  name: string;
  status: BookingStatus;
  drama_overlap: boolean;
  created_at: string;
  confirmed_at: string | null;
}

export interface ScheduleEntry {
  id: string;
  kind: EntryKind;
  repeat: EntryRepeat;
  date: string | null;
  dow: Dow | null;
  until: string | null;
  from_period: PeriodId;
  to_period: PeriodId;
  reason: string;
  created_at: string;
}

export type CellState =
  | { kind: "open" }
  | { kind: "selected" }
  | { kind: "pending"; booking: Booking }
  | { kind: "confirmed"; booking: Booking }
  | { kind: "drama"; entry: ScheduleEntry }
  | { kind: "blocked"; entry: ScheduleEntry }
  | { kind: "past" }
  | { kind: "no_school" };

export interface Selection {
  date: string;
  period: PeriodId;
  dayLabel: string;
  dateLabel: string;
  periodLabel: string;
  periodTime: string;
  drama: boolean;
  booking: Booking | null;
}

export interface NewScheduleEntry {
  kind: EntryKind;
  repeat: EntryRepeat;
  date?: string | null;
  dow?: Dow | null;
  until?: string | null;
  from_period: PeriodId;
  to_period: PeriodId;
  reason: string;
}
