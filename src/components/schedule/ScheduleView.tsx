"use client";

import { useCallback, useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import { useBookings } from "@/lib/hooks/useBookings";
import { useScheduleEntries } from "@/lib/hooks/useScheduleEntries";
import {
  adjacentSchoolDay,
  canGoNext,
  canGoPrev,
  clampWeekOffset,
  dayKind,
  dowOf,
  formatDayHeading,
  formatShortDate,
  holidayName,
  startMonday,
  termForDay,
  termForWeek,
  toIso,
  todayLocal,
  weekDates,
} from "@/lib/calendar";
import { PERIODS } from "@/lib/periods";
import { resolveCell } from "@/lib/cells";
import type { PeriodId, Selection } from "@/lib/types";
import { RequestBar } from "./RequestBar";
import { WeekGrid } from "./WeekGrid";
import { MobileDayList } from "./MobileDayList";
import { BottomSheet } from "./BottomSheet";
import styles from "./ScheduleView.module.css";

function buildSelection(
  date: Date,
  period: PeriodId,
  drama: boolean,
  booking: Selection["booking"],
): Selection {
  const p = PERIODS.find((x) => x.id === period)!;
  return {
    date: toIso(date),
    period,
    dayLabel: dowOf(date),
    dateLabel: formatShortDate(date),
    periodLabel: p.label,
    periodTime: p.time,
    drama,
    booking,
  };
}

export function ScheduleView() {
  const { loading, bySlot, requestBooking, cancelBooking } = useBookings();
  const { entries } = useScheduleEntries();

  const [weekOffset, setWeekOffset] = useState(0);
  const [mobileIso, setMobileIso] = useState(() => {
    const today = todayLocal();
    const m = startMonday(today);
    for (let o = 0; o < 5; o++) {
      const d = new Date(m);
      d.setDate(m.getDate() + o);
      if (d >= today) return toIso(d);
    }
    return toIso(m);
  });
  const [sel, setSel] = useState<Selection | null>(null);
  const [bookName, setBookName] = useState("");
  const [busy, setBusy] = useState(false);
  const [justSaved, setJustSaved] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const dates = useMemo(() => weekDates(weekOffset), [weekOffset]);
  const weekLabel = `${formatShortDate(dates[0])} – ${formatShortDate(dates[4])}`;
  const termLabel = termForWeek(dates[0], dates[4]);
  const prevOk = canGoPrev(weekOffset);
  const nextOk = canGoNext(weekOffset);

  const selectCell = useCallback(
    (date: Date, period: PeriodId) => {
      const iso = toIso(date);
      const booking = bySlot(iso, period) ?? null;
      const state = resolveCell(
        date,
        period,
        booking ?? undefined,
        entries,
        false,
      );
      if (
        state.kind === "blocked" ||
        state.kind === "past" ||
        state.kind === "no_school"
      ) {
        return;
      }
      setSel(
        buildSelection(
          date,
          period,
          state.kind === "drama",
          booking,
        ),
      );
      setBookName("");
      setFormError(null);
    },
    [bySlot, entries],
  );

  const clearSelection = () => {
    setSel(null);
    setBookName("");
    setFormError(null);
  };

  const submitRequest = async () => {
    if (!sel || sel.booking) return;
    const name = bookName.trim();
    if (!name) {
      setFormError("Enter your name and purpose.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await requestBooking(sel.date, sel.period, name, sel.drama);
      setJustSaved(`${sel.date}|${sel.period}`);
      clearSelection();
      setTimeout(() => setJustSaved(null), 600);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not submit request.");
    } finally {
      setBusy(false);
    }
  };

  const removeRequest = async () => {
    if (!sel?.booking) return;
    setBusy(true);
    try {
      await cancelBooking(sel.booking.id);
      clearSelection();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not cancel.");
    } finally {
      setBusy(false);
    }
  };

  const mobileDate = useMemo(() => {
    const [y, m, d] = mobileIso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [mobileIso]);

  const mobileKind = dayKind(mobileIso);
  const mobileHol = holidayName(mobileIso);
  const chipText =
    mobileKind === "RED"
      ? "RED DAY"
      : mobileKind === "BLACK"
        ? "BLACK DAY"
        : "NO SCHOOL";
  const chipClass =
    mobileKind === "RED"
      ? styles.chipRed
      : mobileKind === "BLACK"
        ? styles.chipBlack
        : styles.chipNone;

  return (
    <div className="page-shell">
      <Nav />

      {/* Desktop sticky request bar */}
      <div className={styles.desktopOnly}>
        {sel && (
          <RequestBar
            selection={sel}
            bookName={bookName}
            onBookNameChange={setBookName}
            onSubmit={submitRequest}
            onCancel={removeRequest}
            onClose={clearSelection}
            busy={busy}
            error={formError}
          />
        )}
      </div>

      {/* Desktop title + week nav */}
      <div className={`${styles.hero} ${styles.desktopOnly}`}>
        <div className={styles.heroCopy}>
          <div className={styles.kicker}>
            School year 2026–27 · Aug 20 – Jun 18
          </div>
          <h1>Sign up for the auditorium</h1>
          <p className="text-muted">
            Click an open period — any school day this year, P1–P8 or After
            School. Requests stay pending until the office approves them.
          </p>
        </div>
        <div className={styles.weekNav}>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            disabled={!prevOk}
            onClick={() => {
              setWeekOffset((w) => clampWeekOffset(w - 1));
              clearSelection();
            }}
            aria-label="Previous week"
          >
            ‹
          </button>
          <div className={styles.weekLabel}>
            <div className={styles.weekRange}>{weekLabel}</div>
            <div className={styles.termLabel}>{termLabel}</div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            disabled={!nextOk}
            onClick={() => {
              setWeekOffset((w) => clampWeekOffset(w + 1));
              clearSelection();
            }}
            aria-label="Next week"
          >
            ›
          </button>
        </div>
      </div>

      <div className={styles.desktopOnly}>
        <WeekGrid
          dates={dates}
          entries={entries}
          bySlot={bySlot}
          selection={sel}
          justSaved={justSaved}
          onSelect={selectCell}
        />
        <div className={styles.legend}>
          <LegendItem
            className={styles.swatchOpen}
            label="Open — click to request"
          />
          <LegendItem
            className={styles.swatchPending}
            label="Pending — awaiting office approval"
          />
          <LegendItem className={styles.swatchConfirmed} label="Confirmed" />
          <LegendItem
            className={styles.swatchDrama}
            label="Drama class — often flexible, ask first"
          />
          <LegendItem
            className={styles.swatchBlocked}
            label="Blocked by the office"
          />
        </div>
      </div>

      {/* Mobile 1a: day-at-a-time list */}
      <div className={styles.mobileOnly}>
        <div className={styles.mobileDayNav}>
          <button
            type="button"
            className={styles.dayArrow}
            onClick={() => {
              setMobileIso((iso) => adjacentSchoolDay(iso, -1));
              clearSelection();
            }}
            aria-label="Previous day"
          >
            ‹
          </button>
          <div className={styles.mobileDayCenter}>
            <div className={styles.mobileDayTitle}>
              {formatDayHeading(mobileDate)}
            </div>
            <span className={`${styles.chip} ${chipClass}`}>
              {chipText}
              {mobileKind !== "NO_SCHOOL" ? ` · ${termForDay(mobileIso)}` : ""}
            </span>
            {mobileHol && (
              <div className={styles.mobileHol}>{mobileHol}</div>
            )}
          </div>
          <button
            type="button"
            className={styles.dayArrow}
            onClick={() => {
              setMobileIso((iso) => adjacentSchoolDay(iso, 1));
              clearSelection();
            }}
            aria-label="Next day"
          >
            ›
          </button>
        </div>

        {loading ? (
          <p className={styles.loading}>Loading schedule…</p>
        ) : (
          <MobileDayList
            date={mobileDate}
            entries={entries}
            bySlot={bySlot}
            selection={sel}
            onSelect={selectCell}
          />
        )}

        {sel && !sel.booking && (
          <BottomSheet
            selection={sel}
            bookName={bookName}
            onBookNameChange={setBookName}
            onSubmit={submitRequest}
            onClose={clearSelection}
            busy={busy}
            error={formError}
          />
        )}
        {sel?.booking && (
          <BottomSheet
            selection={sel}
            bookName={bookName}
            onBookNameChange={setBookName}
            onSubmit={submitRequest}
            onCancel={removeRequest}
            onClose={clearSelection}
            busy={busy}
            error={formError}
          />
        )}
      </div>

      <div className={`page-footer ${styles.desktopOnly}`}>
        Requests cover one period (P1–P8 or After School) · bookable through Jun
        18 · the office approves each request — red/black days follow the 2026–27
        calendar
      </div>
    </div>
  );
}

function LegendItem({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <div className={styles.legendItem}>
      <div className={`${styles.swatch} ${className}`} />
      {label}
    </div>
  );
}
