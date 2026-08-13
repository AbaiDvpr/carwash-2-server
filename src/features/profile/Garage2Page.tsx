"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout";
import BackButton from "@/components/ui/BackButton";
import { ApiError } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/api/photo";
import { fetchPlateTypes, type PlateType } from "@/lib/api/garage";
import {
  createGarageV2,
  deleteGarageV2,
  fetchGaragesV2,
  fetchGarageV2PistolTypes,
  updateGarageV2,
  type GarageV2,
  type GarageV2PistolType,
  type GarageV2PowerType,
} from "@/lib/api/garageV2";
import { useT } from "@/hooks/useT";
import IconActionButton, {
  IconEdit,
  IconTrash,
} from "./components/IconActionButton";
import "./components/profile.css";

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
  { code: "uz", label: "Узбекистан", flag: "🇺🇿", plateTypeId: 10 },
  { code: "am", label: "Армения", flag: "🇦🇲", plateTypeId: 4 },
  { code: "ge", label: "Грузия", flag: "🇬🇪", plateTypeId: 5 },
  { code: "cn", label: "Китай", flag: "🇨🇳", plateTypeId: 6 },
  { code: "other", label: "Другой", flag: "🌐", plateTypeId: 7 },
];

function IconFuel() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 20.5V6.5A1.5 1.5 0 0 1 7 5h7.5A1.5 1.5 0 0 1 16 6.5v14" />
      <path strokeLinecap="round" d="M5.5 20.5h12.5M8 8.5h5.5M16 10.5h1.8a1.7 1.7 0 0 1 1.7 1.7V16a1.5 1.5 0 0 0 1.5 1.5" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 3.5 6.5 13.5H12l-1 7 6.5-10H12L13 3.5Z" />
    </svg>
  );
}

function normalizePlate(value: string): string {
  return value.replace(/[^A-Za-z0-9 ]/g, "").toUpperCase().slice(0, 12);
}

