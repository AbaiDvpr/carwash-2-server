"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PageLayout } from "@/components/layout";
import { useAuthUser } from "@/hooks/useAuthUser";
import { forceLogout } from "@/lib/forceLogout";
import { openTelegram, openWhatsApp } from "@/lib/messengerController";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleHeaderNav } from "@/store/slices/appSlice";
import HistoryList from "@/features/history/components/HistoryList";
import BackButton from "@/components/ui/BackButton";
import Toast from "@/components/ui/Toast";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { useUserCity } from "@/hooks/useUserCity";
import { updateUserSettings } from "@/lib/api/auth";
import { formatCityName } from "@/lib/api/geos";
import { useEditProfile } from "./hooks/useEditProfile";
import { usePromoCode } from "./hooks/usePromoCode";
import { usePushNotifications } from "./hooks/usePushNotifications";
import { useUserBalance } from "./hooks/useUserBalance";
import BalanceCard from "./components/BalanceCard";
import BalanceTopUp from "./components/BalanceTopUp";
import AvatarCropper from "./components/AvatarCropper";
import GaragePanel, { type MockCar } from "./components/GaragePanel";
import ProfileNavRow from "./components/ProfileNavRow";
import ProfileVersion from "./components/ProfileVersion";
import { deleteUserPhoto, resolveMediaUrl, uploadUserPhoto } from "@/lib/api/photo";
import { pickImage } from "@/lib/pickImage";

type ProfileView =
  | "home"
  | "edit"
  | "balance"
  | "history"
  | "garage"
  | "promo"
  | "referral"
  | "support"
  | "faq"
  | "language"
  | "city";

const LANGUAGE_OPTIONS = [
  { id: "ru", label: "Русский", code: "RU" },
  { id: "kz", label: "Қазақша", code: "KZ" },
  { id: "en", label: "English", code: "EN" },
] as const;

const FAQ_ITEMS = [
  {
    id: "payment",
    question: "Как оплатить мойку?",
    answer:
      "Выберите мойку на карте, откройте оплату, выберите тариф и подтвердите платёж.",
  },
  {
    id: "refund",
    question: "Можно ли вернуть деньги?",
    answer: "Если услуга не оказана — напишите в поддержку, разберём в течение 24 часов.",
  },
  {
    id: "promo",
    question: "Как использовать промокод?",
    answer: "Введите код в разделе «Промокод». Скидка учтётся при следующей оплате.",
  },
  {
    id: "referral",
    question: "Как работает рефералка?",
    answer: "Поделитесь ссылкой. После первой оплаты друга оба получите бонус.",
  },
];

const REFERRAL_CODE = "CARWASH-FRIEND";
const REFERRAL_LINK = "https://carwash.app/invite/CARWASH-FRIEND";

const INITIAL_CARS: MockCar[] = [
  { id: 1, plate: "777AAA01" },
  { id: 2, plate: "101ABC02" },
];

function SectionCard({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1.5 px-0.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
      {children}
    </p>
  );
}

/** Круглый radio-индикатор в списках выбора */
function RadioMark({ checked, busy = false }: { checked: boolean; busy?: boolean }) {
  return (
    <span
      className={[
        "relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
        checked
          ? "border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500"
          : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900",
        busy ? "opacity-60" : "",
      ].join(" ")}
      aria-hidden
    >
      {busy ? (
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white/80" />
      ) : checked ? (
        <span className="h-2 w-2 rounded-full bg-white" />
      ) : null}
    </span>
  );
}

function BackBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <BackButton onClick={onBack} />
      <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h1>
    </div>
  );
}

