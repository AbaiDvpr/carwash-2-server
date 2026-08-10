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
import "./profile.css";
import IconActionButton, { IconEdit, IconTrash } from "./IconActionButton";

/** Только латиница A–Z и цифры 0–9. */
function normalizePlate(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 32);
}

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
        if (!cancelled) {
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          return;
        }
        setGarages([]);
        setError(errorMessage(err));
        setLoading(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [loadGarages]);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    const next = normalizePlate(plate);
    if (!next) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await createGarage({ car_plate: next });
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
    const next = normalizePlate(editPlate);
    if (!next) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await updateGarage(id, { car_plate: next });
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

      <form onSubmit={handleAdd} className="theme-input-row mb-4">
        <input
          type="text"
          inputMode="text"
          pattern="[A-Za-z0-9]*"
          value={plate}
          onChange={(e) => setPlate(normalizePlate(e.target.value))}
          placeholder="Госномер, напр. 777AAA01"
          className="theme-field min-w-0 flex-1 rounded-lg border border-zinc-200 bg-zinc-100 px-3 text-sm uppercase tracking-wide text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          maxLength={32}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          required
        />
        <button
          type="submit"
          disabled={busy}
          className="theme-button px-4 text-sm"
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
                      inputMode="text"
                      pattern="[A-Za-z0-9]*"
                      value={editPlate}
                      onChange={(e) => setEditPlate(normalizePlate(e.target.value))}
                      className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2.5 text-sm uppercase tracking-wide outline-none ring-blue-500 focus:ring-2 dark:bg-zinc-900 dark:text-zinc-50"
                      maxLength={32}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleSaveEdit(garage.id)}
                        className="theme-button rounded-xl px-3 py-2 text-xs"
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
                    <div className="flex items-center gap-0.5">
                      <IconActionButton
                        label="Изменить"
                        onClick={() => {
                          setEditingId(garage.id);
                          setEditPlate(garage.car_plate);
                        }}
                      >
                        <IconEdit />
                      </IconActionButton>
                      <IconActionButton
                        label="Удалить"
                        danger
                        disabled={busy}
                        onClick={() => void handleDelete(garage.id)}
                      >
                        <IconTrash />
                      </IconActionButton>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {message ? <p className="theme-accent-text mt-2 text-sm">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </section>
  );
}
