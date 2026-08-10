"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout";
import { formatPhoneDisplay, useAuthUser } from "@/hooks/useAuthUser";
import { forceLogout } from "@/lib/forceLogout";
import { openBrowser } from "@/lib/browserController";
import { copyText } from "@/lib/clipboardController";
import { openTelegram, openWhatsApp } from "@/lib/messengerController";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setHeaderNav } from "@/store/slices/appSlice";
import { setHeaderVisible } from "@/lib/userSession";
import { setLocale } from "@/store/slices/i18nSlice";
import { useLocale, useT } from "@/hooks/useT";
import { notifyLocaleChanged } from "@/lib/localeController";
import HistoryList from "@/features/history/components/HistoryList";
import BackButton from "@/components/ui/BackButton";
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
import { fetchUserInfo, updateUserSettings, type AuthUser } from "@/lib/api/auth";
import { formatCityName } from "@/lib/api/geos";
import { useEditProfile } from "./hooks/useEditProfile";
import { usePromoCode } from "./hooks/usePromoCode";
import {
  fetchReferralClients,
  type ReferralClient,
} from "@/lib/api/referral";
import { hasAccessToken } from "@/lib/authToken";
import { usePushNotifications } from "./hooks/usePushNotifications";
import { useUserBalance, formatBalance } from "./hooks/useUserBalance";
import BalanceTopUp from "./components/BalanceTopUp";
import AvatarCropper from "./components/AvatarCropper";
import GaragePanel from "./components/GaragePanel";
import IconActionButton, {
  IconCheck,
  IconCopy,
  IconTrash,
} from "./components/IconActionButton";
import ProfileNavRow from "./components/ProfileNavRow";
import FaqSection from "./components/FaqSection";
import { deleteUserPhoto, resolveMediaUrl, uploadUserPhoto } from "@/lib/api/photo";
import { pickImage } from "@/lib/pickImage";
import "./components/profile.css";

type ProfileView =
  | "home"
  | "edit"
  | "balance"
  | "history"
  | "garage"
  | "promo"
  | "referral-clients"
  | "support"
  | "documents"
  | "language"
  | "city"
  | "appearance";

const THEME_OPTIONS: { id: AppTheme; label: string; hint: string }[] = [
  { id: "light", label: "Тема", hint: "Светлая" },
  { id: "dark", label: "Тема", hint: "Тёмная" },
];

const LANGUAGE_OPTIONS = [
  { id: "ru", label: "Русский" },
  { id: "kz", label: "Қазақша" },
  { id: "en", label: "English" },
] as const;

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
  | "shape";

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
];

const APPEARANCE_LAYOUT_GROUPS: Record<
  Exclude<AppearanceSection, "menu" | "theme">,
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
function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path strokeLinecap="round" d="m5 8 7 5 7-5" />
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
function IconBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" d="M6.5 16.5h11M8 16.5V10a4 4 0 1 1 8 0v6.5M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}
function IconNav() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" d="M4.5 7h15M4.5 12h15M4.5 17h15" />
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
function IconDocs() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3.5h7.5L19 8v12.5H7V3.5Z" />
      <path strokeLinecap="round" d="M14.5 3.5V8H19M9.5 12h5M9.5 15.5h5" />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" d="M10 4.5H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h3M14 8l4 4-4 4M10 12h8" />
    </svg>
  );
}
function IconCamera() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" d="M4.5 8.5h2.2l1.1-2h8.4l1.1 2H19.5a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18v-8a1.5 1.5 0 0 1 1.5-1.5Z" />
      <circle cx="12" cy="13.5" r="3" />
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

