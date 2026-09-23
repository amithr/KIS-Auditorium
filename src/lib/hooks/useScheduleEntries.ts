"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Dow, NewScheduleEntry, PeriodId, ScheduleEntry } from "@/lib/types";

function mapRow(row: {
  id: string;
  repeat: string;
  date: string | null;
  dow: string | null;
  until: string | null;
  from_period: string;
  to_period: string;
  reason: string;
  created_at: string;
}): ScheduleEntry {
  return {
    id: row.id,
    repeat: row.repeat as ScheduleEntry["repeat"],
    date: row.date,
    dow: row.dow as Dow | null,
    until: row.until,
    from_period: row.from_period as PeriodId,
    to_period: row.to_period as PeriodId,
    reason: row.reason,
    created_at: row.created_at,
  };
}

async function fetchEntries(): Promise<ScheduleEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("schedule_entries")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export function useScheduleEntries() {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const rows = await fetchEntries();
      setEntries(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load entries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    fetchEntries()
      .then((rows) => {
        if (cancelled) return;
        setEntries(rows);
        setError(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load entries");
        setLoading(false);
      });

    const channel = supabase
      .channel("entries-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedule_entries" },
        () => {
          void fetchEntries().then((rows) => {
            if (!cancelled) setEntries(rows);
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  const addEntry = useCallback(
    async (entry: NewScheduleEntry) => {
      const supabase = createClient();
      const { error: err } = await supabase.from("schedule_entries").insert({
        repeat: entry.repeat,
        date: entry.repeat === "once" ? entry.date ?? null : null,
        dow: entry.repeat === "weekly" ? entry.dow ?? null : null,
        until: entry.repeat === "weekly" ? entry.until || null : null,
        from_period: entry.from_period,
        to_period: entry.to_period,
        reason: entry.reason,
      });
      if (err) throw new Error(err.message);
      await refresh();
    },
    [refresh],
  );

  const removeEntry = useCallback(
    async (id: string) => {
      const supabase = createClient();
      const { error: err } = await supabase
        .from("schedule_entries")
        .delete()
        .eq("id", id);
      if (err) throw new Error(err.message);
      await refresh();
    },
    [refresh],
  );

  return { entries, loading, error, refresh, addEntry, removeEntry };
}
