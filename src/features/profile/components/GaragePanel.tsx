"use client";

import { FormEvent, useState } from "react";
import {
  applyKzPlateMask,
  formatPlateDisplay,
  normalizePlate,
} from "@/lib/plateMask";

export type MockCar = {
  id: number;
  plate: string;
};

type PlateInputMode = "masked" | "free";

type GaragePanelProps = {
  cars: MockCar[];
  onChange: (cars: MockCar[]) => void;
};

const inputClassName =
  "min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm uppercase tracking-wide text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

function ModeTabs({
  mode,
  onChange,
}: {
  mode: PlateInputMode;
  onChange: (mode: PlateInputMode) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => onChange("masked")}
        className={[
          "rounded-lg px-2 py-2 text-xs font-semibold transition",
          mode === "masked"
            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
            : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
        ].join(" ")}
      >
        С маской
      </button>
      <button
        type="button"
        onClick={() => onChange("free")}
        className={[
          "rounded-lg px-2 py-2 text-xs font-semibold transition",
          mode === "free"
            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
            : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
        ].join(" ")}
      >
        Без маски
      </button>
    </div>
  );
}

export default function GaragePanel({ cars, onChange }: GaragePanelProps) {
  const [mode, setMode] = useState<PlateInputMode>("masked");
  const [plate, setPlate] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPlate, setEditPlate] = useState("");

  function handlePlateChange(value: string, forEdit = false) {
    const next = mode === "masked" ? applyKzPlateMask(value) : value.toUpperCase();
    if (forEdit) setEditPlate(next);
    else setPlate(next);
  }

  function handleModeChange(nextMode: PlateInputMode) {
    setMode(nextMode);
    if (nextMode === "masked") {
      setPlate((prev) => applyKzPlateMask(prev));
      setEditPlate((prev) => applyKzPlateMask(prev));
    } else {
      setPlate((prev) => normalizePlate(prev));
      setEditPlate((prev) => normalizePlate(prev));
    }
  }

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    const next = normalizePlate(plate);
    if (!next) return;
    onChange([...cars, { id: Date.now(), plate: next }]);
    setPlate("");
  }

  function handleSave(id: number) {
    const next = normalizePlate(editPlate);
    if (!next) return;
    onChange(cars.map((car) => (car.id === id ? { ...car, plate: next } : car)));
    setEditingId(null);
  }

  function handleDelete(id: number) {
    onChange(cars.filter((car) => car.id !== id));
    if (editingId === id) setEditingId(null);
  }

  return (
    <div className="space-y-3">
      <ModeTabs mode={mode} onChange={handleModeChange} />

      <p className="text-[11px] leading-relaxed text-zinc-400">
        {mode === "masked"
          ? "Маска KZ: 000 AA 00 или 000 AAA 00 (регион в конце). Сравни, удобно ли."
          : "Свободный ввод — любой формат номера, без ограничений маски."}
      </p>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={plate}
          onChange={(e) => handlePlateChange(e.target.value)}
          placeholder={mode === "masked" ? "000 AAA 00" : "Госномер"}
          inputMode={mode === "masked" ? "text" : "text"}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={mode === "masked" ? 12 : 32}
          className={inputClassName}
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
        >
          Добавить
        </button>
      </form>

      {cars.length === 0 ? (
        <p className="py-6 text-center text-xs text-zinc-400">Пока нет авто</p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {cars.map((car) => {
            const isEditing = editingId === car.id;
            return (
              <li key={car.id} className="px-3 py-2.5">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editPlate}
                      onChange={(e) => handlePlateChange(e.target.value, true)}
                      placeholder={mode === "masked" ? "000 AAA 00" : "Госномер"}
                      maxLength={mode === "masked" ? 12 : 32}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm uppercase outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                    <button
                      type="button"
                      onClick={() => handleSave(car.id)}
                      className="text-xs font-medium text-blue-600"
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-xs text-zinc-400"
                    >
                      Отмена
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-sm tracking-wide text-zinc-900 dark:text-zinc-50">
                      {formatPlateDisplay(car.plate)}
                    </p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(car.id);
                          setEditPlate(
                            mode === "masked"
                              ? formatPlateDisplay(car.plate)
                              : car.plate,
                          );
                        }}
                        className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(car.id)}
                        className="text-xs text-red-500 hover:text-red-600"
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
    </div>
  );
}