function plateForApi(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
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
  garage: GarageV2,
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

function apiErrorMessage(err: unknown, fallback: string): string {
  const body =
    err instanceof ApiError
      ? (err.body as { message?: string; errors?: Record<string, string[]> })
      : null;
  return (
    body?.errors?.pistol_type_id?.[0] ??
    body?.errors?.car_plate?.[0] ??
    body?.errors?.power_type?.[0] ??
    body?.message ??
    fallback
  );
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

function CountryDrawer({
  countries,
  value,
  onSelect,
  onClose,
}: {
  countries: CountryOption[];
  value: CountryOption;
  onSelect: (country: CountryOption) => void;
  onClose: () => void;
}) {
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
        className="app-bottom-sheet-backdrop"
        onClick={onClose}
        aria-label={t("common.close", "Закрыть")}
      />
      <div
        className="app-bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="garage2-country-title"
      >
        <div className="app-bottom-sheet__toolbar">
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

        <div className="app-bottom-sheet__body">
          <div>
            <h2 id="garage2-country-title" className="app-bottom-sheet__title">
              {t("garage.country", "Страна номера")}
            </h2>
          </div>

          <div className="garage2-country-list" role="listbox">
            {countries.map((item) => {
              const selected = item.code === value.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className="profile-nav-row"
                >
                  <span className="text-xl leading-none" aria-hidden>
                    {item.flag}
                  </span>
                  <span className="profile-nav-row__main">
                    <span className="profile-nav-row__hint">{item.label}</span>
                  </span>
                  <RadioMark checked={selected} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

function ConnectorThumb({
  type,
  selected,
  onSelect,
}: {
  type: GarageV2PistolType;
  selected: boolean;
  onSelect: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const src = resolveMediaUrl(type.photo_url);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`garage2__conn${selected ? " is-active" : ""}`}
      aria-pressed={selected}
    >
      <span className="garage2__conn-media" aria-hidden>
        {src && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" onError={() => setFailed(true)} />
        ) : (
          <span className="garage2__conn-fallback">
            <IconBolt />
          </span>
        )}
      </span>
      <span className="garage2__conn-label">{type.type}</span>
    </button>
  );
}

type Screen = "list" | "form";

export default function Garage2Page() {
  const t = useT();
  const router = useRouter();
  const [garages, setGarages] = useState<GarageV2[]>([]);
  const [pistolTypes, setPistolTypes] = useState<GarageV2PistolType[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>(FALLBACK_COUNTRIES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flagDrawerOpen, setFlagDrawerOpen] = useState(false);

  const [screen, setScreen] = useState<Screen>("list");
  const [editing, setEditing] = useState<GarageV2 | null>(null);

  const [plate, setPlate] = useState("");
  const [countryCode, setCountryCode] = useState("kz");
  const [powerType, setPowerType] = useState<GarageV2PowerType | null>(null);
  const [pistolTypeId, setPistolTypeId] = useState<number | null>(null);

  const isEdit = editing != null;

  const activeCountry = useMemo(
    () =>
      countries.find((c) => c.code === countryCode) ??
      countries[0] ??
      FALLBACK_COUNTRIES[0]!,
    [countries, countryCode],
  );

  const canSubmit = useMemo(() => {
    const clean = plateForApi(plate);
    if (clean.length < 3 || powerType == null || saving) return false;
    if (powerType === "electric" && pistolTypeId == null) return false;
    return true;
  }, [plate, powerType, pistolTypeId, saving]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, types, plateTypes] = await Promise.all([
        fetchGaragesV2(),
        fetchGarageV2PistolTypes(),
        fetchPlateTypes().catch(() => [] as PlateType[]),
      ]);
      const nextCountries = countriesFromTypes(plateTypes);
      setCountries(nextCountries);
      setCountryCode((prev) =>
        nextCountries.some((c) => c.code === prev)
          ? prev
          : (nextCountries[0]?.code ?? "kz"),
      );
      setGarages(list);
      setPistolTypes(types);
    } catch (err) {
      setError(
        apiErrorMessage(
          err,
          t("garage2.load_error", "Не удалось загрузить гараж"),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setPlate("");
    setCountryCode(countries[0]?.code ?? "kz");
    setPowerType(null);
    setPistolTypeId(null);
    setEditing(null);
    setError(null);
    setFlagDrawerOpen(false);
  }

  function openAdd() {
    resetForm();
    setScreen("form");
  }

  function openEdit(garage: GarageV2) {
    const country = countryForGarage(garage, countries);
    setEditing(garage);
    setPlate(normalizePlate(garage.car_plate));
    setCountryCode(country.code);
    setPowerType(garage.power_type);
    setPistolTypeId(garage.pistol_type_id);
    setError(null);
    setFlagDrawerOpen(false);
    setScreen("form");
  }

  function backToList() {
    if (saving) return;
    if (garages.length === 0) {
      router.push("/profile");
      return;
    }
    resetForm();
    setScreen("list");
  }

  // Пустой гараж — сразу форма добавления
  useEffect(() => {
    if (loading || saving) return;
    if (garages.length === 0 && screen === "list") {
      resetForm();
      setScreen("form");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- только реакция на пустой список
  }, [loading, garages.length, screen, saving]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || powerType == null) return;

    setSaving(true);
    setError(null);
    try {
      const input = {
        car_plate: plateForApi(plate),
        power_type: powerType,
        pistol_type_id: powerType === "electric" ? pistolTypeId : null,
        plate_type_id: activeCountry.plateTypeId,
      };

      if (isEdit && editing) {
        const garage = await updateGarageV2(editing.id, input);
        setGarages((prev) =>
          prev.map((item) => (item.id === garage.id ? garage : item)),
        );
      } else {
        const garage = await createGarageV2(input);
        setGarages((prev) => {
          const others = prev.filter((item) => item.id !== garage.id);
          return [garage, ...others];
        });
      }

      resetForm();
      setScreen("list");
    } catch (err) {
      setError(
        apiErrorMessage(err, t("garage2.save_error", "Не удалось сохранить")),
      );
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: number, after?: () => void) {
    setSaving(true);
    setError(null);
    try {
      await deleteGarageV2(id);
      const next = garages.filter((item) => item.id !== id);
      setGarages(next);
      if (next.length === 0) {
        resetForm();
        setScreen("form");
      }
      after?.();
    } catch (err) {
      setError(
        apiErrorMessage(err, t("garage2.delete_error", "Не удалось удалить")),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageLayout title={t("profile.garage2", "Гараж 2")} className="page--profile-edit">
      <div className="profile-edit garage2">
        <div className="garage2__toolbar">
          {screen === "form" ? (
            <BackButton iconOnly onClick={backToList} />
          ) : (
            <BackButton iconOnly href="/profile" />
          )}
          {screen === "form" && isEdit ? (
            <IconActionButton
              danger
              label={t("common.delete", "Удалить")}
              disabled={saving}
              onClick={() =>
                void onDelete(editing.id, () => {
                  resetForm();
                })
              }
            >
              <IconTrash />
            </IconActionButton>
          ) : null}
        </div>

        {error ? <p className="garage2__error">{error}</p> : null}

        {loading && screen === "list" ? (
          <p className="garage2__empty">{t("common.loading", "Загрузка…")}</p>
        ) : null}

        {screen === "list" && !loading ? (
          <div className="profile-edit__main space-y-4">
            <div className="profile-edit-fields">
              <p className="profile-edit-row__label">
                {t("garage2.my_cars", "Мои авто")}
              </p>
              <ul className="garage2__list">
                {garages.map((item) => {
                  const country = countryForGarage(item, countries);
                  return (
                    <li key={item.id} className="garage2__list-item">
                      <button
                        type="button"
                        className="garage2__list-main garage2__list-main--btn"
                        onClick={() => openEdit(item)}
                      >
                        <span className="garage2__list-row">
                          <span className="garage2__list-flag" aria-hidden>
                            {country.flag}
                          </span>
                          <span className="garage2__list-texts">
                            <span className="garage2__list-plate">{item.car_plate}</span>
                            <span className="garage2__list-meta">
                              {item.power_type === "electric"
                                ? item.pistol_type?.type ??
                                  t("garage2.electric", "Электро")
                                : t("garage2.fuel", "Топливо")}
                            </span>
                          </span>
                        </span>
                      </button>
                      <div className="garage2__list-actions">
                        <IconActionButton
                          label={t("common.edit", "Изменить")}
                          disabled={saving}
                          onClick={() => openEdit(item)}
                        >
                          <IconEdit />
                        </IconActionButton>
                        <IconActionButton
                          danger
                          label={t("common.delete", "Удалить")}
                          disabled={saving}
                          onClick={() => void onDelete(item.id)}
                        >
                          <IconTrash />
                        </IconActionButton>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <button type="button" className="theme-button w-full" onClick={openAdd}>
              {t("garage2.add", "Добавить")}
            </button>
          </div>
        ) : null}

        {screen === "form" ? (
          <form className="garage2__form profile-edit__main space-y-4" onSubmit={onSubmit}>
            <div className="profile-edit-fields">
              <label className="profile-edit-row">
                <span className="profile-edit-row__label">
                  {t("garage.plate", "Госномер")}
                </span>
                <div className="garage2__plate">
                  <button
                    type="button"
                    className="garage2__flag-btn"
                    disabled={saving}
                    onClick={() => setFlagDrawerOpen(true)}
                    aria-label={activeCountry.label}
                  >
                    <span className="garage2__flag" aria-hidden>
                      {activeCountry.flag}
                    </span>
                    <svg
                      className="garage2__flag-chevron"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  <input
                    type="text"
                    inputMode="text"
                    value={plate}
                    onChange={(e) => setPlate(normalizePlate(e.target.value))}
                    placeholder="111 AAA 11"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-label={t("garage.plate", "Госномер")}
                    className="garage2__plate-input"
                    autoFocus
                  />
                </div>
              </label>

              <div className="profile-edit-row">
                <p className="profile-edit-row__label">
                  {t("garage2.power_title", "Тип питания")}
                </p>
                <div
                  className="garage2__power"
                  role="radiogroup"
                  aria-label={t("garage2.power_title", "Тип питания")}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={powerType === "fuel"}
                    onClick={() => {
                      setPowerType("fuel");
                      setPistolTypeId(null);
                    }}
                    className={`garage2__power-btn${powerType === "fuel" ? " is-active" : ""}`}
                  >
                    <span className="garage2__power-icon" aria-hidden>
                      <IconFuel />
                    </span>
                    <span className="garage2__power-text">
                      <span className="garage2__power-title">
                        {t("garage2.fuel", "Топливо")}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={powerType === "electric"}
                    onClick={() => setPowerType("electric")}
                    className={`garage2__power-btn${powerType === "electric" ? " is-active" : ""}`}
                  >
                    <span className="garage2__power-icon" aria-hidden>
                      <IconBolt />
                    </span>
                    <span className="garage2__power-text">
                      <span className="garage2__power-title">
                        {t("garage2.electric", "Электро")}
                      </span>
                    </span>
                  </button>
                </div>
              </div>

              {powerType === "electric" ? (
                <div className="profile-edit-row">
                  <p className="profile-edit-row__label">
                    {t("garage2.connector_title", "Тип зарядки")}
                  </p>
                  {pistolTypes.length === 0 ? (
                    <p className="garage2__empty">
                      {t("garage2.no_connectors", "Типы зарядки пока не загружены")}
                    </p>
                  ) : (
                    <div
                      className="garage2__conns"
                      role="listbox"
                      aria-label={t("garage2.connector_title", "Тип зарядки")}
                    >
                      {pistolTypes.map((type) => (
                        <ConnectorThumb
                          key={type.id}
                          type={type}
                          selected={pistolTypeId === type.id}
                          onSelect={() => setPistolTypeId(type.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="theme-button w-full"
            >
              {saving
                ? t("common.saving", "Сохраняем…")
                : isEdit
                  ? t("common.done", "Готово")
                  : t("garage2.add", "Добавить")}
            </button>
          </form>
        ) : null}
      </div>

      {flagDrawerOpen ? (
        <CountryDrawer
          countries={countries}
          value={activeCountry}
          onSelect={(country) => setCountryCode(country.code)}
          onClose={() => setFlagDrawerOpen(false)}
        />
      ) : null}
    </PageLayout>
  );
}
