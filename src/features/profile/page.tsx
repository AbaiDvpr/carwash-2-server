"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout";
import { formatPhoneDisplay, useAuthUser } from "@/hooks/useAuthUser";
import { openBrowser } from "@/lib/browserController";
import { copyText } from "@/lib/clipboardController";
import { openTelegram, openWhatsApp } from "@/lib/messengerController";
import { useAppSelector } from "@/store/hooks";
import { useLocale, useT } from "@/hooks/useT";
import EditAccountPage from "./EditAccountPage";
import Garage2Page from "./Garage2Page";
import SelectCityPage from "./SelectCityPage";
import SelectLanguagePage, { LANGUAGE_OPTIONS } from "./SelectLanguagePage";
import AppBackButton from "@/components/ui/AppBackButton";
import { useBackButtonStyle } from "@/hooks/useBackButtonStyle";
import {
  BACK_BUTTON_STYLE_OPTIONS,
  type BackButtonStyle,
} from "@/lib/backButtonStyle";
import Toast from "@/components/ui/Toast";
import { useTheme } from "@/hooks/useTheme";
import { useThemePalette } from "@/hooks/useThemePalette";
import { useThemeLayout } from "@/hooks/useThemeLayout";
import { useToast } from "@/hooks/useToast";
import type { AppTheme } from "@/lib/theme";
import type { ThemeMode } from "@/lib/themeColors";
import { isHexColor, PALETTE_FIELD_META } from "@/lib/themeColors";
import {
  LAYOUT_FIELD_META,
  LAYOUT_GROUP_HINTS,
  LAYOUT_GROUP_LABELS,
  formatLayoutValue,
  parseLayoutNumber,
  type LayoutFieldGroup,
  type LayoutUnit,
} from "@/lib/themeLayout";
import { useUserCity } from "@/hooks/useUserCity";
import { fetchGaragesV2 } from "@/lib/api/garageV2";
import { fetchUserInfo, type AuthUser } from "@/lib/api/auth";
import { useEditProfile } from "./hooks/useEditProfile";
import { usePromoCode } from "./hooks/usePromoCode";
import { hasAccessToken } from "@/lib/authToken";
import { usePushNotifications } from "./hooks/usePushNotifications";
import { useUserBalance, formatBalance } from "./hooks/useUserBalance";
import BalanceTopUp from "./components/BalanceTopUp";
import AvatarCropper from "./components/AvatarCropper";
import IconActionButton, {
  IconCheck,
  IconCopy,
} from "./components/IconActionButton";
import ProfileNavRow from "./components/ProfileNavRow";
import FaqSection from "./components/FaqSection";
import { resolveMediaUrl, uploadUserPhoto } from "@/lib/api/photo";
import { pickImage } from "@/lib/pickImage";
import "./components/profile.css";
import "@/features/history/components/history.css";

type ProfileView =
  | "home"
  | "balance"
  | "edit"
  | "city"
  | "language"
  | "garage2"
  | "promo"
  | "support"
  | "appearance";

const THEME_OPTIONS: { id: AppTheme; label: string; hint: string }[] = [
  { id: "light", label: "Тема", hint: "Светлая" },
  { id: "dark", label: "Тема", hint: "Тёмная" },
];

function SectionCard({ children }: { children: ReactNode }) {
  return <section className="profile-card">{children}</section>;
}

/** Разделы экрана «Оформление» — меню слева по смыслу */
type AppearanceSection =
  | "menu"
  | "theme"
  | "text"
  | "rows"
  | "page"
  | "buttons"
  | "shape"
  | "back";

const APPEARANCE_MENU: {
  id: Exclude<AppearanceSection, "menu">;
  label: string;
  hint: string;
  /** Длинное описание под меню (не в строке — там короткий hint как в профиле) */
  description: string;
}[] = [
  {
    id: "theme",
    label: "Тема и цвета",
    hint: "Палитра",
    description: "Светлая / тёмная тема и цвета интерфейса",
  },
  {
    id: "text",
    label: "Текст",
    hint: "Размер",
    description: "Базовый rem, межстрочный интервал и превью размеров",
  },
  {
    id: "rows",
    label: "Боковые пункты",
    hint: "Отступы",
    description: "Отступы строк меню: иконка, подпись, высота",
  },
  {
    id: "page",
    label: "Страница",
    hint: "Поля",
    description: "Отступы экрана слева / справа / сверху / снизу",
  },
  {
    id: "buttons",
    label: "Кнопки",
    hint: "Стиль",
    description: "Скругление и padding кнопок",
  },
  {
    id: "shape",
    label: "Скругления и рамки",
    hint: "Карточки",
    description: "Радиус карточек и толщина границ",
  },
  {
    id: "back",
    label: "Кнопка назад",
    hint: "3 варианта",
    description: "Как показывать «Назад» в профиле и разделах",
  },
];

const APPEARANCE_LAYOUT_GROUPS: Record<
  Exclude<AppearanceSection, "menu" | "theme" | "back">,
  LayoutFieldGroup[]
