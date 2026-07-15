"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  createGarage,
  deleteGarage,
  fetchGarages,
  type Garage,
  updateGarage,
} from "@/lib/api/garage";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as
      | { message?: string; errors?: Record<string, string[]> }
      | null;
    if (body?.errors) {
      const first = Object.values(body.errors)[0];
      if (first?.[0]) return first[0];
    }
    if (body?.message) return body.message;
  }
  if (err instanceof Error) return err.message;
  return "Что-то пошло не так";
}

export default function GarageSection() {
  const [loading, setLoading] = useState(true);
  const [garages, setGarages] = useState<Garage[]>([]);
  const [plate, setPlate] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPlate, setEditPlate] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadGarages = useCallback(async () => {
    const list = await fetchGarages();
    setGarages(list);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        await loadGarages();
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) {
          setGarages([]);
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
  }, [loadGarages]);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!plate.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await createGarage(plate.trim());
      setPlate("");
      await loadGarages();
      setMessage("Авто добавлено");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit(id: number) {
    if (!editPlate.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await updateGarage(id, editPlate.trim());
      setEditingId(null);
      await loadGarages();
      setMessage("Авто обновлено");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Удалить это авто из гаража?")) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await deleteGarage(id);
      await loadGarages();
      setMessage("Авто удалено");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section>
        <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">Гараж</h2>
        <div className="h-24 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
      </section>
    );
  }

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-2">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Гараж</h2>
        <span className="text-xs text-zinc-400">{garages.length} авто</span>
      </div>

      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input
          type="text"
          value={plate}
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
          placeholder="Госномер, напр. 777AAA01"
          className="min-w-0 flex-1 rounded-xl bg-zinc-100 px-4 py-3.5 text-sm uppercase tracking-wide text-zinc-900 outline-none ring-blue-500 focus:bg-white focus:ring-2 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:bg-zinc-900"
          maxLength={32}
          required
        />
        <button
          type="submit"
          disabled={busy}
          className="shrink-0 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          Добавить
        </button>
      </form>

      {garages.length === 0 ? (
        <p className="rounded-2xl bg-zinc-100 px-4 py-6 text-center text-sm text-zinc-500 dark:bg-zinc-800/80 dark:text-zinc-400">
          Пока нет авто — добавьте первый госномер
        </p>
      ) : (
        <ul className="space-y-2">
          {garages.map((garage) => {
            const isEditing = editingId === garage.id;
            return (
              <li
                key={garage.id}
                className="rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800/80"
              >
                {isEditing ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={editPlate}
                      onChange={(e) => setEditPlate(e.target.value.toUpperCase())}
                      className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2.5 text-sm uppercase tracking-wide outline-none ring-blue-500 focus:ring-2 dark:bg-zinc-900 dark:text-zinc-50"
                      maxLength={32}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleSaveEdit(garage.id)}
                        className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                      >
                        Сохранить
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-base font-semibold tracking-wide text-zinc-900 dark:text-zinc-50">
                        {garage.car_plate}
                      </p>
                      <p className="text-xs text-zinc-400">ID #{garage.id}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(garage.id);
                          setEditPlate(garage.car_plate);
                        }}
                        className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDelete(garage.id)}
                        className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {message ? <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </section>
  );
}
