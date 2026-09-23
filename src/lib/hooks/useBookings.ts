"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Booking, PeriodId } from "@/lib/types";

function mapRow(row: {
  id: string;
  date: string;
  period: string;
  name: string;
  status: string;
  block_overlap: boolean;
  created_at: string;
  confirmed_at: string | null;
}): Booking {
  return {
    id: row.id,
    date: row.date,
    period: row.period as PeriodId,
    name: row.name,
    status: row.status as Booking["status"],
    block_overlap: row.block_overlap,
    created_at: row.created_at,
    confirmed_at: row.confirmed_at,
  };
}

export function bookingKey(date: string, period: string): string {
  return `${date}|${period}`;
}

async function fetchBookings(): Promise<Booking[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const rows = await fetchBookings();
      setBookings(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    fetchBookings()
      .then((rows) => {
        if (cancelled) return;
        setBookings(rows);
        setError(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load bookings");
        setLoading(false);
      });

    const channel = supabase
      .channel("bookings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          void fetchBookings().then((rows) => {
            if (!cancelled) setBookings(rows);
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  const bySlot = useCallback(
    (date: string, period: string): Booking | undefined =>
      bookings.find((b) => b.date === date && b.period === period),
    [bookings],
  );

  const requestBooking = useCallback(
    async (date: string, period: PeriodId, name: string, blockOverlap: boolean) => {
      const supabase = createClient();
      const { error: err } = await supabase.from("bookings").insert({
        date,
        period,
        name,
        status: "pending",
        block_overlap: blockOverlap,
      });
      if (err) throw new Error(err.message);
      await refresh();
    },
    [refresh],
  );

  const cancelBooking = useCallback(
    async (id: string) => {
      const supabase = createClient();
      const { error: err } = await supabase.from("bookings").delete().eq("id", id);
      if (err) throw new Error(err.message);
      await refresh();
    },
    [refresh],
  );

  const confirmBooking = useCallback(
    async (id: string) => {
      const supabase = createClient();
      const { error: err } = await supabase
        .from("bookings")
        .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
        .eq("id", id);
      if (err) throw new Error(err.message);
      await refresh();
    },
    [refresh],
  );

  return {
    bookings,
    loading,
    error,
    refresh,
    bySlot,
    requestBooking,
    cancelBooking,
    confirmBooking,
  };
}
