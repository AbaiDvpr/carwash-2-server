"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { fetchPlateTypes, type PlateType } from "@/lib/api/garage";
import {
  applyPlateMask,
  formatPlateDisplay,
  normalizePlate,
  plateMaxLength,
  type PlateCountryCode,
  type PlateTypeCode,
} from "@/lib/plateMask";

export type MockCar = {
  id: number;
  plate: string;
  plateTypeCode?: string;
  plateTypeId?: number | null;
  countryCode?: string;
};

type GaragePanelProps = {
  cars: MockCar[];
  onChange: (cars: MockCar[]) => void;
};

/** Fallback если API ещё не ответил */
const FALLBACK_TYPES: PlateType[] = [
  {
    id: 1,
    country_code: "kz",
    code: "kz_new",
    name: "Казахстан · новый",
    mask: "000 AAA 00",
    example: "123 ABC 01",
    flag: "🇰🇿",
    sort_order: 10,
  },
  {
    id: 2,
    country_code: "kz",
    code: "kz_old",
    name: "Казахстан · старый",
    mask: "A 000 AAA",
    example: "Z 001 AST",
    flag: "🇰🇿",
    sort_order: 20,
  },
  {
    id: 3,
    country_code: "ru",
    code: "ru",
    name: "Россия",
    mask: "A 000 AA 00",
    example: "A 123 BC 77",
    flag: "🇷🇺",
    sort_order: 30,
  },
  {
    id: 4,
    country_code: "am",
    code: "am",
    name: "Армения",
    mask: "00 AA 000",
    example: "12 AB 345",
    flag: "🇦🇲",
    sort_order: 40,
  },
  {
    id: 5,
    country_code: "ge",
    code: "ge",
    name: "Грузия",
    mask: "AA 000 AA",
    example: "AB 123 CD",
    flag: "🇬🇪",
    sort_order: 50,
  },
  {
    id: 6,
    country_code: "cn",
    code: "cn",
    name: "Китай",
    mask: "A A00000",
    example: "B A12345",
    flag: "🇨🇳",
    sort_order: 60,
  },
  {
    id: 8,
    country_code: "kg",
    code: "kg",
    name: "Кыргызстан",
    mask: "00 000 AAA",
    example: "01 123 ABC",
    flag: "🇰🇬",
    sort_order: 70,
  },
  {
    id: 9,
    country_code: "tj",
    code: "tj",
    name: "Таджикистан",
    mask: "0000 AA 00",
    example: "1234 AB 01",
    flag: "🇹🇯",
    sort_order: 80,
  },
  {
    id: 7,
    country_code: "other",
    code: "other",
    name: "Другой",
    mask: "свободный",
    example: null,
    flag: "🌐",
    sort_order: 100,
  },
];

const COUNTRY_META: {
  code: PlateCountryCode;
  label: string;
  flag: string;
}[] = [
  { code: "kz", label: "Казахстан", flag: "🇰🇿" },
  { code: "ru", label: "Россия", flag: "🇷🇺" },
  { code: "am", label: "Армения", flag: "🇦🇲" },
  { code: "ge", label: "Грузия", flag: "🇬🇪" },
  { code: "cn", label: "Китай", flag: "🇨🇳" },
  { code: "kg", label: "Кыргызстан", flag: "🇰🇬" },
  { code: "tj", label: "Таджикистан", flag: "🇹🇯" },
  { code: "other", label: "Другой", flag: "🌐" },
];

const inputClassName =
  "min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm uppercase tracking-wide text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

const selectClassName =
  "rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

