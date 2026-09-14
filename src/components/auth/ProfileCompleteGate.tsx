"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import AppPreloader from "@/components/layout/AppPreloader";
import { PageLayout } from "@/components/layout";
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
import "@/features/profile/components/profile.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isHomePath(pathname: string | null): boolean {
  return pathname === "/" || pathname === "";
}

/**
 * На главной, если нет имени / email — обычная страница как /profile/edit.
 * Карту не показываем. Фамилия необязательна. Назад → logout.
 */
export default function ProfileCompleteGate({ children }: { children: ReactNode }) {
  const t = useT();
  const pathname = usePathname();
  const onHome = isHomePath(pathname);
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
    if (open && onHome) {
      enterFullscreen();
      const root = document.documentElement;
      const body = document.body;
      const prev = {
        position: body.style.position,
        top: body.style.top,
        left: body.style.left,
        right: body.style.right,
        overflow: body.style.overflow,
      };
      root.classList.add("profile-gate-open");
      body.style.position = "fixed";
      body.style.top = "0";
      body.style.left = "0";
      body.style.right = "0";
      body.style.overflow = "hidden";

      const pin = () => {
        const vv = window.visualViewport;
        const height = vv?.height ?? window.innerHeight;
        root.style.setProperty("--gate-vv-top", "0px");
        root.style.setProperty("--gate-vv-height", `${Math.round(height)}px`);
        window.scrollTo(0, 0);
        root.scrollTop = 0;
        body.scrollTop = 0;
        const shell = document.querySelector(".app-shell");
        if (shell instanceof HTMLElement) shell.scrollTop = 0;
      };
      pin();

      const vv = window.visualViewport;
      vv?.addEventListener("resize", pin);
      vv?.addEventListener("scroll", pin);
      window.addEventListener("scroll", pin, true);

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
        root.classList.remove("profile-gate-open");
        root.style.removeProperty("--gate-vv-top");
        root.style.removeProperty("--gate-vv-height");
        body.style.position = prev.position;
        body.style.top = prev.top;
        body.style.left = prev.left;
        body.style.right = prev.right;
        body.style.overflow = prev.overflow;
        vv?.removeEventListener("resize", pin);
        vv?.removeEventListener("scroll", pin);
        window.removeEventListener("scroll", pin, true);
        exitFullscreen();
        window.removeEventListener("keydown", onKeyDown);
      };
    }

    document.documentElement.classList.remove("profile-gate-open");
    exitFullscreen();
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

  if (!onHome) return children;

  if (checking) {
    return <AppPreloader />;
  }

  if (!open) return children;

  const canSubmit =
    firstName.trim().length > 0 && email.trim().length > 0 && !saving;

  return (
    <PageLayout
      title={t("profile.edit", "Редактирование профиля")}
      className="page--profile-edit page--profile-gate"
    >
      <div className="profile-edit profile-gate-page">
        <div className="profile-gate-page__top">
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

        <div className="profile-edit__main space-y-4">
          <h1 className="profile-gate-page__title">
            {t("profile.gate_title", "Заполните информацию")}
          </h1>

          <div className="profile-edit-fields">
            <label className="profile-edit-row">
              <span className="profile-edit-row__label">
                {t("profile.first_name", "Имя")}{" "}
                <span className="profile-gate-page__req" aria-hidden>
                  *
                </span>
              </span>
              <input
                type="text"
                value={firstName}
                onChange={(e) => {
                  setError(null);
                  setFirstName(e.target.value);
                }}
                disabled={saving}
                placeholder={t("profile.first_name", "Имя")}
                autoComplete="given-name"
                className="profile-edit-row__value"
                onFocus={() => window.scrollTo(0, 0)}
              />
            </label>
            <label className="profile-edit-row">
              <span className="profile-edit-row__label">
                {t("profile.last_name", "Фамилия")}{" "}
                <span style={{ fontWeight: 500, color: "var(--app-description)" }}>
                  ({t("common.optional", "необязательно")})
                </span>
              </span>
              <input
                type="text"
                value={lastName}
                onChange={(e) => {
                  setError(null);
                  setLastName(e.target.value);
                }}
                disabled={saving}
                placeholder={t("profile.last_name", "Фамилия")}
                autoComplete="family-name"
                className="profile-edit-row__value"
                onFocus={() => window.scrollTo(0, 0)}
              />
            </label>
            <label className="profile-edit-row">
              <span className="profile-edit-row__label">
                Email{" "}
                <span className="profile-gate-page__req" aria-hidden>
                  *
                </span>
              </span>
              <input
                type="text"
                value={email}
                onChange={(e) => {
                  setError(null);
                  setEmail(e.target.value);
                }}
                disabled={saving}
                placeholder="example@mail.com"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="profile-edit-row__value"
                onFocus={() => window.scrollTo(0, 0)}
              />
            </label>
          </div>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void handleSave()}
            className="theme-button w-full"
          >
            {saving
              ? t("common.saving", "Сохранение…")
              : t("profile.gate_continue", "Продолжить")}
          </button>

          {error ? (
            <p className="profile-edit__feedback is-error">{error}</p>
          ) : null}
        </div>
      </div>
    </PageLayout>
  );
}
