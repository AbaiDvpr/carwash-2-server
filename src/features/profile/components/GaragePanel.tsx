"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  createGarage,
  deleteGarage,
  fetchGarages,
  fetchPlateTypes,
  updateGarage,
  type Garage,
  type PlateType,
} from "@/lib/api/garage";
import { ApiError } from "@/lib/api";
import { useT } from "@/hooks/useT";
import "@/features/history/components/history.css";
import "./profile.css";
import IconActionButton, { IconEdit, IconTrash } from "./IconActionButton";

type CountryOption = {
  code: string;
  label: string;
  flag: string;
  plateTypeId: number;
};

const FALLBACK_COUNTRIES: CountryOption[] = [
  { code: "kz", label: "Казахстан", flag: "🇰🇿", plateTypeId: 1 },
  { code: "ru", label: "Россия", flag: "🇷🇺", plateTypeId: 3 },
  { code: "kg", label: "Кыргызстан", flag: "🇰🇬", plateTypeId: 8 },
  { code: "tj", label: "Таджикистан", flag: "🇹🇯", plateTypeId: 9 },
  { code: "am", label: "Армения", flag: "🇦🇲", plateTypeId: 4 },
  { code: "ge", label: "Грузия", flag: "🇬🇪", plateTypeId: 5 },
  { code: "cn", label: "Китай", flag: "🇨🇳", plateTypeId: 6 },
  { code: "other", label: "Другой", flag: "🌐", plateTypeId: 7 },
];

/** Только латиница A–Z и цифры 0–9. */
function normalizePlate(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 16);
}

function countriesFromTypes(types: PlateType[]): CountryOption[] {
  const seen = new Map<string, CountryOption>();
  for (const type of types) {
    if (seen.has(type.country_code)) continue;
    const fallback = FALLBACK_COUNTRIES.find((c) => c.code === type.country_code);
    seen.set(type.country_code, {
      code: type.country_code,
      label: fallback?.label ?? type.name.split("·")[0]?.trim() ?? type.country_code,
      flag: type.flag || fallback?.flag || "🌐",
      plateTypeId: type.id,
    });
  }
  return seen.size > 0 ? Array.from(seen.values()) : FALLBACK_COUNTRIES;
}

function countryForGarage(
  garage: Garage,
  countries: CountryOption[],
): CountryOption {
  const code = garage.plate_type?.country_code;
  if (code) {
    const found = countries.find((c) => c.code === code);
    if (found) return found;
  }
  if (garage.plate_type_id != null) {
    const byId = countries.find((c) => c.plateTypeId === garage.plate_type_id);
    if (byId) return byId;
  }
  return countries[0] ?? FALLBACK_COUNTRIES[0]!;
}

function apiPlateError(err: unknown, fallback: string): string {
  const body =
    err instanceof ApiError
      ? (err.body as { message?: string; errors?: Record<string, string[]> })
      : null;
  return body?.errors?.car_plate?.[0] ?? body?.message ?? fallback;
}

function RadioMark({ checked }: { checked: boolean }) {
  return (
    <span
      className={`theme-radio inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2${
        checked ? " is-on" : ""
      }`}
      aria-hidden
    >
      {checked ? (
        <span className="h-2 w-2 rounded-full bg-[var(--app-button-text)]" />
      ) : null}
    </span>
  );
}

type CountryDrawerProps = {
  countries: CountryOption[];
  value: CountryOption;
  onSelect: (country: CountryOption) => void;
  onClose: () => void;
};