> = {
  text: ["text"],
  rows: ["row"],
  page: ["page"],
  buttons: ["button"],
  shape: ["radius", "border"],
};

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="profile-card__balance-label mb-1.5 px-0.5 uppercase tracking-wider">
      {children}
    </p>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="8" r="3.25" />
      <path strokeLinecap="round" d="M5.5 19.5c1.6-3.2 4-4.75 6.5-4.75s4.9 1.55 6.5 4.75" />
    </svg>
  );
}
function IconPin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.25" />
    </svg>
  );
}
function IconLang() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="8.25" />
      <path strokeLinecap="round" d="M3.5 12h17M12 3.75c2.4 2.6 3.6 5.4 3.6 8.25S14.4 17.65 12 20.25M12 3.75C9.6 6.35 8.4 9.15 8.4 12s1.2 5.9 3.6 8.25" />
    </svg>
  );
}
function IconPalette() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" d="M12 4.5a7.5 7.5 0 1 0 0 15h1.4a2.1 2.1 0 0 0 0-4.2h-.7a1.4 1.4 0 0 1 0-2.8H14a3.5 3.5 0 0 0 0-7H12Z" />
      <circle cx="8.2" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="10.8" cy="7.6" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.2" cy="7.6" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconTheme() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5A6.5 6.5 0 0 1 12 3.5Z"
      />
    </svg>
  );
}
function IconBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" d="M6.5 16.5h11M8 16.5V10a4 4 0 1 1 8 0v6.5M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}
function IconCar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 15.5h16l-1.2-4.2A2 2 0 0 0 16.9 10H7.1a2 2 0 0 0-1.9 1.3L4 15.5Z" />
      <path strokeLinecap="round" d="M6.5 15.5v2M17.5 15.5v2M7.5 10l1-3h7l1 3" />
      <circle cx="7.5" cy="17.5" r="1.25" />
      <circle cx="16.5" cy="17.5" r="1.25" />
    </svg>
  );
}
function IconHistory() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.6 12a7.4 7.4 0 1 0 2.2-5.3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.6 4.8v3.6H8.2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.2V12l2.6 1.6" />
    </svg>
  );
}
function IconTag() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 12.5 12 4h6.5V10.5L10.5 20.5 3.5 12.5Z" />
      <circle cx="16" cy="8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 17.5 4 20l3-1.2A8.5 8.5 0 1 0 5 17.5Z" />
    </svg>
  );
}
function IconMoreDots() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5.5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="18.5" r="1.7" />
    </svg>
  );
}

/** Круглый radio-индикатор в списках выбора */
function RadioMark({ checked, busy = false }: { checked: boolean; busy?: boolean }) {
  return (
    <span
      className={[
        "theme-radio relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
        checked ? "is-on" : "",
        busy ? "opacity-60" : "",
      ].join(" ")}
      aria-hidden
    >
      {busy ? (
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white/80" />
      ) : checked ? (
        <span className="h-2 w-2 rounded-full bg-[var(--app-button-text)]" />
      ) : null}
    </span>
  );
}

function BackBar({
  onBack,
  title,
}: {
  onBack: () => void;
  title?: string;
}) {
  return (
    <div className="app-back-bar">
      <AppBackButton onClick={onBack} title={title} />
    </div>
  );
}

function PaletteColorRow({
  label,
  hint,
  cssVars,
  uses,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  cssVars: string[];
  uses: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <div
      className="theme-hover"
      style={{
        padding: "var(--app-row-pad-y) var(--app-row-pad-x)",
      }}
    >
      <div className="flex items-start" style={{ gap: "var(--app-row-gap)" }}>
        <label
          className="relative mt-0.5 h-10 w-10 shrink-0 overflow-hidden border shadow-sm"
          style={{
            borderRadius: "var(--app-button-radius)",
            borderColor: "var(--app-border)",
            borderWidth: "var(--app-border-width)",
          }}
        >
          <span
            className="absolute inset-0"
            style={{ backgroundColor: value }}
            aria-hidden
          />
          <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={label}
          />
        </label>
        <div className="profile-nav-row__main min-w-0 flex-1">
          <p className="profile-nav-row__label">{label}</p>
          <p className="profile-nav-row__hint">{hint}</p>
          <p
            className="mt-1.5 px-2 py-1.5 leading-relaxed"
            style={{
              borderRadius: "var(--app-section-radius-sm)",
              backgroundColor: "color-mix(in oklab, var(--app-button) 8%, transparent)",
              color: "var(--app-description)",
              fontSize: "var(--app-text-xs)",
            }}
          >
            <span className="font-semibold" style={{ color: "var(--app-button)" }}>
              Где применяется:{" "}
            </span>
            {uses}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {cssVars.map((cssVar) => (
              <code
                key={cssVar}
                className="px-1.5 py-0.5 font-mono"
                style={{
                  borderRadius: "var(--app-button-radius)",
                  backgroundColor: "var(--app-hover)",
                  color: "var(--app-button)",
                  fontSize: "var(--app-text-xs)",
                }}
              >
                {cssVar}
              </code>
            ))}
          </div>
        </div>
        <input
          type="text"
          value={draft}
          onChange={(event) => {
            const next = event.target.value.trim();
            setDraft(next);
            if (isHexColor(next)) onChange(next.toLowerCase());
            else if (isHexColor(`#${next}`)) onChange(`#${next}`.toLowerCase());
          }}
          onBlur={() => setDraft(value)}
          spellCheck={false}
          className="theme-field w-[7.25rem] shrink-0 font-mono uppercase outline-none"
          style={{
            borderRadius: "var(--app-button-radius)",
            borderWidth: "var(--app-border-width)",
            borderStyle: "solid",
            borderColor: "var(--app-border)",
            background: "var(--app-block)",
            color: "var(--app-text)",
            padding: "0.35rem 0.5rem",
            fontSize: "var(--app-text-sm)",
          }}
          aria-label={`${label} hex`}
        />
      </div>
    </div>
  );
}

