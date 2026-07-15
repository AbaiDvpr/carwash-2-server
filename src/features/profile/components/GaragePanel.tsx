"use client";

import { FormEvent, useState } from "react";

export type MockCar = {
  id: number;
  plate: string;
};

type GaragePanelProps = {
  cars: MockCar[];
  onChange: (cars: MockCar[]) => void;
};

export default function GaragePanel({ cars, onChange }: GaragePanelProps) {
  const [plate, setPlate] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPlate, setEditPlate] = useState("");

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    const next = plate.trim().toUpperCase();
    if (!next) return;
    onChange([...cars, { id: Date.now(), plate: next }]);
    setPlate("");
  }

  function handleSave(id: number) {
    const next = editPlate.trim().toUpperCase();
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
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={plate}
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
          placeholder="Госномер"
          maxLength={32}
          className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm uppercase tracking-wide text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
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
                      onChange={(e) => setEditPlate(e.target.value.toUpperCase())}
                      maxLength={32}
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
                      {car.plate}
                    </p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(car.id);
                          setEditPlate(car.plate);
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
