"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import AppPreloader from "@/components/layout/AppPreloader";
import { fetchUserInfo, updateUserSettings } from "@/lib/api/auth";
import { ApiError } from "@/lib/api";
import { hasAccessToken } from "@/lib/authToken";
import { forceLogout } from "@/lib/forceLogout";
import { enterFullscreen, exitFullscreen } from "@/lib/fullscreenController";
import {
  getProfileCompleteCached,
  setProfileCompleteCached,
  syncProfileCompleteCache,
} from "@/lib/profileComplete";
import { useT } from "@/hooks/useT";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isHomePath(pathname: string | null): boolean {
  return pathname === "/" || pathname === "";
}

/**
 * Модалка только на главной: если нет имени / фамилии / email — заполнить.
 * Крестик → logout. Результат в localStorage (`profile_complete`).
 */
export default function ProfileCompleteGate() {
  const t = useT();
  const pathname = usePathname();
  const onHome = isHomePath(pathname);
  const titleId = useId();
  const savedRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkProfile = useCallback(async () => {
    if (!onHome) {
      setOpen(false);
      setChecking(false);
      return;
    }

    if (!hasAccessToken()) {
      setOpen(false);
      setChecking(false);
      return;
    }

    if (savedRef.current || getProfileCompleteCached() === true) {
      setOpen(false);
      setChecking(false);
      return;
    }

    const cached = getProfileCompleteCached();

    if (cached === false) {
      setOpen(true);
      setChecking(false);
    } else {
      setChecking(true);
    }

    try {
      const user = await fetchUserInfo();

      if (savedRef.current || getProfileCompleteCached() === true) {
        setOpen(false);
        setChecking(false);
        return;
      }

      setFirstName(user.name?.trim() ?? "");
      setLastName(user.last_name?.trim() ?? "");
      setEmail(user.email?.trim() ?? "");

      const complete = syncProfileCompleteCache(user);
      setOpen(!complete);
      setChecking(false);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr?.status === 401 || apiErr?.status === 403) {
        setOpen(false);
        setChecking(false);
        return;
      }

      if (getProfileCompleteCached() === false) {
        setOpen(true);
      } else {
        setOpen(false);
      }
      setChecking(false);
    }
  }, [onHome]);

  useEffect(() => {
    void checkProfile();
  }, [checkProfile]);

  useEffect(() => {
    if (!open || !onHome) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    enterFullscreen();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        forceLogout({
          immediate: true,
          reason: "Закрытие обязательной анкеты (Escape)",
          source: "ProfileCompleteGate",
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      exitFullscreen();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onHome]);

  const handleClose = () => {
    forceLogout({
      immediate: true,
      reason: "Закрытие обязательной анкеты без заполнения",
      source: "ProfileCompleteGate",
    });
  };

  const handleSave = async () => {
    const name = firstName.trim();
    const last_name = lastName.trim();
    const emailValue = email.trim();

    if (!name) {
      setError(t("profile.gate_name_required", "Укажите имя"));
      return;
    }
    if (!last_name) {
      setError(t("profile.gate_last_name_required", "Укажите фамилию"));
      return;
    }
    if (!emailValue) {
      setError(t("profile.gate_email_required", "Укажите email"));
      return;
    }
    if (!EMAIL_PATTERN.test(emailValue)) {
      setError(t("profile.gate_email_invalid", "Укажите корректный email"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const user = await updateUserSettings({
        name,
        last_name,
        email: emailValue,
      });

      savedRef.current = true;
      setProfileCompleteCached(true);
      setFirstName(user.name?.trim() ?? name);
      setLastName(user.last_name?.trim() ?? last_name);
      setEmail(user.email?.trim() ?? emailValue);
      setOpen(false);
      setChecking(false);
    } catch {
      setError(t("profile.gate_save_error", "Не удалось сохранить. Попробуйте ещё раз."));
    } finally {
      setSaving(false);
    }
  };

  if (!onHome) return null;

  if (checking) {
    return <AppPreloader />;
  }

  if (!open) return null;

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    !saving;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4" role="presentation">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[min(92dvh,640px)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-2xl sm:rounded-2xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div className="relative border-b border-zinc-200 px-5 pb-4 pt-5 dark:border-zinc-800">
          <button
            type="button"
            onClick={handleClose}
            aria-label={t("common.close", "Закрыть")}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>

          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">HiPoint</p>
          <h2
            id={titleId}
            className="mt-1 pr-10 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            {t("profile.gate_welcome", "Добро пожаловать!")}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {t(
              "profile.gate_subtitle",
              "Заполните информацию, чтобы продолжить пользоваться приложением.",
            )}
          </p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              {t("profile.gate_first_name", "Имя")} *
            </span>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={saving}
              placeholder={t("profile.gate_first_name", "Имя")}
              autoComplete="given-name"
              autoFocus
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              {t("profile.gate_last_name", "Фамилия")} *
            </span>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={saving}
              placeholder={t("profile.gate_last_name", "Фамилия")}
              autoComplete="family-name"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              Email *
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={saving}
              placeholder="example@mail.com"
              autoComplete="email"
              inputMode="email"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>

          {error ? (
            <p className="text-center text-xs text-red-600 dark:text-red-400">{error}</p>
          ) : null}
        </div>

        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void handleSave()}
            className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {saving
              ? t("common.saving", "Сохранение…")
              : t("profile.gate_continue", "Продолжить")}
          </button>
          <p className="mt-2 text-center text-[11px] leading-relaxed text-zinc-400">
            {t(
              "profile.gate_close_hint",
              "Закрытие окна вернёт вас к авторизации.",
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