function LayoutSpacingRow({
  label,
  hint,
  cssVar,
  uses,
  value,
  unit,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  hint: string;
  cssVar: string;
  uses: string;
  value: string;
  unit: LayoutUnit;
  min: number;
  max: number;
  step: number;
  onChange: (cssValue: string) => void;
}) {
  const numeric = parseLayoutNumber(value);
  const unitLabel = unit === "" ? "×" : unit;

  return (
    <div
      className="theme-hover"
      style={{
        padding: "var(--app-row-pad-y) var(--app-row-pad-x)",
      }}
    >
      <div
        className="flex items-start justify-between"
        style={{ gap: "var(--app-row-gap)" }}
      >
        <div className="profile-nav-row__main min-w-0 flex-1">
          <p className="profile-nav-row__label">{label}</p>
          <p className="profile-nav-row__hint">{value}</p>
          <p
            className="mt-1"
            style={{
              color: "var(--app-description)",
              fontSize: "var(--app-text-sm)",
              lineHeight: 1.35,
            }}
          >
            {hint}
          </p>
          <p
            className="mt-1.5 px-2 py-1.5 leading-relaxed"
            style={{
              borderRadius: "var(--app-section-radius-sm)",
              backgroundColor: "color-mix(in oklab, var(--app-button) 8%, transparent)",
              color: "var(--app-description)",
              fontSize: "var(--app-text-xs)",
            }}
          >
            <span className="font-semibold" style={{ color: "var(--app-button)" }}>
              Где применяется:{" "}
            </span>
            {uses}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <code
              className="px-1.5 py-0.5 font-mono"
              style={{
                borderRadius: "var(--app-button-radius)",
                backgroundColor: "var(--app-hover)",
                color: "var(--app-button)",
                fontSize: "var(--app-text-xs)",
              }}
            >
              {cssVar}
            </code>
            <span
              className="px-1.5 py-0.5 font-mono font-semibold uppercase"
              style={{
                borderRadius: "var(--app-button-radius)",
                backgroundColor: "var(--app-hover)",
                color: "var(--app-description)",
                fontSize: "var(--app-text-xs)",
              }}
            >
              {unitLabel}
            </span>
          </div>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={numeric}
        onChange={(event) =>
          onChange(formatLayoutValue(Number(event.target.value), unit))
        }
        className="mt-3 w-full accent-[var(--app-button)]"
        aria-label={label}
      />
    </div>
  );
}

