"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { fetchCwSessions, type CwSession } from "@/lib/api/sessions";

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMinutes(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${value} мин`;
}

function statusTone(status: string | null) {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
    case "in_progress":
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
    case "pending":
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";
    case "cancelled":
    case "error":
      return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400";
    default:
      return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string } | null;
    if (body?.message) return body.message;
  }
  if (err instanceof Error) return err.message;
  return "Не удалось загрузить историю";
}

export default function HistoryList() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<CwSession[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    const data = await fetchCwSessions();
    setSessions(data.sessions);
    setTotal(data.total);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        await loadSessions();
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) {
          setSessions([]);
          setError(errorMessage(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [loadSessions]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((key) => (
          <div
            key={key}
            className="h-28 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-2xl bg-red-50 px-4 py-6 text-center text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
        {error}
      </p>
    );
  }

  if (sessions.length === 0) {
    return (
      <p className="rounded-2xl bg-zinc-100 px-4 py-8 text-center text-sm text-zinc-500 dark:bg-zinc-800/80 dark:text-zinc-400">
        Пока нет моек
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Всего моек:{" "}
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">{total}</span>
      </p>

      <div className="space-y-3">
        {sessions.map((session) => (
          <article
            key={session.id}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {session.address ?? `Мойка #${session.location_id}`}
                </p>
                <p className="mt-0.5 font-mono text-xs tracking-wide text-zinc-500 dark:text-zinc-400">
                  {session.car_plate ?? "—"}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusTone(session.status)}`}
              >
                {session.status_ru ?? session.status ?? "—"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/70">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  Зашёл
                </p>
                <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-50">
                  {formatDateTime(session.entered_at ?? session.start_at)}
                </p>
              </div>
              <div className="rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/70">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  Вышел
                </p>
                <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-50">
                  {formatDateTime(session.exited_at ?? session.end_at)}
                </p>
              </div>
              <div className="rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/70">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  Мыли
                </p>
                <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-50">
                  {formatMinutes(session.duration_minutes)}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
