"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Subscribes to Postgres changes on the tables that drive shared views
// (events, requests, status_history) and calls router.refresh() when
// something changes, so every open tab picks up other people's actions
// without a manual reload — this is what was causing the concurrency
// confusion (acting on a page that silently no longer reflected reality).
// router.refresh() re-runs the current route's Server Components with fresh
// data; it doesn't reset client state (open menus, scroll position, etc.),
// so it's a cheap, non-disruptive way to stay current. Changes are debounced
// since a single action often touches multiple tables at once (e.g. a
// status transition updates `requests` and inserts into `status_history`).
export function LiveRefresh() {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("live-refresh")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, refresh)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "status_history" },
        refresh
      )
      .subscribe();

    function refresh() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => router.refresh(), 400);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