export default function ProfilePage() {
  const {
    name,
    phone,
    photoUrl,
    loading: profileLoading,
    mounted,
  } = useAuthUser();
  const support = useAppSelector((state) => state.variables.support);
  const documents = useAppSelector((state) => state.variables.documents);
  const [referralUser, setReferralUser] = useState<AuthUser | null>(null);

  const hasReferrer = Boolean(referralUser?.has_referrer);
  const myReferralCode = referralUser?.referral_code ?? "—";
  const clientsCount = referralUser?.referral_clients_count ?? 0;

  const syncReferralUser = useCallback((user: AuthUser) => {
    setReferralUser(user);
  }, []);

  const {
    promoCode,
    promoMessage,
    promoError,
    busy: promoBusy,
    applyPromo,
    updatePromoCode,
  } = usePromoCode({
    hasReferrer,
    onApplied: syncReferralUser,
  });
  const {
    pushEnabled,
    loading: pushLoading,
    saving: pushSaving,
    togglePush,
    hint: pushHint,
  } = usePushNotifications();
  const profileEdit = useEditProfile();
  const {
    balance,
    loading: balanceLoading,
    refresh: refreshBalance,
  } = useUserBalance();
  const { theme, isDark, setTheme, toggleTheme, mounted: themeMounted } = useTheme();
  const { palettes, setField, reset: resetPalette } = useThemePalette();
  const {
    layout,
    setField: setLayoutField,
    reset: resetLayout,
  } = useThemeLayout();
  const { style: backStyle, setStyle: setBackStyle } = useBackButtonStyle();
  const locale = useLocale();
  const t = useT();
  const languageHint =
    LANGUAGE_OPTIONS.find((lang) => lang.id === locale)?.label ?? "Русский";
  const [editPaletteMode, setEditPaletteMode] = useState<ThemeMode>("light");
  const [appearanceSection, setAppearanceSection] =
    useState<AppearanceSection>("menu");
  const { message: toastMessage, showToast } = useToast();
  const { cityName } = useUserCity();

  const [view, setView] = useState<ProfileView>("home");
  const [copied, setCopied] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [avatarReady, setAvatarReady] = useState(false);
  const [garageCount, setGarageCount] = useState<number | null>(null);

  const avatarSrc = resolveMediaUrl(photoUrl);
  const bootLoading = !mounted || profileLoading;
  const heroPhotoLoading = Boolean(avatarSrc) && !avatarReady;

  const garageHint =
    garageCount == null
      ? "…"
      : garageCount === 0
        ? t("garage2.empty_short", "Нет авто")
        : t("garage2.count", "{{n}} авто").replace("{{n}}", String(garageCount));

  useEffect(() => {
    if (view !== "home" || !hasAccessToken()) return;
    let cancelled = false;
    void fetchGaragesV2()
      .then((list) => {
        if (!cancelled) setGarageCount(list.length);
      })
      .catch(() => {
        if (!cancelled) setGarageCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [view]);

  useEffect(() => {
    if (!avatarSrc) {
      setAvatarReady(true);
      return;
    }
    setAvatarReady(false);
    const img = new window.Image();
    let active = true;
    img.onload = () => {
      if (active) setAvatarReady(true);
    };
    img.onerror = () => {
      if (active) setAvatarReady(true);
    };
    img.src = avatarSrc;
    if (img.complete) setAvatarReady(true);
    return () => {
      active = false;
    };
  }, [avatarSrc]);

  useEffect(() => {
    if (!hasAccessToken()) return;
    let cancelled = false;
    void fetchUserInfo()
      .then((user) => {
        if (!cancelled) setReferralUser(user);
      })
      .catch(() => {
        /* gate handles auth */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = mounted ? name || "…" : "…";
  const displayPhone = mounted
    ? phone
      ? formatPhoneDisplay(phone)
      : t("profile.not_selected", "Не указан")
    : "…";
  const firstName =
    (profileEdit.firstName || displayName.split(/\s+/)[0] || "").trim() || "…";
  const initials = mounted
    ? displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || "?"
    : "…";

  async function handlePickPhoto() {
    try {
      const dataUrl = await pickImage();
      setCropSrc(dataUrl);
    } catch (err) {
      if (err instanceof Error && (err.message === "cancelled" || err.message === "timeout")) {
        return;
      }
      showToast("Не удалось выбрать фото");
    }
  }

  async function handleCroppedPhoto(blob: Blob) {
    setPhotoBusy(true);
    try {
      await uploadUserPhoto(blob, "avatar.jpg");
      setCropSrc(null);
      showToast("Фото сохранено");
    } catch {
      showToast("Не удалось загрузить фото");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleCopyReferral() {
    const text = myReferralCode && myReferralCode !== "—" ? myReferralCode : "";
    if (!text) return;
    const ok = await copyText(text);
    if (!ok) {
      showToast(t("profile.copy_error", "Не удалось скопировать"));
      return;
    }
    setCopied(true);
    showToast(t("profile.copied", "Скопировано"));
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <PageLayout
      title="Profile"
      description="Профиль пользователя CarWash"
      className={view === "edit" ? "page--profile-edit" : undefined}
    >
      <>
        {view === "home" && bootLoading ? (
          <div className="profile-boot" role="status" aria-live="polite">
            <div className="profile-boot__avatar" aria-hidden>
              <span className="profile-boot__spinner" />
            </div>
            <p className="profile-boot__title">
              {t("common.loading", "Загрузка...")}
            </p>
            <p className="profile-boot__hint">
              {t("profile.loading_hint", "Загружаем профиль")}
            </p>
            <div className="profile-boot__cards" aria-hidden>
              <div className="profile-boot__card" />
              <div className="profile-boot__card" />
              <div className="profile-boot__card profile-boot__card--short" />
            </div>
          </div>
        ) : null}

        {view === "home" && !bootLoading ? (
          <div className="profile-home">
            <header className="profile-hero">
              <div className="profile-hero__avatar-wrap">
                {avatarSrc ? (
                  <span className="profile-hero__avatar-frame">
                    {heroPhotoLoading ? (
                      <span className="profile-avatar-shimmer profile-hero__avatar" aria-hidden />
                    ) : null}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatarSrc}
                      alt=""
                      onLoad={() => setAvatarReady(true)}
                      onError={() => setAvatarReady(true)}
                      className={`profile-hero__avatar${
                        heroPhotoLoading ? " profile-hero__avatar--loading" : ""
                      }`}
                    />
                  </span>
                ) : (
                  <span className="profile-hero__avatar profile-hero__avatar--fallback">
                    {initials}
                  </span>
                )}
                <button
                  type="button"
                  className="profile-hero__camera"
                  disabled={photoBusy || heroPhotoLoading}
                  onClick={() => void handlePickPhoto()}
                  aria-label={
                    photoUrl
                      ? t("profile.change_photo", "Изменить фото")
                      : t("profile.add_photo", "Добавить фото")
                  }
                >
                  {photoBusy || heroPhotoLoading ? (
                    <span className="profile-boot__spinner profile-boot__spinner--sm" />
                  ) : (
                    <IconMoreDots />
                  )}
                </button>
              </div>

              <h1 className="profile-hero__hello">
                {t("profile.hello", "Здравствуйте")}, {firstName}!
              </h1>
            </header>

            <section className="profile-card">
              <div className="profile-card__balance">
                <div className="profile-card__balance-item">
                  <Link
                    href="/profile/top-up"
                    className="profile-card__balance-link"
                    aria-label={t("profile.top_up", "Пополнить баланс")}
                  >
                    <span className="min-w-0 flex-1">
                      <p className="profile-card__balance-label">
                        {t("home.balance", "Баланс")}
                      </p>
                      <p className="profile-card__balance-value">
                        {balanceLoading && balance == null
                          ? "…"
                          : formatBalance(balance ?? 0)}
                      </p>
                    </span>
                    <span className="profile-card__balance-action">
                      {t("profile.top_up_short", "Пополнить")}
                    </span>
                  </Link>
                </div>
                <div className="profile-card__balance-item">
                  <button
                    type="button"
                    className="profile-card__balance-link"
                    aria-label={t("profile.edit", "Редактирование профиля")}
                    onClick={() => setView("edit")}
                  >
                    <span className="min-w-0 flex-1">
                      <p className="profile-card__balance-label">
                        {t("profile.phone", "Телефон")}
                      </p>
                      <p className="profile-card__balance-value">{displayPhone}</p>
                    </span>
                    <span className="profile-card__balance-action">
                      {t("profile.edit_short", "Редактировать")}
                    </span>
                  </button>
                </div>
              </div>
            </section>

            <section className="profile-card">
              <ProfileNavRow
                icon={<IconPin />}
                label={t("profile.city", "Ваш город")}
                hint={cityName ?? t("profile.not_selected", "Не выбран")}
                onClick={() => setView("city")}
              />
              <ProfileNavRow
                icon={<IconCar />}
                label={t("profile.garage2", "Гараж")}
                hint={garageHint}
                onClick={() => setView("garage2")}
              />
              <ProfileNavRow
                icon={<IconHistory />}
                label={t("profile.history", "История")}
                hint={t("profile.history_hint", "Мойки и зарядки")}
                href="/profile/history"
              />
              <ProfileNavRow
                icon={<IconLang />}
                label={t("profile.language", "Язык")}
                hint={languageHint}
                onClick={() => setView("language")}
              />
              <ProfileNavRow
                icon={<IconPalette />}
                label={t("profile.appearance", "Оформление")}
                hint="фон / кнопки / текст"
                onClick={() => {
                  setEditPaletteMode(theme);
                  setAppearanceSection("menu");
                  setView("appearance");
                }}
              />
            </section>

            <section className="profile-card">
              <button
                type="button"
                onClick={() => void togglePush()}
                disabled={pushLoading || pushSaving}
                className="profile-nav-row theme-hover disabled:opacity-60"
              >
                <span className="profile-nav-row__icon" aria-hidden>
                  <IconBell />
                </span>
                <span className="profile-nav-row__main">
                  <span className="profile-nav-row__label">
                    {t("profile.notifications", "Уведомления")}
                  </span>
                  <span className="profile-nav-row__hint">{pushHint}</span>
                </span>
                <span
                  className={`profile-switch${!pushLoading && pushEnabled ? " is-on" : ""}`}
                  aria-hidden
                >
                  <span className="profile-switch__knob" />
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!themeMounted) return;
                  toggleTheme();
                }}
                className="profile-nav-row theme-hover"
              >
                <span className="profile-nav-row__icon" aria-hidden>
                  <IconTheme />
                </span>
                <span className="profile-nav-row__main">
                  <span className="profile-nav-row__label">
                    {t("profile.theme", "Тема")}
                  </span>
                  <span className="profile-nav-row__hint">
                    {themeMounted ? (isDark ? "Тёмная" : "Светлая") : "…"}
                  </span>
                </span>
                <span
                  className={`profile-switch${themeMounted && isDark ? " is-on" : ""}`}
                  aria-hidden
                >
                  <span className="profile-switch__knob" />
                </span>
              </button>
            </section>

            <section className="profile-card">
              <ProfileNavRow
                icon={<IconTag />}
                label={t("profile.promo", "Промокод")}
                hint={
                  hasReferrer
                    ? t("profile.promo_already", "Вы уже зашли через промокод")
                    : `${t("profile.referral", "Рефералка")} · ${myReferralCode}`
                }
                onClick={() => setView("promo")}
              />
              <ProfileNavRow
                icon={<IconChat />}
                label={t("profile.support", "Поддержка")}
                hint={t("profile.documents_hint", "Политика и оферта")}
                onClick={() => setView("support")}
              />
            </section>
          </div>
        ) : null}

        {view === "edit" ? (
          <EditAccountPage embedded onBack={() => setView("home")} />
        ) : null}

        {view === "city" ? (
          <SelectCityPage embedded onBack={() => setView("home")} />
        ) : null}

        {view === "language" ? (
          <SelectLanguagePage embedded onBack={() => setView("home")} />
        ) : null}

        {view === "garage2" ? (
          <Garage2Page embedded onBack={() => setView("home")} />
        ) : null}

        {view === "balance" ? (
          <>
            <BackBar
              title={t("profile.top_up", "Пополнить баланс")}
              onBack={() => setView("home")}
            />
            <BalanceTopUp
              balance={balance}
              loading={balanceLoading}
              onSuccess={() => void refreshBalance()}
            />
          </>
        ) : null}

        {view === "appearance" ? (
          <>
            <BackBar
              title={
                appearanceSection === "menu"
                  ? t("profile.appearance", "Оформление")
                  : APPEARANCE_MENU.find((m) => m.id === appearanceSection)
                      ?.label ?? t("profile.appearance", "Оформление")
              }
              onBack={() => {
                if (appearanceSection === "menu") setView("home");
                else setAppearanceSection("menu");
              }}
            />

            {appearanceSection === "menu" ? (
              <section className="mb-5">
                <SectionTitle>Оформление</SectionTitle>
                <p
                  className="mb-2 px-0.5 leading-relaxed"
                  style={{
                    color: "var(--app-description)",
                    fontSize: "var(--app-text-sm)",
                  }}
                >
                  Выберите раздел — как пункты в профиле: сверху название, снизу
                  короткое значение.
                </p>
                <SectionCard>
                  {APPEARANCE_MENU.map((item) => (
                    <ProfileNavRow
                      key={item.id}
                      label={item.label}
                      hint={item.hint}
                      onClick={() => setAppearanceSection(item.id)}
                    />
                  ))}
                </SectionCard>
                <div className="mt-3 px-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      resetPalette();
                      resetLayout();
                      setTheme("light");
                      setEditPaletteMode("light");
                      showToast("Оформление сброшено к значениям по умолчанию");
                    }}
                    className="theme-button-secondary w-full"
                  >
                    Всё по умолчанию
                  </button>
                </div>
              </section>
            ) : null}

            {appearanceSection === "theme" ? (
              <>
                <section className="mb-5">
                  <SectionTitle>Тема</SectionTitle>
                  <SectionCard>
                    {THEME_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={theme === option.id}
                        onClick={() => {
                          setTheme(option.id);
                          setEditPaletteMode(option.id);
                        }}
                        className="profile-nav-row theme-hover text-left"
                      >
                        <RadioMark checked={theme === option.id} />
                        <span className="profile-nav-row__main">
                          <span className="profile-nav-row__label">
                            {option.label}
                          </span>
                          <span className="profile-nav-row__hint">
                            {option.hint}
                          </span>
                        </span>
                      </button>
                    ))}
                  </SectionCard>
                </section>

                <section className="mb-5">
                  <SectionTitle>Цвета</SectionTitle>
                  <div
                    className="history-kind profile-theme-tabs"
                    role="tablist"
                    aria-label="Палитра темы"
                  >
                    {(
                      [
                        { id: "light" as const, label: "Светлая" },
                        { id: "dark" as const, label: "Тёмная" },
                      ] as const
                    ).map((tab) => {
                      const active = editPaletteMode === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setEditPaletteMode(tab.id)}
                          className={`history-kind__btn${active ? " is-on" : ""}`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  <SectionCard>
                    {(() => {
                      const palette = palettes[editPaletteMode];
                      return (
                        <>
                          <div
                            className="m-3 overflow-hidden rounded-xl"
                            style={{
                              backgroundColor: palette.background,
                              border: `1px solid ${palette.border}`,
                            }}
                          >
                            <div
                              className="m-2 space-y-2 rounded-lg p-3 transition"
                              style={{
                                backgroundColor: palette.block,
                                border: `1px solid ${palette.border}`,
                              }}
                            >
                              <p
                                className="app-text-md font-semibold"
                                style={{ color: palette.text }}
                              >
                                Превью блока
                              </p>
                              <p
                                className="app-text-xs"
                                style={{ color: palette.description }}
                              >
                                Description · подпись вторичного текста
                              </p>
                              <div
                                className="rounded-lg px-2.5 py-2 app-text-xs font-medium transition"
                                style={{
                                  backgroundColor: palette.hover,
                                  color: palette.text,
                                  border: `1px solid ${palette.border}`,
                                }}
                              >
                                Hover состояние строки
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  className="app-text-xs font-semibold"
                                  style={{
                                    backgroundColor: palette.button,
                                    color: palette.buttonText,
                                    borderRadius: "var(--app-button-radius)",
                                    padding:
                                      "var(--app-button-pad-y) var(--app-button-pad-x)",
                                  }}
                                >
                                  Button
                                </button>
                                <button
                                  type="button"
                                  className="app-text-xs font-semibold"
                                  style={{
                                    backgroundColor: palette.buttonHover,
                                    color: palette.buttonText,
                                    borderRadius: "var(--app-button-radius)",
                                    padding:
                                      "var(--app-button-pad-y) var(--app-button-pad-x)",
                                  }}
                                >
                                  Hover
                                </button>
                              </div>
                            </div>
                          </div>

                          {PALETTE_FIELD_META.map((field, index) => (
                            <div key={field.key}>
                              {index > 0 ? (
                                <div className="border-t border-zinc-100 dark:border-zinc-800" />
                              ) : null}
                              <PaletteColorRow
                                label={field.label}
                                hint={field.hint}
                                cssVars={field.cssVars}
                                uses={field.uses}
                                value={palette[field.key]}
                                onChange={(hex) =>
                                  setField(editPaletteMode, field.key, hex)
                                }
                              />
                            </div>
                          ))}

                          <div className="space-y-2 border-t border-zinc-100 px-3 py-3 dark:border-zinc-800">
                            <p className="theme-description app-text-xs">
                              Сохраняется в localStorage
                            </p>
                            <button
                              type="button"
                              onClick={() => resetPalette(editPaletteMode)}
                              className="theme-button-secondary w-full"
                            >
                              Сбросить эту тему
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </SectionCard>
                </section>
              </>
            ) : null}

            {appearanceSection === "back" ? (
              <section className="mb-5">
                <SectionTitle>Кнопка назад</SectionTitle>
                <p
                  className="mb-2 px-0.5 leading-relaxed"
                  style={{
                    color: "var(--app-description)",
                    fontSize: "var(--app-text-sm)",
                  }}
                >
                  Выберите вариант — сверху сразу видно, как будет выглядеть
                  кнопка. Сохраняется для всего профиля.
                </p>
                <SectionCard>
                  {BACK_BUTTON_STYLE_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={backStyle === option.id}
                      onClick={() => setBackStyle(option.id as BackButtonStyle)}
                      className="profile-nav-row theme-hover text-left"
                    >
                      <RadioMark checked={backStyle === option.id} />
                      <span className="profile-nav-row__main">
                        <span className="profile-nav-row__label">
                          {option.label}
                        </span>
                        <span className="profile-nav-row__hint">
                          {option.hint} · {option.example}
                        </span>
                      </span>
                    </button>
                  ))}
                </SectionCard>
                <div className="mt-3 px-0.5">
                  <p
                    className="mb-2"
                    style={{
                      color: "var(--app-description)",
                      fontSize: "var(--app-text-xs)",
                      fontWeight: 600,
                    }}
                  >
                    Превью
                  </p>
                  <div
                    className="rounded-[var(--app-section-radius)] border border-[var(--app-border)] bg-[var(--app-block)] px-3 py-3"
                  >
                    <AppBackButton
                      title="Оформление"
                      onClick={() => undefined}
                    />
                  </div>
                </div>
              </section>
            ) : null}

            {appearanceSection !== "menu" &&
            appearanceSection !== "theme" &&
            appearanceSection !== "back" ? (
              <section className="mb-5">
                <SectionTitle>
                  {APPEARANCE_MENU.find((m) => m.id === appearanceSection)?.label}
                </SectionTitle>
                <p
                  className="mb-2 px-0.5 leading-relaxed"
                  style={{
                    color: "var(--app-description)",
                    fontSize: "var(--app-text-sm)",
                  }}
                >
                  {
                    APPEARANCE_MENU.find((m) => m.id === appearanceSection)
                      ?.description
                  }
                  . У каждого слайдера — «Где применяется».
                </p>
                <SectionCard>
                  {appearanceSection === "rows" ? (
                    <div
                      className="m-3 overflow-hidden"
                      style={{
                        backgroundColor: "var(--app-hover)",
                        border: "var(--app-border-width) solid var(--app-border)",
                        borderRadius: "var(--app-section-radius)",
                        padding: "0.5rem",
                      }}
                    >
                      <div
                        className="profile-card"
                        style={{ pointerEvents: "none" }}
                      >
                        <div className="profile-nav-row is-static">
                          <span className="profile-nav-row__icon" aria-hidden>
                            ◆
                          </span>
                          <span className="profile-nav-row__main">
                            <span className="profile-nav-row__label">
                              Превью пункта
                            </span>
                            <span className="profile-nav-row__hint">
                              Как в меню профиля
                            </span>
                          </span>
                          <span className="profile-nav-row__chevron" aria-hidden>
                            ›
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {appearanceSection === "text" ? (
                    <div
                      className="m-3 space-y-1.5 rounded-xl px-3 py-3"
                      style={{
                        backgroundColor: "var(--app-hover)",
                        border: "1px solid var(--app-border)",
                      }}
                    >
                      <p className="app-text-xs" style={{ color: "var(--app-description)" }}>
                        xs · подписи и бейджи
                      </p>
                      <p className="app-text-sm" style={{ color: "var(--app-description)" }}>
                        sm · вторичный текст
                      </p>
                      <p className="app-text-md font-medium" style={{ color: "var(--app-text)" }}>
                        md · основной текст (база rem)
                      </p>
                      <p className="app-text-lg font-semibold" style={{ color: "var(--app-text)" }}>
                        lg · акценты и значения
                      </p>
                      <p className="app-text-xl font-bold" style={{ color: "var(--app-text)" }}>
                        xl · заголовки sheet
                      </p>
                      <p className="app-text-2xl font-bold" style={{ color: "var(--app-text)" }}>
                        2xl · крупные заголовки
                      </p>
                    </div>
                  ) : null}

                  {appearanceSection === "page" ? (
                    <div
                      className="m-3 overflow-hidden"
                      style={{
                        backgroundColor: "var(--app-hover)",
                        border: "1px solid var(--app-border)",
                        borderRadius: "var(--app-section-radius)",
                        padding:
                          "var(--app-page-pad-top) var(--app-page-pad-x) var(--app-page-pad-bottom)",
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: "var(--app-block)",
                          border: "1px solid var(--app-border)",
                          borderRadius: "var(--app-section-radius-sm)",
                          padding: "var(--app-row-pad-y) var(--app-row-pad-x)",
                        }}
                      >
                        <p className="app-text-sm font-medium">Превью полей страницы</p>
                        <p
                          className="app-text-xs mt-1"
                          style={{ color: "var(--app-description)" }}
                        >
                          Меняйте слайдеры — отступы обновятся сразу
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {APPEARANCE_LAYOUT_GROUPS[
                    appearanceSection as Exclude<
                      AppearanceSection,
                      "menu" | "theme" | "back"
                    >
                  ].map((group) => {
                    const fields = LAYOUT_FIELD_META.filter(
                      (f) => f.group === group,
                    );
                    const multi =
                      APPEARANCE_LAYOUT_GROUPS[
                        appearanceSection as Exclude<
                          AppearanceSection,
                          "menu" | "theme" | "back"
                        >
                      ].length > 1;
                    return (
                      <div key={group}>
                        {multi ? (
                          <div
                            className="border-t border-zinc-100 px-3 pb-1 pt-3 dark:border-zinc-800"
                            style={{
                              background:
                                "color-mix(in oklab, var(--app-hover) 70%, transparent)",
                            }}
                          >
                            <p
                              className="font-semibold uppercase tracking-wider"
                              style={{
                                color: "var(--app-button)",
                                fontSize: "var(--app-text-xs)",
                              }}
                            >
                              {LAYOUT_GROUP_LABELS[group]}
                            </p>
                            <p
                              className="mt-0.5"
                              style={{
                                color: "var(--app-description)",
                                fontSize: "var(--app-text-xs)",
                              }}
                            >
                              {LAYOUT_GROUP_HINTS[group]}
                            </p>
                          </div>
                        ) : null}
                        {fields.map((field) => (
                          <div key={field.key}>
                            <div className="border-t border-zinc-100 dark:border-zinc-800" />
                            <LayoutSpacingRow
                              label={field.label}
                              hint={field.hint}
                              cssVar={field.cssVar}
                              uses={field.uses}
                              value={layout[field.key]}
                              unit={field.unit}
                              min={field.min}
                              max={field.max}
                              step={field.step}
                              onChange={(cssValue) =>
                                setLayoutField(field.key, cssValue)
                              }
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })}

                  <div className="border-t border-zinc-100 px-3 py-3 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => {
                        resetLayout();
                        showToast("Отступы сброшены");
                      }}
                      className="theme-button-secondary w-full"
                    >
                      Сбросить отступы
                    </button>
                  </div>
                </SectionCard>
              </section>
            ) : null}
          </>
        ) : null}

        {view === "promo" ? (
          <>
            <BackBar
              title={t("profile.promo", "Промокод")}
              onBack={() => setView("home")}
            />
            <div className="profile-edit__main space-y-4">
              <div className="profile-edit-fields">
                <div className="profile-edit-row">
                  <span className="profile-edit-row__label">
                    {t("profile.referral", "Рефералка")}
                  </span>
                  <div className="profile-promo__code-wrap">
                    <p className="profile-edit-row__value profile-promo__code">
                      {myReferralCode}
                    </p>
                    <IconActionButton
                      label={
                        copied
                          ? t("profile.copied", "Скопировано")
                          : t("profile.copy_code", "Скопировать код")
                      }
                      disabled={!myReferralCode || myReferralCode === "—"}
                      onClick={() => void handleCopyReferral()}
                    >
                      {copied ? <IconCheck /> : <IconCopy />}
                    </IconActionButton>
                  </div>
                </div>

                <div className="profile-edit-row">
                  <span className="profile-edit-row__label">
                    {t("profile.my_clients", "Ваши клиенты")}
                  </span>
                  <p className="profile-edit-row__value profile-promo__count">
                    {clientsCount}
                  </p>
                </div>

                <div className="profile-edit-row">
                  <span className="profile-edit-row__label">
                    {t("profile.promo", "Промокод")}
                  </span>
                  {hasReferrer ? (
                    <p className="profile-edit__feedback is-ok" style={{ textAlign: "left" }}>
                      {t("profile.promo_already", "Вы уже зашли через промокод")}
                    </p>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => updatePromoCode(e.target.value)}
                        placeholder={t("profile.promo_placeholder", "Введите код")}
                        maxLength={8}
                        disabled={promoBusy}
                        className="profile-edit-row__value profile-promo__input"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                      {promoMessage ? (
                        <p
                          className={`profile-edit__feedback ${promoError ? "is-error" : "is-ok"}`}
                          style={{ textAlign: "left", marginTop: "0.35rem" }}
                        >
                          {promoMessage}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void applyPromo()}
                        disabled={promoBusy || !promoCode.trim()}
                        className="theme-button w-full profile-promo__ok"
                      >
                        {promoBusy ? t("common.saving", "Сохранение…") : "OK"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}

        {view === "support" ? (
          <>
            <BackBar
              title={t("profile.support", "Поддержка")}
              onBack={() => setView("home")}
            />
            <div className="space-y-4">
              <section className="profile-card">
                <button
                  type="button"
                  className="profile-nav-row theme-hover text-left"
                  onClick={() => openTelegram(support.telegram.url)}
                >
                  <span className="profile-nav-row__main">
                    <span className="profile-nav-row__hint">
                      {support.telegram.title}
                    </span>
                  </span>
                  <svg
                    className="profile-nav-row__chevron"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path strokeLinecap="round" d="m9 6 6 6-6 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="profile-nav-row theme-hover text-left"
                  onClick={() => openWhatsApp(support.whatsapp.url)}
                >
                  <span className="profile-nav-row__main">
                    <span className="profile-nav-row__hint">
                      {support.whatsapp.title}
                    </span>
                  </span>
                  <svg
                    className="profile-nav-row__chevron"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path strokeLinecap="round" d="m9 6 6 6-6 6" />
                  </svg>
                </button>
              </section>

              <section className="profile-card">
                {documents.length === 0 ? (
                  <p
                    className="profile-nav-row is-static"
                    style={{ color: "var(--app-description)" }}
                  >
                    {t("profile.documents_empty", "Документов пока нет")}
                  </p>
                ) : (
                  documents.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      className="profile-nav-row theme-hover text-left"
                      disabled={!doc.url}
                      onClick={() => {
                        if (doc.url) openBrowser(doc.url);
                      }}
                    >
                      <span className="profile-nav-row__main">
                        <span className="profile-nav-row__hint">{doc.title}</span>
                      </span>
                      <svg
                        className="profile-nav-row__chevron"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden
                      >
                        <path strokeLinecap="round" d="m9 6 6 6-6 6" />
                      </svg>
                    </button>
                  ))
                )}
              </section>

              <FaqSection />
            </div>
          </>
        ) : null}

        <Toast message={toastMessage} />

        {cropSrc ? (
          <AvatarCropper
            imageSrc={cropSrc}
            busy={photoBusy}
            onCancel={() => {
              if (!photoBusy) setCropSrc(null);
            }}
            onCropped={(blob) => void handleCroppedPhoto(blob)}
          />
        ) : null}

      </>
    </PageLayout>
  );
}