export default function GaragePanel({ cars, onChange }: GaragePanelProps) {
  const [types, setTypes] = useState<PlateType[]>(FALLBACK_TYPES);
  const [country, setCountry] = useState<PlateCountryCode>("kz");
  const [typeCode, setTypeCode] = useState<string>("kz_new");
  const [plate, setPlate] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPlate, setEditPlate] = useState("");
  const [editTypeCode, setEditTypeCode] = useState<string>("kz_new");
  const [flagOpen, setFlagOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await fetchPlateTypes();
        if (!cancelled && list.length > 0) setTypes(list);
      } catch {
        // fallback локальный
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const countryTypes = useMemo(
    () => types.filter((t) => t.country_code === country),
    [types, country],
  );

  const activeType = useMemo(() => {
    return (
      types.find((t) => t.code === typeCode) ??
      countryTypes[0] ??
      types[0] ??
      FALLBACK_TYPES[0]!
    );
  }, [types, typeCode, countryTypes]);

  const countryMeta =
    COUNTRY_META.find((c) => c.code === country) ?? COUNTRY_META[0]!;

  useEffect(() => {
    if (countryTypes.length === 0) return;
    if (!countryTypes.some((t) => t.code === typeCode)) {
      setTypeCode(countryTypes[0]!.code);
      setPlate("");
    }
  }, [country, countryTypes, typeCode]);

  function handleCountryChange(next: PlateCountryCode) {
    setCountry(next);
    setFlagOpen(false);
    const first = types.find((t) => t.country_code === next);
    if (first) {
      setTypeCode(first.code);
      setPlate((prev) => applyPlateMask(first.code, prev));
    }
  }

  function handleTypeChange(code: string) {
    setTypeCode(code);
    setPlate((prev) => applyPlateMask(code, prev));
  }

  function handlePlateChange(value: string, forEdit = false) {
    const code = forEdit ? editTypeCode : typeCode;
    const next = applyPlateMask(code, value);
    if (forEdit) setEditPlate(next);
    else setPlate(next);
  }

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    const next = normalizePlate(plate);
    if (!next) return;
    onChange([
      ...cars,
      {
        id: Date.now(),
        plate: next,
        plateTypeCode: activeType.code,
        plateTypeId: activeType.id,
        countryCode: activeType.country_code,
      },
    ]);
    setPlate("");
  }

  function handleSave(id: number) {
    const next = normalizePlate(editPlate);
    if (!next) return;
    const type = types.find((t) => t.code === editTypeCode);
    onChange(
      cars.map((car) =>
        car.id === id
          ? {
              ...car,
              plate: next,
              plateTypeCode: editTypeCode,
              plateTypeId: type?.id ?? car.plateTypeId,
              countryCode: type?.country_code ?? car.countryCode,
            }
          : car,
      ),
    );
    setEditingId(null);
  }

  function handleDelete(id: number) {
    onChange(cars.filter((car) => car.id !== id));
    if (editingId === id) setEditingId(null);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          Страна номера
        </p>
        <div className="relative">
          <button
            type="button"
            onClick={() => setFlagOpen((v) => !v)}
            className="flex w-full items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-sm dark:border-zinc-700 dark:bg-zinc-950"
            aria-expanded={flagOpen}
            aria-haspopup="listbox"
          >
            <span className="text-lg leading-none" aria-hidden>
              {countryMeta.flag}
            </span>
            <span className="min-w-0 flex-1 font-medium text-zinc-900 dark:text-zinc-50">
              {countryMeta.label}
            </span>
            <span className="text-xs text-zinc-400">{activeType.mask}</span>
            <svg
              className="h-4 w-4 text-zinc-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {flagOpen ? (
            <ul
              role="listbox"
              className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-950"
            >
              {COUNTRY_META.map((item) => (
                <li key={item.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={country === item.code}
                    onClick={() => handleCountryChange(item.code)}
                    className={[
                      "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900",
                      country === item.code
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                        : "text-zinc-800 dark:text-zinc-100",
                    ].join(" ")}
                  >
                    <span className="text-lg leading-none" aria-hidden>
                      {item.flag}
                    </span>
                    <span className="flex-1 font-medium">{item.label}</span>
                    <span className="text-[10px] uppercase text-zinc-400">
                      {item.code}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {countryTypes.length > 1 ? (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            Тип маски
          </p>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
            {countryTypes.map((item) => {
              const active = typeCode === item.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleTypeChange(item.code)}
                  className={[
                    "rounded-lg px-2 py-2 text-xs font-semibold transition",
                    active
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
                  ].join(" ")}
                >
                  {item.code === "kz_new"
                    ? "Новый"
                    : item.code === "kz_old"
                      ? "Старый"
                      : item.name}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-zinc-400">
            Пример: {activeType.example ?? "любой формат"} · маска{" "}
            <span className="font-mono">{activeType.mask}</span>
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-zinc-400">
          {activeType.code === "other"
            ? "Свободный ввод — без маски."
            : `Маска: ${activeType.mask}${activeType.example ? ` · пример ${activeType.example}` : ""}`}
        </p>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <div className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
          <span
            className="flex items-center border-r border-zinc-200 bg-zinc-50 px-2.5 text-base dark:border-zinc-700 dark:bg-zinc-900"
            aria-hidden
          >
            {countryMeta.flag}
          </span>
          <input
            type="text"
            value={plate}
            onChange={(e) => handlePlateChange(e.target.value)}
            placeholder={activeType.example ?? activeType.mask}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={plateMaxLength(activeType.code)}
            className="min-w-0 flex-1 border-0 bg-white px-3 py-2 text-sm uppercase tracking-wide text-zinc-900 outline-none dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>
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
            const carType =
              types.find((t) => t.code === (car.plateTypeCode ?? "kz_new")) ??
              types[0];
            return (
              <li key={car.id} className="px-3 py-2.5">
                {isEditing ? (
                  <div className="space-y-2">
                    <select
                      value={editTypeCode}
                      onChange={(e) => {
                        setEditTypeCode(e.target.value);
                        setEditPlate((prev) =>
                          applyPlateMask(e.target.value, prev),
                        );
                      }}
                      className={`w-full ${selectClassName}`}
                    >
                      {types.map((t) => (
                        <option key={t.code} value={t.code}>
                          {t.flag} {t.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editPlate}
                        onChange={(e) => handlePlateChange(e.target.value, true)}
                        placeholder={
                          types.find((t) => t.code === editTypeCode)?.example ??
                          "Госномер"
                        }
                        maxLength={plateMaxLength(editTypeCode)}
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        className={inputClassName}
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
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-sm tracking-wide text-zinc-900 dark:text-zinc-50">
                        <span className="mr-1.5" aria-hidden>
                          {carType?.flag ?? "🚗"}
                        </span>
                        {formatPlateDisplay(
                          car.plate,
                          (car.plateTypeCode as PlateTypeCode) ?? "kz_new",
                        )}
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-400">
                        {carType?.name ?? "Номер"}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(car.id);
                          setEditTypeCode(car.plateTypeCode ?? "kz_new");
                          setEditPlate(
                            formatPlateDisplay(
                              car.plate,
                              car.plateTypeCode ?? "kz_new",
                            ),
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
