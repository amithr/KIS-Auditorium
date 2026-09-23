"use client";

import type { Selection } from "@/lib/types";
import styles from "./RequestBar.module.css";

interface RequestBarProps {
  selection: Selection;
  bookName: string;
  onBookNameChange: (v: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  onClose: () => void;
  busy?: boolean;
  error?: string | null;
}

export function RequestBar({
  selection,
  bookName,
  onBookNameChange,
  onSubmit,
  onCancel,
  onClose,
  busy,
  error,
}: RequestBarProps) {
  const label = `${selection.dayLabel} ${selection.dateLabel} · ${selection.periodLabel}`;
  const booked = !!selection.booking;
  const pending = selection.booking?.status === "pending";

  return (
    <div className={styles.bar} role="region" aria-label="Request period">
      <span className={styles.selLabel}>{label}</span>

      {booked && selection.booking && (
        <>
          <span
            className="tag"
            style={{
              border: `1px solid ${
                pending ? "var(--color-accent-600)" : "var(--color-accent-800)"
              }`,
              color: pending
                ? "var(--color-accent-600)"
                : "var(--color-accent-800)",
              whiteSpace: "nowrap",
            }}
          >
            {pending ? "PENDING" : "CONFIRMED"}
          </span>
          <span className={styles.statusText}>
            {pending
              ? "Awaiting office approval — requested by"
              : "Confirmed for"}{" "}
            <strong>{selection.booking.name}</strong>
          </span>
          {pending && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={busy}
              style={{ color: "var(--color-neutral-700)" }}
            >
              Cancel this request
            </button>
          )}
        </>
      )}

      {!booked && (
        <>
          {selection.blockReason && (
            <span className={styles.blockNote}>
              Blocked: {selection.blockReason}. You can still request it — if
              the office approves, your booking replaces the block.
            </span>
          )}
          <input
            className={`input ${styles.input}`}
            value={bookName}
            onChange={(e) => onBookNameChange(e.target.value)}
            placeholder="Your name and purpose (e.g. Ms. Rivera — 8B Drama rehearsal)"
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={onSubmit}
            disabled={busy}
            style={{ whiteSpace: "nowrap" }}
          >
            Request this period
          </button>
        </>
      )}

      <button
        type="button"
        className="btn btn-ghost"
        onClick={onClose}
        style={{ color: "var(--color-neutral-600)" }}
      >
        Close
      </button>

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