export default function ProfilePage() {
  const { name, photoUrl, mounted } = useAuthUser();
  const dispatch = useAppDispatch();
  const appVersion = useAppSelector((state) => state.app.version);
  const showHeaderNav = useAppSelector((state) => state.app.showHeaderNav);
  const { promoCode, promoMessage, applyPromo, updatePromoCode } = usePromoCode();
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
  const { isDark, toggleTheme } = useTheme();
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
  const [cars, setCars] = useState<MockCar[]>(INITIAL_CARS);
  const [copied, setCopied] = useState(false);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const avatarSrc = resolveMediaUrl(photoUrl);

  useEffect(() => {
    if (!logoutConfirmOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLogoutConfirmOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [logoutConfirmOpen]);

  const displayName = mounted ? name || "…" : "…";
  const displayEmail = mounted ? profileEdit.email || "Не указан" : "…";
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
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarSrc}
          alt=""
          className={`shrink-0 rounded-full object-cover ${box}`}
        />
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
    try {
      await navigator.clipboard.writeText(REFERRAL_LINK);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <PageLayout title="Profile" description="Профиль пользователя CarWash">
      <>
        {view === "home" ? (
          <>
            <header className="mb-5">
              <button
                type="button"
                onClick={() => setView("edit")}
                className="flex w-full items-center gap-3 rounded-xl text-left transition hover:opacity-90"
              >
                <AvatarBubble />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                    Профиль
                  </span>
                  <span className="mt-0.5 block truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {displayName}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-blue-600 dark:text-blue-400">
                    Изменить профиль
                  </span>
                </span>
                <svg
                  className="h-4 w-4 shrink-0 text-zinc-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path strokeLinecap="round" d="m9 6 6 6-6 6" />
                </svg>
              </button>
            </header>

            <div className="space-y-5">
              <BalanceCard
                balance={balance}
                loading={balanceLoading}
                onTopUp={() => setView("balance")}
                onHistory={() => setView("history")}
              />

              <section>
                <SectionTitle>Настройки</SectionTitle>
                <SectionCard>
                  <ProfileNavRow
                    label="Имя и фамилия"
                    hint={displayName}
                    onClick={() => setView("edit")}
                  />
                  <div className="border-t border-zinc-100 dark:border-zinc-800" />
                  <ProfileNavRow
                    label="Email"
                    hint={displayEmail}
                    onClick={() => setView("edit")}
                  />
                  <div className="border-t border-zinc-100 dark:border-zinc-800" />
                  <ProfileNavRow
                    label="Ваш город"
                    hint={cityName ?? "Не выбран"}
                    onClick={() => setView("city")}
                  />
                  <div className="border-t border-zinc-100 dark:border-zinc-800" />
                  <ProfileNavRow
                    label="Язык"
                    hint="Русский"
                    onClick={() => setView("language")}
                  />
                  <div className="border-t border-zinc-100 dark:border-zinc-800" />
                  <button
                    type="button"
                    onClick={() => toggleTheme()}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-100">
                        Тёмный режим
                      </span>
                      <span className="mt-0.5 block text-[11px] text-zinc-400">
                        {isDark ? "Включён" : "Выключен · светлая тема"}
                      </span>
                    </span>
                    <span
                      className={[
                        "relative h-5 w-9 shrink-0 rounded-full transition",
                        isDark ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-700",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition",
                          isDark ? "left-4" : "left-0.5",
                        ].join(" ")}
                      />
                    </span>
                  </button>
                  <div className="border-t border-zinc-100 dark:border-zinc-800" />
                  <button
                    type="button"
                    onClick={() => void togglePush()}
                    disabled={pushLoading || pushSaving}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-zinc-50 disabled:opacity-60 dark:hover:bg-zinc-900/60"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-100">
                        Уведомления
                      </span>
                      <span className="mt-0.5 block text-[11px] text-zinc-400">
                        {pushHint}
                      </span>
                    </span>
                    <span
                      className={[
                        "relative h-5 w-9 shrink-0 rounded-full transition",
                        pushLoading
                          ? "bg-zinc-200 dark:bg-zinc-700"
                          : pushEnabled
                            ? "bg-blue-600"
                            : "bg-zinc-200 dark:bg-zinc-700",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition",
                          !pushLoading && pushEnabled ? "left-4" : "left-0.5",
                        ].join(" ")}
                      />
                    </span>
                  </button>
                  <div className="border-t border-zinc-100 dark:border-zinc-800" />
                  <button
                    type="button"
                    onClick={() => dispatch(toggleHeaderNav())}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-100">
                        Навигация в header
                      </span>
                      <span className="mt-0.5 block text-[11px] text-zinc-400">
                        {showHeaderNav ? "Показана" : "Скрыта"}
                      </span>
                    </span>
                    <span
                      className={[
                        "relative h-5 w-9 shrink-0 rounded-full transition",
                        showHeaderNav ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-700",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition",
                          showHeaderNav ? "left-4" : "left-0.5",
                        ].join(" ")}
                      />
                    </span>
                  </button>
                </SectionCard>
              </section>

              <section>
                <SectionTitle>Разделы</SectionTitle>
                <SectionCard>
                  <ProfileNavRow
                    label="Гараж"
                    hint={`${cars.length} авто`}
                    onClick={() => setView("garage")}
                  />
                  <div className="border-t border-zinc-100 dark:border-zinc-800" />
                  <ProfileNavRow
                    label="Промокод"
                    hint="Применить скидку"
                    onClick={() => setView("promo")}
                  />
                  <div className="border-t border-zinc-100 dark:border-zinc-800" />
                  <ProfileNavRow
                    label="Рефералка"
                    hint={REFERRAL_CODE}
                    onClick={() => setView("referral")}
                  />
                  <div className="border-t border-zinc-100 dark:border-zinc-800" />
                  <ProfileNavRow
                    label="Поддержка"
                    hint="Telegram · WhatsApp"
                    onClick={() => setView("support")}
                  />
                  <div className="border-t border-zinc-100 dark:border-zinc-800" />
                  <ProfileNavRow label="FAQ" hint="Частые вопросы" onClick={() => setView("faq")} />
                </SectionCard>
              </section>

              <section>
                <SectionCard>
                  <ProfileNavRow
                    label="Выйти"
                    danger
                    onClick={() => setLogoutConfirmOpen(true)}
                  />
                </SectionCard>
              </section>
            </div>

            <ProfileVersion version={appVersion} />
          </>
        ) : null}

        {view === "balance" ? (
          <>
            <BackBar title="Пополнить" onBack={() => setView("home")} />
            <BalanceTopUp
              balance={balance}
              loading={balanceLoading}
              onSuccess={() => void refreshBalance()}
            />
          </>
        ) : null}

        {view === "history" ? (
          <>
            <BackBar title="История" onBack={() => setView("home")} />
            <HistoryList />
          </>
        ) : null}

        {view === "edit" ? (
          <>
            <BackBar title="Профиль" onBack={() => setView("home")} />
            <div className="space-y-4">
              <SectionCard>
                <div className="flex flex-col items-center gap-3 px-3 py-4">
                  <AvatarBubble size="lg" />
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      disabled={photoBusy}
                      onClick={() => void handlePickPhoto()}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {photoUrl ? "Изменить фото" : "Добавить фото"}
                    </button>
                    {photoUrl ? (
                      <button
                        type="button"
                        disabled={photoBusy}
                        onClick={() => void handleDeletePhoto()}
                        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50 dark:border-red-900 dark:text-red-400"
                      >
                        Удалить
                      </button>
                    ) : null}
                  </div>
                </div>
              </SectionCard>

              <SectionCard>
                <div className="space-y-3 px-3 py-3">
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                      Имя
                    </span>
                    <input
                      type="text"
                      value={profileEdit.firstName}
                      onChange={(e) => profileEdit.setFirstName(e.target.value)}
                      disabled={profileEdit.loading || profileEdit.saving}
                      placeholder="Имя"
                      autoComplete="given-name"
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:bg-zinc-950"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                      Фамилия
                    </span>
                    <input
                      type="text"
                      value={profileEdit.lastName}
                      onChange={(e) => profileEdit.setLastName(e.target.value)}
                      disabled={profileEdit.loading || profileEdit.saving}
                      placeholder="Фамилия"
                      autoComplete="family-name"
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:bg-zinc-950"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                      Email
                    </span>
                    <input
                      type="email"
                      value={profileEdit.email}
                      onChange={(e) => profileEdit.setEmail(e.target.value)}
                      disabled={profileEdit.loading || profileEdit.saving}
                      placeholder="example@mail.com"
                      autoComplete="email"
                      inputMode="email"
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:bg-zinc-950"
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
                className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                {profileEdit.saving ? "Сохранение…" : "Сохранить"}
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
          </>
        ) : null}

        {view === "city" ? (
          <>
            <BackBar title="Ваш город" onBack={() => setView("home")} />
            <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
              Мойки и ЭЗС показываются только в выбранном городе.
            </p>
            {citiesLoading ? (
              <div className="h-28 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
            ) : (
              <SectionCard>
                {cities.map((city, index) => {
                  const selected = geoId === city.id;
                  const busy = citySavingId === city.id;
                  return (
                    <div key={city.id}>
                      {index > 0 ? (
                        <div className="border-t border-zinc-100 dark:border-zinc-800" />
                      ) : null}
                      <button
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
                              showToast(`Город: ${formatCityName(city.city)}`);
                              setView("home");
                            } catch {
                              showToast("Не удалось сохранить город");
                            } finally {
                              setCitySavingId(null);
                            }
                          })();
                        }}
                        className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-zinc-50 disabled:opacity-60 dark:hover:bg-zinc-900/60"
                      >
                        <RadioMark checked={selected} busy={busy} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-100">
                            {formatCityName(city.city)}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-zinc-400">
                            {city.country}
                          </span>
                        </span>
                      </button>
                    </div>
                  );
                })}
              </SectionCard>
            )}
          </>
        ) : null}

        {view === "language" ? (
          <>
            <BackBar title="Язык" onBack={() => setView("home")} />
            <SectionCard>
              {LANGUAGE_OPTIONS.map((lang, index) => (
                <div key={lang.id}>
                  {index > 0 ? (
                    <div className="border-t border-zinc-100 dark:border-zinc-800" />
                  ) : null}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={lang.id === "ru"}
                    onClick={() =>
                      showToast("Пока переключение языков отсутствует")
                    }
                    className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                  >
                    <RadioMark checked={lang.id === "ru"} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-100">
                        {lang.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-zinc-400">
                        {lang.code}
                      </span>
                    </span>
                  </button>
                </div>
              ))}
            </SectionCard>
          </>
        ) : null}

        {view === "garage" ? (
          <>
            <BackBar title="Гараж" onBack={() => setView("home")} />
            <GaragePanel cars={cars} onChange={setCars} />
          </>
        ) : null}

        {view === "promo" ? (
          <>
            <BackBar title="Промокод" onBack={() => setView("home")} />
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => updatePromoCode(e.target.value)}
                placeholder="Введите код"
                className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
              <button
                type="button"
                onClick={applyPromo}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                OK
              </button>
            </div>
            {promoMessage ? (
              <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">{promoMessage}</p>
            ) : (
              <p className="mt-2 text-xs text-zinc-400">Дизайн без API — подтверждение локальное.</p>
            )}
          </>
        ) : null}

        {view === "referral" ? (
          <>
            <BackBar title="Рефералка" onBack={() => setView("home")} />
            <SectionCard>
              <div className="px-3 py-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Поделитесь ссылкой — бонус после первой мойки друга
                </p>
                <p className="mt-3 font-mono text-base font-semibold tracking-wide text-zinc-900 dark:text-zinc-50">
                  {REFERRAL_CODE}
                </p>
                <button
                  type="button"
                  onClick={() => void handleCopyReferral()}
                  className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                >
                  {copied ? "Скопировано" : "Скопировать ссылку"}
                </button>
              </div>
            </SectionCard>
          </>
        ) : null}

        {view === "support" ? (
          <>
            <BackBar title="Поддержка" onBack={() => setView("home")} />
            <SectionCard>
              <ProfileNavRow
                label="Telegram"
                hint="@carwash_support"
                onClick={() => openTelegram("https://t.me/carwash_support")}
              />
              <div className="border-t border-zinc-100 dark:border-zinc-800" />
              <ProfileNavRow
                label="WhatsApp"
                hint="Написать в чат"
                onClick={() => openWhatsApp("https://wa.me/77001234567")}
              />
            </SectionCard>
          </>
        ) : null}

        {view === "faq" ? (
          <>
            <BackBar title="FAQ" onBack={() => setView("home")} />
            <SectionCard>
              {FAQ_ITEMS.map((item, index) => {
                const isOpen = openFaqId === item.id;
                return (
                  <div key={item.id}>
                    {index > 0 ? (
                      <div className="border-t border-zinc-100 dark:border-zinc-800" />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                      className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-100">
                          {item.question}
                        </span>
                        {isOpen ? (
                          <span className="mt-1 block text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                            {item.answer}
                          </span>
                        ) : null}
                      </span>
                      <svg
                        className={`mt-1 h-3.5 w-3.5 shrink-0 text-zinc-300 transition ${isOpen ? "rotate-180" : ""}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden
                      >
                        <path strokeLinecap="round" d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                );
              })}
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
                  Выйти из аккаунта?
                </p>
                <p className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  Вы уверены, что хотите выйти?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 p-4">
                <button
                  type="button"
                  onClick={() => setLogoutConfirmOpen(false)}
                  className="flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLogoutConfirmOpen(false);
                    forceLogout({
                      immediate: true,
                      reason: "Выход из профиля",
                      source: "ProfilePage",
                    });
                  }}
                  className="flex items-center justify-center rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Да, выйти
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </>
    </PageLayout>
  );
}
