"use client";

import { toIso } from "@/lib/calendar";
import { PERIODS } from "@/lib/periods";
import { cellIsClickable, resolveCell } from "@/lib/cells";
import type { Booking, PeriodId, ScheduleEntry, Selection } from "@/lib/types";
import styles from "./MobileDayList.module.css";

interface MobileDayListProps {
  date: Date;
  entries: ScheduleEntry[];
  bySlot: (date: string, period: string) => Booking | undefined;
  selection: Selection | null;
  onSelect: (date: Date, period: PeriodId) => void;
}

export function MobileDayList({
  date,
  entries,
  bySlot,
  selection,
  onSelect,
}: MobileDayListProps) {
  const iso = toIso(date);
  const selKey = selection
    ? `${selection.date}|${selection.period}`
    : null;

  return (
    <div className={styles.list}>
      {PERIODS.map((p) => {
        const booking = bySlot(iso, p.id);
        const isSel = selKey === `${iso}|${p.id}`;
        const state = resolveCell(date, p.id, booking, entries, isSel);
        const clickable = cellIsClickable(state);

        let status = "Open";
        let action = "Request";
        let rowClass = styles.open;

        if (state.kind === "pending") {
          status = state.booking.name;
          action = "PENDING";
          rowClass = styles.pending;
        } else if (state.kind === "confirmed") {
          status = state.booking.name;
          action = "CONFIRMED";
          rowClass = styles.confirmed;
        } else if (state.kind === "drama") {
          status = `${state.entry.reason} · ask to book`;
          action = "Ask";
          rowClass = styles.drama;
        } else if (state.kind === "blocked") {
          status = state.entry.reason;
          action = "";
          rowClass = styles.blocked;
        } else if (state.kind === "past" || state.kind === "no_school") {
          status = state.kind === "no_school" ? "No school" : "Past";
          action = "";
          rowClass = styles.disabled;
        } else if (state.kind === "selected") {
          status = "Selected";
          action = "";
          rowClass = styles.selected;
        }

        return (
          <button
            key={p.id}
            type="button"
            className={`${styles.row} ${rowClass}`}
            disabled={!clickable}
            onClick={() => onSelect(date, p.id)}
          >
            <div className={styles.period}>
              <div className={styles.plabel}>{p.label}</div>
              <div className={styles.ptime}>{p.time.replace(/ – /g, "–")}</div>
            </div>
            <span className={styles.status}>{status}</span>
            {action === "PENDING" || action === "CONFIRMED" ? (
              <span className={styles.pill}>{action}</span>
            ) : action ? (
              <span className={styles.action}>{action}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