/** Drawer только для выбора флага / страны. */
function CountryDrawer({
  countries,
  value,
  onSelect,
  onClose,
}: CountryDrawerProps) {
  const t = useT();
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!portalReady) return null;

  return createPortal(
    <>
      <button
        type="button"
        className="history-drawer__backdrop"
        onClick={onClose}
        aria-label={t("common.close", "Закрыть")}
      />
      <div
        className="history-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t("garage.country", "Страна номера")}
      >
        <div className="history-drawer__top">
          <button
            type="button"
            className="app-drawer-close"
            onClick={onClose}
            aria-label={t("common.close", "Закрыть")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="history-drawer__body">
          <div>
            <p className="mb-1 text-base font-semibold text-[var(--app-text)]">
              {t("garage.country", "Страна номера")}
            </p>
            <p className="text-xs text-[var(--app-description)]">
              {t("garage.country_hint", "Выберите страну госномера")}
            </p>
          </div>

          <div className="app-section overflow-hidden" role="listbox">
            {countries.map((item, index) => {
              const selected = item.code === value.code;
              return (
                <div key={item.code}>
                  {index > 0 ? (
                    <div className="border-t border-zinc-100 dark:border-zinc-800" />
                  ) : null}
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                    className="app-row w-full text-left"
                  >
                    <span className="text-xl leading-none" aria-hidden>
                      {item.flag}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium text-[var(--app-text)]">
                      {item.label}
                    </span>
                    <RadioMark checked={selected} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

type FlagButtonProps = {
  country: CountryOption;
  disabled?: boolean;
  onClick: () => void;
};

function FlagButton({ country, disabled, onClick }: FlagButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={country.label}
      className="flex h-11 items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
    >
      <span className="text-xl leading-none" aria-hidden>
        {country.flag}
      </span>
      <svg
        className="h-3.5 w-3.5 text-zinc-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

/** Гараж: drawer только при выборе флага. */
export default function GaragePanel() {
  const t = useT();
  const [countries, setCountries] = useState<CountryOption[]>(FALLBACK_COUNTRIES);
  const [garages, setGarages] = useState<Garage[]>([]);
  const [loading, setLoading] = useState(true);
  const [plate, setPlate] = useState("");
  const [countryCode, setCountryCode] = useState("kz");
  const [flagDrawerFor, setFlagDrawerFor] = useState<"add" | "edit" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPlate, setEditPlate] = useState("");
  const [editCountryCode, setEditCountryCode] = useState("kz");

  const activeCountry = useMemo(
    () =>
      countries.find((c) => c.code === countryCode) ??
      countries[0] ??
      FALLBACK_COUNTRIES[0]!,
    [countries, countryCode],
  );

  const editCountry = useMemo(
    () =>
      countries.find((c) => c.code === editCountryCode) ??
      countries[0] ??
      FALLBACK_COUNTRIES[0]!,
    [countries, editCountryCode],
  );

  const flagDrawerCountry =
    flagDrawerFor === "edit" ? editCountry : activeCountry;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [types, list] = await Promise.all([
        fetchPlateTypes().catch(() => [] as PlateType[]),
        fetchGarages(),
      ]);
      const nextCountries = countriesFromTypes(types);
      setCountries(nextCountries);
      setCountryCode((prev) =>
        nextCountries.some((c) => c.code === prev)
          ? prev
          : (nextCountries[0]?.code ?? "kz"),
      );
      setGarages(list);
      setError(null);
    } catch {
      setError(t("garage.load_error", "Не удалось загрузить гараж"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  function startEdit(garage: Garage) {
    const country = countryForGarage(garage, countries);
    setFlagDrawerFor(null);
    setEditingId(garage.id);
    setEditPlate(normalizePlate(garage.car_plate));
    setEditCountryCode(country.code);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditPlate("");
    setFlagDrawerFor(null);
  }

  function handleFlagSelect(country: CountryOption) {
    if (flagDrawerFor === "edit") {
      setEditCountryCode(country.code);
    } else {
      setCountryCode(country.code);
    }
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    const next = normalizePlate(plate);
    if (!next || busy || editingId != null) return;

    setBusy(true);
    setError(null);
    try {
      const garage = await createGarage({
        car_plate: next,
        plate_type_id: activeCountry.plateTypeId,
      });
      setGarages((prev) => [garage, ...prev]);
      setPlate("");
    } catch (err) {
      setError(apiPlateError(err, t("garage.add_error", "Не удалось добавить авто")));
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit() {
    if (editingId == null || busy) return;
    const next = normalizePlate(editPlate);
    if (!next) return;

    setBusy(true);
    setError(null);
    try {
      const updated = await updateGarage(editingId, {
        car_plate: next,
        plate_type_id: editCountry.plateTypeId,
      });
      setGarages((prev) =>
        prev.map((g) => (g.id === editingId ? updated : g)),
      );
      cancelEdit();
    } catch (err) {
      setError(
        apiPlateError(err, t("garage.save_error", "Не удалось сохранить номер")),
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: number) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteGarage(id);
      setGarages((prev) => prev.filter((g) => g.id !== id));
      if (editingId === id) cancelEdit();
    } catch {
      setError(t("garage.delete_error", "Не удалось удалить авто"));
    } finally {
      setBusy(false);
    }
  }

  const canAdd = Boolean(normalizePlate(plate)) && !busy && editingId == null;
  const canSaveEdit =
    Boolean(normalizePlate(editPlate)) && !busy && editingId != null;

  return (
    <div className="flex flex-col gap-4">
      <section className="app-section overflow-visible">
        {loading ? (
          <p className="px-3 py-8 text-center text-xs text-zinc-400">
            {t("common.loading", "Загрузка...")}
          </p>
        ) : garages.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {t("garage.empty", "Пока нет авто")}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {t("garage.empty_hint", "Добавьте госномер ниже")}
            </p>
          </div>
        ) : (
          <ul>
            {garages.map((garage, index) => {
              const country = countryForGarage(garage, countries);
              const isEditing = editingId === garage.id;

              return (
                <li key={garage.id}>
                  {index > 0 ? (
                    <div className="border-t border-zinc-100 dark:border-zinc-800" />
                  ) : null}

                  {isEditing ? (
                    <div className="space-y-2.5 px-3 py-3">
                      <div className="flex items-center gap-2">
                        <FlagButton
                          country={editCountry}
                          disabled={busy}
                          onClick={() => setFlagDrawerFor("edit")}
                        />
                        <input
                          type="text"
                          inputMode="text"
                          pattern="[A-Za-z0-9]*"
                          value={editPlate}
                          onChange={(e) =>
                            setEditPlate(normalizePlate(e.target.value))
                          }
                          autoCapitalize="characters"
                          autoCorrect="off"
                          spellCheck={false}
                          maxLength={16}
                          disabled={busy}
                          autoFocus
                          aria-label={t("garage.plate", "Госномер")}
                          className="theme-field h-11 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 font-mono text-sm font-semibold uppercase tracking-wide text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={!canSaveEdit}
                          onClick={() => void handleSaveEdit()}
                          className="theme-button flex-1 rounded-xl px-3 py-2.5 text-sm disabled:opacity-50"
                        >
                          {t("common.save", "Сохранить")}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={cancelEdit}
                          className="theme-button-secondary flex-1 rounded-xl px-3 py-2.5 text-sm disabled:opacity-50"
                        >
                          {t("common.cancel", "Отмена")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-50 text-xl leading-none dark:bg-zinc-900"
                        title={country.label}
                        aria-hidden
                      >
                        {country.flag}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[1rem] font-semibold tracking-wide text-zinc-900 dark:text-zinc-50">
                          {garage.car_plate}
                        </p>
                        <p className="truncate text-[0.8125rem] text-zinc-400">
                          {country.label}
                        </p>
                      </div>
                      <IconActionButton
                        label={t("common.edit", "Изменить")}
                        disabled={busy}
                        onClick={() => startEdit(garage)}
                      >
                        <IconEdit />
                      </IconActionButton>
                      <IconActionButton
                        label={t("common.delete", "Удалить")}
                        danger
                        disabled={busy}
                        onClick={() => void handleDelete(garage.id)}
                      >
                        <IconTrash />
                      </IconActionButton>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2.5">
        <p className="px-0.5 text-[0.8125rem] font-medium uppercase tracking-wider text-zinc-400">
          {t("garage.add", "Добавить авто")}
        </p>

        <form onSubmit={(e) => void handleAdd(e)} className="space-y-2.5">
          <div className="flex items-center gap-2">
            <FlagButton
              country={activeCountry}
              disabled={busy || editingId != null}
              onClick={() => setFlagDrawerFor("add")}
            />
            <input
              type="text"
              inputMode="text"
              pattern="[A-Za-z0-9]*"
              value={plate}
              onChange={(e) => setPlate(normalizePlate(e.target.value))}
              placeholder={t("garage.plate_example", "777AAA01")}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              maxLength={16}
              disabled={busy || editingId != null}
              aria-label={t("garage.plate", "Госномер")}
              className="theme-field h-11 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 font-mono text-sm font-semibold uppercase tracking-wide text-zinc-900 outline-none placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          <button
            type="submit"
            disabled={!canAdd}
            className="theme-button w-full rounded-xl px-4 py-3 text-sm disabled:opacity-50"
          >
            {t("garage.add_car", "Добавить авто")}
          </button>
        </form>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </p>
        ) : null}
      </section>

      {flagDrawerFor ? (
        <CountryDrawer
          countries={countries}
          value={flagDrawerCountry}
          onSelect={handleFlagSelect}
          onClose={() => setFlagDrawerFor(null)}
        />
      ) : null}
    </div>
  );
}