function BackBar({ onBack }: { onBack: () => void }) {
  return (
    <div className="mb-3">
      <BackButton iconOnly onClick={onBack} />
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
    email: authEmail,
    phone,
    photoUrl,
    loading: profileLoading,
    mounted,
  } = useAuthUser();
  const dispatch = useAppDispatch();
  const showHeaderNav = useAppSelector((state) => state.app.showHeaderNav);
  const support = useAppSelector((state) => state.variables.support);
  const documents = useAppSelector((state) => state.variables.documents);
  const [referralUser, setReferralUser] = useState<AuthUser | null>(null);
  const [referralClients, setReferralClients] = useState<ReferralClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);

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
  const { theme, isDark, setTheme, mounted: themeMounted } = useTheme();
  const { palettes, setField, reset: resetPalette } = useThemePalette();
  const {
    layout,
    setField: setLayoutField,
    reset: resetLayout,
  } = useThemeLayout();
  const locale = useLocale();
  const t = useT();
  const languageHint =
    LANGUAGE_OPTIONS.find((lang) => lang.id === locale)?.label ?? "Русский";
  const [editPaletteMode, setEditPaletteMode] = useState<ThemeMode>("light");
  const [appearanceSection, setAppearanceSection] =
    useState<AppearanceSection>("menu");
  const { message: toastMessage, showToast } = useToast();
  const {
    geoId,
    cityName,
    cities,
    loading: citiesLoading,
    refresh: refreshCity,
  } = useUserCity();
  const [citySavingId, setCitySavingId] = useState<number | null>(null);

  const [view, setView] = useState<ProfileView>("home");
  const [copied, setCopied] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [avatarReady, setAvatarReady] = useState(false);

  const avatarSrc = resolveMediaUrl(photoUrl);
  const bootLoading = !mounted || profileLoading;
  const heroPhotoLoading = Boolean(avatarSrc) && !avatarReady;

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
    if (!logoutConfirmOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLogoutConfirmOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [logoutConfirmOpen]);

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

  useEffect(() => {
    if (view !== "referral-clients" || !hasAccessToken()) return;
    let cancelled = false;
    setClientsLoading(true);
    void fetchReferralClients()
      .then((data) => {
        if (cancelled) return;
        setReferralClients(data.clients);
        setReferralUser((prev) =>
          prev
            ? { ...prev, referral_clients_count: data.total }
            : prev,
        );
      })
      .catch(() => {
        if (!cancelled) setReferralClients([]);
      })
      .finally(() => {
        if (!cancelled) setClientsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view]);

  const displayName = mounted ? name || "…" : "…";
  const resolvedEmail =
    profileEdit.email.trim() ||
    authEmail.trim() ||
    referralUser?.email?.trim() ||
    "";
  const displayEmail = !mounted || (profileLoading && !resolvedEmail)
    ? "…"
    : resolvedEmail || "Не указан";
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

  async function handleDeletePhoto() {
    if (!photoUrl) return;
    setPhotoBusy(true);
    try {
      await deleteUserPhoto();
      showToast("Фото удалено");
    } catch {
      showToast("Не удалось удалить фото");
    } finally {
      setPhotoBusy(false);
    }
  }

  function AvatarBubble({ size = "md" }: { size?: "md" | "lg" }) {
    const box =
      size === "lg"
        ? "h-20 w-20 text-xl"
        : "h-12 w-12 text-sm";
    if (avatarSrc) {
      return (
        <span className={`relative shrink-0 overflow-hidden rounded-full ${box}`}>
          {!avatarReady ? (
            <span className="profile-avatar-shimmer absolute inset-0" aria-hidden />
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarSrc}
            alt=""
            onLoad={() => setAvatarReady(true)}
            onError={() => setAvatarReady(true)}
            className={`h-full w-full rounded-full object-cover transition-opacity duration-200 ${
              avatarReady ? "opacity-100" : "opacity-0"
            }`}
          />
        </span>
      );
    }
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-full bg-zinc-900 font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900 ${box}`}
      >
        {initials}
      </span>
    );
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

  function formatReferredAt(value: string | null): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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
              <p className="profile-hero__email">{displayEmail}</p>

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
                    <IconCamera />
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
                      <svg
                        className="profile-card__balance-chevron"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden
                      >
                        <path strokeLinecap="round" d="m9 6 6 6-6 6" />
                      </svg>
                    </span>
                  </Link>
                </div>
                <div className="profile-card__balance-item">
                  <button
                    type="button"
                    className="profile-card__phone-btn"
                    onClick={() => setView("edit")}
                  >
                    <p className="profile-card__balance-label">
                      {t("profile.phone", "Телефон")}
                    </p>
                    <p className="profile-card__balance-value">{displayPhone}</p>
                  </button>
                </div>
              </div>
            </section>

            <section className="profile-card">
              <ProfileNavRow
                icon={<IconUser />}
                label={t("profile.full_name", "Имя и фамилия")}
                hint={displayName}
              />
              <ProfileNavRow
                icon={<IconMail />}
                label="Email"
                hint={displayEmail}
              />
              <ProfileNavRow
                icon={<IconPin />}
                label={t("profile.city", "Ваш город")}
                hint={cityName ?? t("profile.not_selected", "Не выбран")}
                onClick={() => setView("city")}
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
                hint={
                  themeMounted
                    ? `${isDark ? "Тёмная" : "Светлая"} · фон / кнопки / текст`
                    : "Тема и цвета"
                }
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
                  const next = !showHeaderNav;
                  dispatch(setHeaderNav(next));
                  setHeaderVisible(next);
                }}
                className="profile-nav-row theme-hover"
              >
                <span className="profile-nav-row__icon" aria-hidden>
                  <IconNav />
                </span>
                <span className="profile-nav-row__main">
                  <span className="profile-nav-row__label">Header</span>
                  <span className="profile-nav-row__hint">
                    {showHeaderNav ? "Показан" : "Скрыт"}
                  </span>
                </span>
                <span
                  className={`profile-switch${showHeaderNav ? " is-on" : ""}`}
                  aria-hidden
                >
                  <span className="profile-switch__knob" />
                </span>
              </button>
            </section>

            <section className="profile-card">
              <ProfileNavRow
                icon={<IconCar />}
                label={t("profile.garage", "Гараж")}
                hint={t("garage.plate", "Госномер")}
                onClick={() => setView("garage")}
              />
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
                hint={t("profile.faq", "Частые вопросы")}
                onClick={() => setView("support")}
              />
              <ProfileNavRow
                icon={<IconDocs />}
                label={t("profile.documents", "Документы")}
                hint={t("profile.documents_hint", "Политика и оферта")}
                onClick={() => setView("documents")}
              />
            </section>
          </div>
        ) : null}

        {view === "balance" ? (
          <>
            <BackBar onBack={() => setView("home")} />
            <BalanceTopUp
              balance={balance}
              loading={balanceLoading}
              onSuccess={() => void refreshBalance()}
            />
          </>
        ) : null}

        {view === "history" ? (
          <>
            <BackBar onBack={() => setView("home")} />
            <HistoryList />
          </>
        ) : null}

        {view === "edit" ? (
          <div className="profile-edit">
            <BackBar onBack={() => setView("home")} />
            <div className="profile-edit__main space-y-4">
              <SectionCard>
                <div className="flex flex-col items-center gap-3 px-3 py-4">
                  <AvatarBubble size="lg" />
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      disabled={photoBusy}
                      onClick={() => void handlePickPhoto()}
                      className="theme-button"
                    >
                      {photoUrl ? "Изменить фото" : "Добавить фото"}
                    </button>
                    {photoUrl ? (
                      <IconActionButton
                        label={t("common.delete", "Удалить")}
                        danger
                        disabled={photoBusy}
                        onClick={() => void handleDeletePhoto()}
                      >
                        <IconTrash />
                      </IconActionButton>
                    ) : null}
                  </div>
                </div>
              </SectionCard>

              <SectionCard>
                <div className="space-y-3 px-3 py-3">
                  <label className="block">
                    <span className="mb-1.5 block text-[0.8125rem] font-medium uppercase tracking-wider text-zinc-400">
                      Имя *
                    </span>
                    <input
                      type="text"
                      value={profileEdit.firstName}
                      onChange={(e) => profileEdit.setFirstName(e.target.value)}
                      disabled={profileEdit.loading || profileEdit.saving}
                      placeholder="Имя"
                      autoComplete="given-name"
                      className="theme-field w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[0.8125rem] font-medium uppercase tracking-wider text-zinc-400">
                      Фамилия{" "}
                      <span className="normal-case tracking-normal text-zinc-400/80">
                        (необязательно)
                      </span>
                    </span>
                    <input
                      type="text"
                      value={profileEdit.lastName}
                      onChange={(e) => profileEdit.setLastName(e.target.value)}
                      disabled={profileEdit.loading || profileEdit.saving}
                      placeholder="Фамилия (необязательно)"
                      autoComplete="family-name"
                      className="theme-field w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[0.8125rem] font-medium uppercase tracking-wider text-zinc-400">
                      Email *
                    </span>
                    <input
                      type="email"
                      value={profileEdit.email}
                      onChange={(e) => profileEdit.setEmail(e.target.value)}
                      disabled={profileEdit.loading || profileEdit.saving}
                      placeholder="example@mail.com"
                      autoComplete="email"
                      inputMode="email"
                      className="theme-field w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                    />
                  </label>
                </div>
              </SectionCard>

              <button
                type="button"
                disabled={!profileEdit.canSave}
                onClick={() => {
                  void profileEdit.save().then((ok) => {
                    if (ok) {
                      window.setTimeout(() => setView("home"), 450);
                    }
                  });
                }}
                className="theme-button w-full"
              >
                {profileEdit.saving
                  ? t("common.saving", "Сохранение…")
                  : t("common.save", "Сохранить")}
              </button>

              {profileEdit.message ? (
                <p className="text-center text-xs text-emerald-600 dark:text-emerald-400">
                  {profileEdit.message}
                </p>
              ) : null}
              {profileEdit.error ? (
                <p className="text-center text-xs text-red-600 dark:text-red-400">
                  {profileEdit.error}
                </p>
              ) : null}
            </div>

            <div className="profile-edit__logout">
              <SectionCard>
                <ProfileNavRow
                  icon={<IconLogout />}
                  label={t("profile.logout", "Выйти")}
                  danger
                  onClick={() => setLogoutConfirmOpen(true)}
                />
              </SectionCard>
            </div>
          </div>
        ) : null}

        {view === "city" ? (
          <>
            <BackBar onBack={() => setView("home")} />
            <p
              className="mb-3 px-0.5"
              style={{
                color: "var(--app-description)",
                fontSize: "var(--app-text-sm)",
              }}
            >
              Мойки и ЭЗС показываются только в выбранном городе.
            </p>
            {citiesLoading ? (
              <div
                className="h-28 animate-pulse"
                style={{
                  borderRadius: "var(--app-section-radius)",
                  border: "var(--app-border-width) solid var(--app-border)",
                  background: "var(--app-hover)",
                }}
              />
            ) : (
              <SectionCard>
                {cities.map((city) => {
                  const selected = geoId === city.id;
                  const busy = citySavingId === city.id;
                  return (
                    <button
                      key={city.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={citySavingId != null}
                      onClick={() => {
                        void (async () => {
                          if (selected) return;
                          setCitySavingId(city.id);
                          try {
                            await updateUserSettings({ geo_id: city.id });
                            refreshCity();
                            showToast(`Город: ${formatCityName(city, locale)}`);
                            setView("home");
                          } catch {
                            showToast("Не удалось сохранить город");
                          } finally {
                            setCitySavingId(null);
                          }
                        })();
                      }}
                      className="profile-nav-row theme-hover text-left disabled:opacity-60"
                    >
                      <RadioMark checked={selected} busy={busy} />
                      <span className="profile-nav-row__main">
                        <span className="profile-nav-row__label">Город</span>
                        <span className="profile-nav-row__hint">
                          {formatCityName(city, locale)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </SectionCard>
            )}
          </>
        ) : null}

        {view === "language" ? (
          <>
            <BackBar onBack={() => setView("home")} />
            <SectionCard>
              {LANGUAGE_OPTIONS.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  role="radio"
                  aria-checked={lang.id === locale}
                  onClick={() => {
                    dispatch(setLocale(lang.id));
                    notifyLocaleChanged(lang.id);
                    showToast(lang.label);
                  }}
                  className="profile-nav-row theme-hover text-left"
                >
                  <RadioMark checked={lang.id === locale} />
                  <span className="profile-nav-row__main">
                    <span className="profile-nav-row__label">Язык</span>
                    <span className="profile-nav-row__hint">{lang.label}</span>
                  </span>
                </button>
              ))}
            </SectionCard>
          </>
        ) : null}

        {view === "appearance" ? (
          <>
            <BackBar
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
                    className="mb-2 flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-800 dark:bg-zinc-900/60"
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
                          className={[
                            "flex-1 rounded-md px-2 py-1.5 app-text-xs font-medium transition",
                            active
                              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
                          ].join(" ")}
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

            {appearanceSection !== "menu" &&
            appearanceSection !== "theme" ? (
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

                  {APPEARANCE_LAYOUT_GROUPS[appearanceSection].map((group) => {
                    const fields = LAYOUT_FIELD_META.filter(
                      (f) => f.group === group,
                    );
                    const multi =
                      APPEARANCE_LAYOUT_GROUPS[appearanceSection].length > 1;
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

        {view === "garage" ? (
          <>
            <BackBar onBack={() => setView("home")} />
            <GaragePanel />
          </>
        ) : null}

        {view === "promo" ? (
          <>
            <BackBar onBack={() => setView("home")} />
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-[0.8125rem] font-medium uppercase tracking-wider text-zinc-400">
                  {t("profile.promo", "Промокод")}
                </p>
                {hasReferrer ? (
                  <p className="theme-accent-text text-xs">
                    {t("profile.promo_already", "Вы уже зашли через промокод")}
                  </p>
                ) : (
                  <>
                    <div className="theme-input-row">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => updatePromoCode(e.target.value)}
                        placeholder={t("profile.promo_placeholder", "Введите код")}
                        maxLength={8}
                        disabled={promoBusy}
                        className="theme-field min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm uppercase tracking-wide text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                      <button
                        type="button"
                        onClick={() => void applyPromo()}
                        disabled={promoBusy}
                        className="theme-button disabled:opacity-50"
                      >
                        OK
                      </button>
                    </div>
                    {promoMessage ? (
                      <p
                        className={`mt-2 text-xs ${promoError ? "text-red-500" : "theme-accent-text"}`}
                      >
                        {promoMessage}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-zinc-400">
                        {t(
                          "profile.promo_hint",
                      "После вашей первой оплаты пригласившему зачислится 100 ₸ на баланс",
                        )}
                      </p>
                    )}
                  </>
                )}
              </div>

              <SectionCard>
                <div className="px-3 py-3">
                  <p className="text-[0.8125rem] font-medium uppercase tracking-wider text-zinc-400">
                    {t("profile.referral", "Рефералка")}
                  </p>
                  <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {t(
                      "profile.referral_hint",
                      "Поделитесь кодом — после первой оплаты друга 100 ₸ упадут вам на баланс",
                    )}
                  </p>

                  <div className="mt-3 flex items-center gap-1">
                    <p className="min-w-0 flex-1 font-mono text-base font-semibold tracking-wide text-zinc-900 dark:text-zinc-50">
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
              </SectionCard>

              <SectionCard>
                <ProfileNavRow
                  label={t("profile.my_clients", "Ваши клиенты")}
                  hint={
                    clientsCount === 0
                      ? t("profile.my_clients_empty", "Пока никто не подключился")
                      : `${clientsCount}`
                  }
                  onClick={() => setView("referral-clients")}
                />
              </SectionCard>
            </div>
          </>
        ) : null}

        {view === "referral-clients" ? (
          <>
            <BackBar onBack={() => setView("promo")} />
            <p className="mb-1 text-[0.8125rem] font-medium uppercase tracking-wider text-zinc-400">
              {t("profile.my_clients", "Ваши клиенты")}
            </p>
            <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
              {t(
                "profile.my_clients_hint",
                "Кто подключился по вашему коду",
              )}
            </p>
            <SectionCard>
              {clientsLoading ? (
                <p className="px-3 py-3 text-center text-xs text-zinc-400">
                  {t("common.loading", "Загрузка...")}
                </p>
              ) : referralClients.length === 0 ? (
                <p className="px-3 py-3 text-center text-xs text-zinc-400">
                  {t("profile.my_clients_empty", "Пока никто не подключился")}
                </p>
              ) : (
                referralClients.map((client, index) => {
                  const joined = formatReferredAt(client.referred_at);
                  return (
                    <div key={client.id}>
                      {index > 0 ? (
                        <div className="border-t border-zinc-100 dark:border-zinc-800" />
                      ) : null}
                      <div className="app-row app-row--between">
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-100">
                            {t("profile.client_anonymous", "Клиент")} {index + 1}
                          </span>
                          <span className="mt-0.5 block text-xs text-zinc-400">
                            {[
                              joined,
                              client.bonus_paid
                                ? t("profile.bonus_paid", "зачислено на баланс")
                                : t(
                                    "profile.client_waiting",
                                    "ожидает первую оплату",
                                  ),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </SectionCard>
          </>
        ) : null}

        {view === "support" ? (
          <>
            <BackBar onBack={() => setView("home")} />
            <div className="space-y-4">
              <SectionCard>
                <ProfileNavRow
                  label={support.telegram.title}
                  hint={support.telegram.hint}
                  onClick={() => openTelegram(support.telegram.url)}
                />
                <div className="border-t border-zinc-100 dark:border-zinc-800" />
                <ProfileNavRow
                  label={support.whatsapp.title}
                  hint={support.whatsapp.hint}
                  onClick={() => openWhatsApp(support.whatsapp.url)}
                />
              </SectionCard>

              <FaqSection />
            </div>
          </>
        ) : null}

        {view === "documents" ? (
          <>
            <BackBar onBack={() => setView("home")} />
            <SectionCard>
              {documents.map((doc, index) => (
                <div key={doc.id}>
                  {index > 0 ? (
                    <div className="border-t border-zinc-100 dark:border-zinc-800" />
                  ) : null}
                  <ProfileNavRow
                    icon={<IconDocs />}
                    label={doc.title}
                    onClick={
                      doc.url ? () => openBrowser(doc.url) : undefined
                    }
                  />
                </div>
              ))}
            </SectionCard>
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

        {logoutConfirmOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="presentation"
            onClick={() => setLogoutConfirmOpen(false)}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="logout-modal-title"
              className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
                <p
                  id="logout-modal-title"
                  className="text-center text-lg font-bold text-zinc-900 dark:text-zinc-50"
                >
                  {t("profile.logout_title", "Выйти из аккаунта?")}
                </p>
                <p className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  {t("profile.logout_confirm", "Вы уверены, что хотите выйти?")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 p-4">
                <button
                  type="button"
                  onClick={() => setLogoutConfirmOpen(false)}
                  className="theme-button-secondary"
                >
                  {t("common.cancel", "Отмена")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLogoutConfirmOpen(false);
                    forceLogout({
                      skipDebug: true,
                      reason: "Выход из профиля",
                      source: "ProfilePage",
                    });
                  }}
                  className="rounded-xl bg-[var(--app-danger)] px-4 py-3 text-sm font-semibold text-white"
                >
                  {t("profile.logout_yes", "Да, выйти")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </>
    </PageLayout>
  );
}
