"use client";

import {
  dayKind,
  dowOf,
  formatShortDate,
  holidayName,
  toIso,
  todayLocal,
} from "@/lib/calendar";
import { PERIODS } from "@/lib/periods";
import { cellIsClickable, resolveCell } from "@/lib/cells";
import type { Booking, PeriodId, ScheduleEntry, Selection } from "@/lib/types";
import styles from "./WeekGrid.module.css";

interface WeekGridProps {
  dates: Date[];
  entries: ScheduleEntry[];
  bySlot: (date: string, period: string) => Booking | undefined;
  selection: Selection | null;
  justSaved: string | null;
  onSelect: (date: Date, period: PeriodId) => void;
}

export function WeekGrid({
  dates,
  entries,
  bySlot,
  selection,
  justSaved,
  onSelect,
}: WeekGridProps) {
  const today = todayLocal();
  const dayNames = ["MON", "TUE", "WED", "THU", "FRI"];
  const selKey = selection
    ? `${selection.date}|${selection.period}`
    : null;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.periodHead}>Period</div>
        {dates.map((d, i) => {
          const iso = toIso(d);
          const kind = dayKind(iso);
          const hol = holidayName(iso);
          const isToday = d.getTime() === today.getTime();
          const chipText =
            kind === "RED"
              ? "RED DAY"
              : kind === "BLACK"
                ? "BLACK DAY"
                : "NO SCHOOL";
          const chipClass =
            kind === "RED"
              ? styles.chipRed
              : kind === "BLACK"
                ? styles.chipBlack
                : styles.chipNone;
          return (
            <div key={iso} className={styles.dayHead}>
              <div
                className={styles.dayLabel}
                style={{
                  color: isToday
                    ? "var(--color-accent-700)"
                    : "var(--color-neutral-600)",
                }}
              >
                {dayNames[i]}
              </div>
              <div
                className={styles.dayDate}
                style={{
                  color: isToday
                    ? "var(--color-accent-700)"
                    : "var(--color-text)",
                }}
              >
                {formatShortDate(d)}
              </div>
              <span className={`${styles.chip} ${chipClass}`}>{chipText}</span>
              {hol && <div className={styles.hol}>{hol}</div>}
            </div>
          );
        })}
      </div>

      {PERIODS.map((p, ri) => (
        <div
          key={p.id}
          className={styles.row}
          style={{
            borderTop:
              p.id === "AS"
                ? "1px solid var(--color-divider)"
                : ri === 0
                  ? "none"
                  : "1px solid color-mix(in srgb, var(--color-text) 6%, transparent)",
          }}
        >
          <div className={styles.periodCell}>
            <span className={styles.periodLabel}>{p.label}</span>
            <span className={styles.periodTime}>{p.time}</span>
          </div>
          {dates.map((d, di) => {
            const iso = toIso(d);
            const key = `${iso}|${p.id}`;
            const booking = bySlot(iso, p.id);
            const isSel = key === selKey;
            const state = resolveCell(
              d,
              p.id,
              booking,
              entries,
              isSel,
            );
            const clickable = cellIsClickable(state);
            const cls = [
              styles.cell,
              styles[`cell_${state.kind}`],
              isSel ? styles.cellSelected : "",
              justSaved === key ? styles.cellPop : "",
            ]
              .filter(Boolean)
              .join(" ");

            let text = "";
            if (state.kind === "pending") {
              text = `${state.booking.name} · pending`;
            } else if (state.kind === "confirmed") {
              text = state.booking.name;
            } else if (state.kind === "blocked") {
              text = state.booking
                ? `${state.entry.reason} · request pending`
                : isSel
                  ? "Selected"
                  : state.entry.reason;
            } else if (state.kind === "selected") {
              text = "Selected";
            }

            return (
              <button
                key={key}
                type="button"
                className={cls}
                disabled={!clickable}
                onClick={() => onSelect(d, p.id)}
                style={{
                  animationDelay: `${di * 0.05 + ri * 0.015}s`,
                }}
                aria-label={`${dowOf(d)} ${formatShortDate(d)} ${p.label}`}
              >
                {text}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
