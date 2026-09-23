"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/client";
import { useBookings } from "@/lib/hooks/useBookings";
import { useScheduleEntries } from "@/lib/hooks/useScheduleEntries";
import {
  DOWS,
  formatAdminDate,
  formatOnceLabel,
  parseIso,
  todayLocal,
  toIso,
} from "@/lib/calendar";
import {
  normalizePeriodRange,
  PERIODS,
  periodInRange,
  periodLabel,
  periodRangeLabel,
} from "@/lib/periods";
import type { Dow, EntryKind, EntryRepeat, PeriodId } from "@/lib/types";
import styles from "./AdminPanel.module.css";

type AdminTab = "bookings" | "blocks";

export function AdminPanel() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  const { bookings, confirmBooking, cancelBooking } = useBookings();
  const { entries, addEntry, removeEntry } = useScheduleEntries();

  const [tab, setTab] = useState<AdminTab>("bookings");
  const [blkOpen, setBlkOpen] = useState(true);
  const [blkKind, setBlkKind] = useState<EntryKind>("block");
  const [blkRepeat, setBlkRepeat] = useState<EntryRepeat>("once");
  const [blkDate, setBlkDate] = useState(() => toIso(todayLocal()));
  const [blkDow, setBlkDow] = useState<Dow>("MON");
  const [blkUntil, setBlkUntil] = useState("");
  const [blkFrom, setBlkFrom] = useState<PeriodId>("1");
  const [blkTo, setBlkTo] = useState<PeriodId>("1");
  const [blkReason, setBlkReason] = useState("");
  const [blkError, setBlkError] = useState<string | null>(null);
  const [blkBusy, setBlkBusy] = useState(false);

  const checkSession = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setAuthed(false);
      setIsAdmin(false);
      return;
    }
    const { data } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    setAuthed(true);
    setIsAdmin(!!data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setAuthed(false);
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setAuthed(true);
      setIsAdmin(!!data);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void checkSession();
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [checkSession]);

  const doLogin = async () => {
    const email = loginEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLoginError("Enter a valid email address.");
      return;
    }
    setLoginBusy(true);
    setLoginError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: loginPass,
    });
    if (error) {
      setLoginError(
        error.message.includes("Invalid")
          ? "Wrong email or password — ask the office for access."
          : error.message,
      );
      setLoginBusy(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) {
        await supabase.auth.signOut();
        setLoginError("This account is not on the admin list.");
        setLoginBusy(false);
        return;
      }
    }
    setLoginPass("");
    setLoginBusy(false);
    await checkSession();
  };

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setAuthed(false);
    setIsAdmin(false);
  };

  const todayIso = toIso(todayLocal());
  const upcomingBookings = useMemo(() => {
    return bookings
      .filter((b) => b.date >= todayIso)
      .sort(
        (a, c) =>
          a.date.localeCompare(c.date) ||
          PERIODS.findIndex((p) => p.id === a.period) -
            PERIODS.findIndex((p) => p.id === c.period),
      );
  }, [bookings, todayIso]);

  const pending = upcomingBookings.filter((b) => b.status === "pending");
  const confirmed = upcomingBookings.filter((b) => b.status === "confirmed");

  const { from: rangeFrom, to: rangeTo } = normalizePeriodRange(blkFrom, blkTo);
  const conflicts = useMemo(() => {
    return bookings.filter((b) => {
      if (!periodInRange(b.period, rangeFrom, rangeTo)) return false;
      if (blkRepeat === "once") return b.date === blkDate;
      const d = parseIso(b.date);
      const dow = DOWS[(d.getDay() + 6) % 7];
      return dow === blkDow && (!blkUntil || b.date <= blkUntil);
    }).length;
  }, [bookings, rangeFrom, rangeTo, blkRepeat, blkDate, blkDow, blkUntil]);

  const addBlock = async () => {
    if (blkRepeat === "once" && !blkDate) return;
    setBlkBusy(true);
    setBlkError(null);
    try {
      await addEntry({
        kind: blkKind,
        repeat: blkRepeat,
        date: blkDate,
        dow: blkDow,
        until: blkUntil || null,
        from_period: rangeFrom,
        to_period: rangeTo,
        reason:
          blkReason.trim() ||
          (blkKind === "drama" ? "Drama class" : "Blocked"),
      });
      setBlkReason("");
    } catch (e) {
      setBlkError(e instanceof Error ? e.message : "Could not add entry.");
    } finally {
      setBlkBusy(false);
    }
  };

  if (authed === null) {
    return (
      <div className="page-shell">
        <Nav admin />
        <p className={styles.loading}>Checking session…</p>
      </div>
    );
  }

  if (!authed || !isAdmin) {
    return (
      <div className="page-shell">
        <Nav admin />
        <div className={styles.loginWrap}>
          <div className={`card elev-md ${styles.loginCard}`}>
            <div>
              <div className={styles.kicker}>Office · Admin</div>
              <h3>Sign in to the admin panel</h3>
              <p className="text-muted" style={{ fontSize: 13, margin: "8px 0 0" }}>
                Admin access only — sign in with your email and the admin
                password.
              </p>
            </div>
            <div className="field">
              <label htmlFor="admin-email">Email address</label>
              <input
                id="admin-email"
                className="input"
                type="email"
                value={loginEmail}
                onChange={(e) => {
                  setLoginEmail(e.target.value);
                  setLoginError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && void doLogin()}
                placeholder="you@school.org"
                autoComplete="username"
              />
            </div>
            <div className="field">
              <label htmlFor="admin-pass">Admin password</label>
              <input
                id="admin-pass"
                className="input"
                type="password"
                value={loginPass}
                onChange={(e) => {
                  setLoginPass(e.target.value);
                  setLoginError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && void doLogin()}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            {loginError && <div className={styles.loginError}>{loginError}</div>}
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => void doLogin()}
              disabled={loginBusy}
            >
              Sign in →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pendingRows = pending.map((r) => {
    const d = parseIso(r.date);
    const { dow, dd, mon } = formatAdminDate(d);
    const p = PERIODS.find((x) => x.id === r.period);
    return { r, dow, dd, mon, p };
  });

  return (
    <div className="page-shell">
      <Nav admin onSignOut={() => void signOut()} />

      <div className={styles.titleRow}>
        <div>
          <div className={styles.kicker}>Office · Admin</div>
          <h1 className={styles.title}>Auditorium admin</h1>
        </div>
      </div>

      <div className={styles.pills} role="tablist" aria-label="Admin sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "bookings"}
          className={tab === "bookings" ? styles.pillActive : styles.pill}
          onClick={() => setTab("bookings")}
        >
          Booking requests
          {pending.length > 0 && (
            <span className={styles.pillBadge}>{pending.length}</span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "blocks"}
          className={tab === "blocks" ? styles.pillActive : styles.pill}
          onClick={() => setTab("blocks")}
        >
          Blocks &amp; Drama classes
          {entries.length > 0 && (
            <span className={styles.pillMuted}>{entries.length}</span>
          )}
        </button>
      </div>

      {tab === "bookings" && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionHeadLeft}>
              <h4>Booking requests</h4>
              {pending.length > 0 && (
                <span className="tag tag-accent">{pending.length} AWAITING</span>
              )}
            </div>
            <span className={styles.sectionMeta}>From the Schedule page</span>
          </div>

          {upcomingBookings.length === 0 && (
            <div className="text-muted" style={{ fontSize: 14 }}>
              No requests yet — teacher requests from the{" "}
              <a href="/schedule">Schedule page</a> will appear here.
            </div>
          )}

          <div className={styles.desktopList}>
            {pendingRows.map(({ r, dow, dd, mon }) => (
              <div key={r.id} className={`row-rule ${styles.reqRow}`}>
                <div className={styles.dateCol}>
                  <div className={styles.dow}>{dow}</div>
                  <div className={styles.dd}>{dd}</div>
                  <div className={styles.mon}>{mon}</div>
                </div>
                <span className="tag tag-neutral">{periodLabel(r.period)}</span>
                <div className={styles.reqBody}>
                  <div className={styles.reqName}>{r.name}</div>
                  <div className={styles.reqMeta}>
                    Requested{" "}
                    {new Date(r.created_at).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                  {r.drama_overlap && (
                    <div className={styles.dramaWarn}>
                      ⚠ Overlaps a Drama class — check with the theatre teacher
                      before confirming
                    </div>
                  )}
                </div>
                <div className={styles.reqActions}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void confirmBooking(r.id)}
                  >
                    Confirm ✓
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ color: "var(--color-neutral-700)" }}
                    onClick={() => void cancelBooking(r.id)}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.mobileCards}>
            {pendingRows.map(({ r, dow, dd, mon, p }) => (
              <div key={r.id} className={styles.mCard}>
                <div className={styles.mCardTop}>
                  <div className={styles.mDateBox}>
                    <div className={styles.dow}>{dow}</div>
                    <div className={styles.dd}>{dd}</div>
                    <div className={styles.mon}>{mon}</div>
                  </div>
                  <div className={styles.reqBody}>
                    <div className={styles.reqName}>{r.name}</div>
                    <div className={styles.reqMeta}>
                      {periodLabel(r.period)}
                      {p ? ` · ${p.time}` : ""} · requested{" "}
                      {new Date(r.created_at).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                    {r.drama_overlap && (
                      <div className={styles.mDrama}>
                        ⚠ Overlaps Drama. Check with the theatre teacher first.
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.mActions}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1, minHeight: 44 }}
                    onClick={() => void confirmBooking(r.id)}
                  >
                    Confirm ✓
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{
                      flex: 1,
                      minHeight: 44,
                      color: "var(--color-neutral-700)",
                    }}
                    onClick={() => void cancelBooking(r.id)}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>

          {confirmed.length > 0 && (
            <div className={styles.upcoming}>
              <h6>Upcoming · confirmed</h6>
              {confirmed.map((u) => {
                const d = parseIso(u.date);
                const { dow, dd, mon } = formatAdminDate(d);
                return (
                  <div key={u.id} className={styles.upRow}>
                    <span className="tag tag-outline">CONFIRMED</span>
                    <span className={styles.upText}>
                      <strong>{u.name}</strong> · {dow} {dd} {mon} ·{" "}
                      {periodLabel(u.period)}
                    </span>
                    <span style={{ flex: 1 }} />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ color: "var(--color-neutral-600)", fontSize: 13 }}
                      onClick={() => void cancelBooking(u.id)}
                    >
                      Cancel
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <p className={`text-muted ${styles.helper}`}>
            Requests stay pending until the office approves them. Before
            confirming, check with the theatre teacher and other staff for
            conflicts. Confirming turns the slot solid on the Schedule page;
            declining frees the period.
          </p>
        </section>
      )}

      {tab === "blocks" && (
        <section className={`${styles.section} ${styles.blocksSection}`}>
          <div className={styles.blocksHead}>
            <div className={styles.blocksHeadLeft}>
              <h4>Blocks &amp; Drama classes</h4>
              {entries.length > 0 && (
                <span className="tag tag-neutral">{entries.length} ACTIVE</span>
              )}
              <span className={styles.blocksBlurb}>
                Blocks close the auditorium outright; Drama classes stay
                requestable.
              </span>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: "none", color: "var(--color-neutral-700)" }}
              onClick={() => setBlkOpen((open) => !open)}
            >
              {blkOpen ? "Close form" : "+ Add"}
            </button>
          </div>

          {blkOpen && (
            <>
              <div className={styles.blockForm}>
                <div className="field">
                  <label htmlFor="blk-kind">Type</label>
                  <select
                    id="blk-kind"
                    className="select"
                    value={blkKind}
                    onChange={(e) => setBlkKind(e.target.value as EntryKind)}
                  >
                    <option value="block">Block — no bookings</option>
                    <option value="drama">Drama class — flexible</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="blk-repeat">Repeat</label>
                  <select
                    id="blk-repeat"
                    className="select"
                    value={blkRepeat}
                    onChange={(e) =>
                      setBlkRepeat(e.target.value as EntryRepeat)
                    }
                  >
                    <option value="once">One day only</option>
                    <option value="weekly">Every week</option>
                  </select>
                </div>
                {blkRepeat === "once" ? (
                  <div className="field">
                    <label htmlFor="blk-date">Date</label>
                    <input
                      id="blk-date"
                      className="input"
                      type="date"
                      value={blkDate}
                      onChange={(e) => setBlkDate(e.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    <div className="field">
                      <label htmlFor="blk-dow">Every</label>
                      <select
                        id="blk-dow"
                        className="select"
                        value={blkDow}
                        onChange={(e) => setBlkDow(e.target.value as Dow)}
                      >
                        {DOWS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="blk-until">Until · optional</label>
                      <input
                        id="blk-until"
                        className="input"
                        type="date"
                        value={blkUntil}
                        onChange={(e) => setBlkUntil(e.target.value)}
                      />
                    </div>
                  </>
                )}
                <div className="field">
                  <label htmlFor="blk-from">From</label>
                  <select
                    id="blk-from"
                    className="select"
                    value={blkFrom}
                    onChange={(e) => setBlkFrom(e.target.value as PeriodId)}
                  >
                    {PERIODS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="blk-to">To</label>
                  <select
                    id="blk-to"
                    className="select"
                    value={blkTo}
                    onChange={(e) => setBlkTo(e.target.value as PeriodId)}
                  >
                    {PERIODS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={`field ${styles.reasonField}`}>
                  <label htmlFor="blk-reason">Label · shown to teachers</label>
                  <input
                    id="blk-reason"
                    className="input"
                    value={blkReason}
                    onChange={(e) => setBlkReason(e.target.value)}
                    placeholder={
                      blkKind === "drama"
                        ? "e.g. Drama — Gr. 9/10"
                        : "e.g. Pep rally setup, maintenance"
                    }
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void addBlock()}
                  disabled={blkBusy}
                >
                  {blkKind === "drama" ? "Add class →" : "Block →"}
                </button>
              </div>

              {conflicts > 0 && (
                <div className={styles.conflict}>
                  ⚠ This overlaps {conflicts} existing booking
                  {conflicts === 1 ? "" : "s"}. Existing bookings stay — cancel
                  them in Booking requests if needed.
                </div>
              )}
              {blkError && <div className={styles.loginError}>{blkError}</div>}
            </>
          )}

          {entries.length > 0 && (
            <div className={styles.activeBlocks}>
              <h6>Active blocks &amp; classes</h6>
              {entries.map((b) => {
                const isDrama = b.kind === "drama";
                const when =
                  (b.repeat === "once"
                    ? formatOnceLabel(b.date!)
                    : `EVERY ${b.dow}${b.until ? ` UNTIL ${formatOnceLabel(b.until)}` : ""}`) +
                  ` · ${periodRangeLabel(b.from_period, b.to_period)}`;
                return (
                  <div key={b.id} className={styles.blockRow}>
                    <div
                      className={styles.swatch}
                      style={{
                        background: isDrama
                          ? "var(--red-tint)"
                          : "repeating-linear-gradient(45deg, var(--color-neutral-200) 0, var(--color-neutral-200) 3px, var(--color-neutral-100) 3px, var(--color-neutral-100) 6px)",
                        border: `1px solid ${isDrama ? "var(--red-line)" : "var(--color-neutral-300)"}`,
                      }}
                    />
                    <span
                      className="tag"
                      style={{
                        background: isDrama
                          ? "var(--red-tint)"
                          : "var(--color-neutral-200)",
                        color: isDrama
                          ? "var(--red-deep)"
                          : "var(--color-neutral-800)",
                      }}
                    >
                      {isDrama ? "DRAMA" : "BLOCK"}
                    </span>
                    <span className={styles.blockWhen}>{when}</span>
                    <span className={styles.blockReason}>{b.reason}</span>
                    <span style={{ flex: 1 }} />
                    <button
                      type="button"
                      className={styles.removeBtn}
                      title="Remove"
                      onClick={() => void removeEntry(b.id)}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <p className={`text-muted ${styles.helper}`}>
            Blocked periods show striped on the Schedule page with your label —
            teachers can&apos;t request them. Drama classes show as flexible; the
            theatre teacher confirms those requests.
          </p>
        </section>
      )}

      <div className="page-footer">
        <span>Changes save automatically and appear on the Schedule page.</span>
      </div>
    </div>
  );
}
