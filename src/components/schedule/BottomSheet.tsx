"use client";

import type { Selection } from "@/lib/types";
import styles from "./BottomSheet.module.css";

interface BottomSheetProps {
  selection: Selection;
  bookName: string;
  onBookNameChange: (v: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  onClose: () => void;
  busy?: boolean;
  error?: string | null;
}

export function BottomSheet({
  selection,
  bookName,
  onBookNameChange,
  onSubmit,
  onCancel,
  onClose,
  busy,
  error,
}: BottomSheetProps) {
  const booked = !!selection.booking;
  const pending = selection.booking?.status === "pending";

  return (
    <div className={styles.sheet} role="dialog" aria-label="Request period">
      <div className={styles.handle} />
      <div className={styles.head}>
        <span className={styles.title}>
          {booked ? selection.periodLabel : `Request ${selection.periodLabel}`}
        </span>
        <span className={styles.meta}>
          {selection.dayLabel}, {selection.dateLabel} · {selection.periodTime}
        </span>
        <button type="button" className={styles.close} onClick={onClose}>
          ×
        </button>
      </div>

      {booked && selection.booking ? (
        <>
          <div className={styles.hint}>
            {pending
              ? "Awaiting office approval"
              : "Confirmed — contact the office to change"}
          </div>
          <div className={styles.bookedName}>{selection.booking.name}</div>
          {pending && (
            <button
              type="button"
              className="btn btn-secondary btn-block"
              style={{ minHeight: 46, color: "var(--color-neutral-700)" }}
              onClick={onCancel}
              disabled={busy}
            >
              Cancel this request
            </button>
          )}
        </>
      ) : (
        <>
          {selection.drama ? (
            <div className={styles.dramaHint}>
              Drama class scheduled — request and the theatre teacher will
              confirm whether it&apos;s possible.
            </div>
          ) : (
            <div className={styles.hint}>
              Pending until the office approves — you&apos;ll get a notification.
            </div>
          )}
          <input
            className="input"
            value={bookName}
            onChange={(e) => onBookNameChange(e.target.value)}
            placeholder="Your name and purpose"
            style={{ marginBottom: 10, minHeight: 44 }}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          />
          {error && <div className={styles.error}>{error}</div>}
          <button
            type="button"
            className="btn btn-primary btn-block"
            style={{ minHeight: 46, fontSize: 15 }}
            onClick={onSubmit}
            disabled={busy}
          >
            {selection.drama
              ? "Request — pending teacher's OK"
              : "Request this period"}
          </button>
        </>
      )}
    </div>
  );
}
