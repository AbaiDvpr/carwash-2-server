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
import { cacheUserProfile } from "@/lib/userSession";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isHomePath(pathname: string | null): boolean {
  return pathname === "/" || pathname === "";
}

/**
 * Sheet на главной (как drawer на карте): если нет имени / email — заполнить.
 * Фамилия необязательна. Крестик → logout.
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

    // Ждём user_info до показа формы — иначе ответ API затирает уже введённый email
    setChecking(true);

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
          skipDebug: true,
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
      skipDebug: true,
      reason: "Закрытие обязательной анкеты без заполнения",
      source: "ProfileCompleteGate",
    });
  };

  const handleSave = async () => {
    const name = firstName.trim();
    const last_name = lastName.trim() || null;
    const emailValue = email.trim();

    if (!name) {
      setError(t("profile.gate_name_required", "Укажите имя"));
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

      const savedName = user.name?.trim() || name;
      const savedEmail = user.email?.trim() || emailValue;
      const savedLastName = user.last_name?.trim() || last_name || "";

      // Сначала помечаем сохранённым — чтобы параллельный user_info не открыл анкету снова
      savedRef.current = true;
      setProfileCompleteCached(true);
      cacheUserProfile({
        id: user.id,
        name: savedName,
        last_name: savedLastName || null,
        email: savedEmail,
      });
      syncProfileCompleteCache({
        name: savedName,
        last_name: savedLastName || null,
        email: savedEmail,
      });

      setFirstName(savedName);
      setLastName(savedLastName);
      setEmail(savedEmail);
      setOpen(false);
      setChecking(false);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      const body = apiErr?.body as
        | { message?: string; errors?: Record<string, string[]> }
        | null;
      const emailErr = body?.errors?.email?.[0];
      if (emailErr) {
        setError(
          /taken|unique|уже/i.test(emailErr)
            ? t("profile.gate_email_taken", "Этот email уже занят")
            : emailErr,
        );
      } else {
        setError(
          t("profile.gate_save_error", "Не удалось сохранить. Попробуйте ещё раз."),
        );
      }
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
    firstName.trim().length > 0 && email.trim().length > 0 && !saving;

  const fieldClass =
    "theme-field w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition disabled:opacity-60";

  return (
    <>
      <div className="app-bottom-sheet-backdrop" aria-hidden />

      <div
        className="app-bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="app-bottom-sheet__toolbar">
          <button
            type="button"
            onClick={handleClose}
            aria-label={t("common.close", "Закрыть")}
            className="app-drawer-close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="app-bottom-sheet__body">
          <div>
            <h2 id={titleId} className="app-bottom-sheet__title">
              {t("profile.gate_welcome", "Добро пожаловать!")}
            </h2>
            <p className="app-bottom-sheet__subtitle">
              {t(
                "profile.gate_subtitle",
                "Заполните информацию, чтобы продолжить пользоваться приложением.",
              )}
            </p>
          </div>

          <div className="app-bottom-sheet__fields">
            <label className="block">
              <span className="app-bottom-sheet__label">
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
                className={fieldClass}
                style={{
                  borderColor: "var(--app-border)",
                  background: "var(--app-hover)",
                  color: "var(--app-text)",
                }}
              />
            </label>

            <label className="block">
              <span className="app-bottom-sheet__label">
                {t("profile.gate_last_name", "Фамилия")}{" "}
                <span className="font-normal">
                  ({t("common.optional", "необязательно")})
                </span>
              </span>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={saving}
                placeholder={t(
                  "profile.gate_last_name_optional",
                  "Фамилия (необязательно)",
                )}
                autoComplete="family-name"
                className={fieldClass}
                style={{
                  borderColor: "var(--app-border)",
                  background: "var(--app-hover)",
                  color: "var(--app-text)",
                }}
              />
            </label>

            <label className="block">
              <span className="app-bottom-sheet__label">Email *</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={saving}
                placeholder="example@mail.com"
                autoComplete="email"
                inputMode="email"
                className={fieldClass}
                style={{
                  borderColor: "var(--app-border)",
                  background: "var(--app-hover)",
                  color: "var(--app-text)",
                }}
              />
            </label>

            {error ? <p className="app-bottom-sheet__error">{error}</p> : null}
          </div>
        </div>

        <div className="app-bottom-sheet__footer">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void handleSave()}
            className="theme-button"
          >
            {saving
              ? t("common.saving", "Сохранение…")
              : t("profile.gate_continue", "Продолжить")}
          </button>
          <p className="app-bottom-sheet__hint">
            {t(
              "profile.gate_close_hint",
              "Закрытие окна вернёт вас к авторизации.",
            )}
          </p>
        </div>
      </div>
    </>
  );
}
