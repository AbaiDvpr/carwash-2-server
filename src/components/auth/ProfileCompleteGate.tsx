"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import AppPreloader from "@/components/layout/AppPreloader";
import { PageLayout } from "@/components/layout";
import { fetchUserInfo, updateUserSettings } from "@/lib/api/auth";
import { ApiError } from "@/lib/api";
import { hasAccessToken } from "@/lib/authToken";
import { emailTakenFromApiError } from "@/lib/emailCheck";
import { forceLogout } from "@/lib/forceLogout";
import { enterFullscreen, exitFullscreen } from "@/lib/fullscreenController";
import {
  getProfileCompleteCached,
  setProfileCompleteCached,
  syncProfileCompleteCache,
} from "@/lib/profileComplete";
import { useT } from "@/hooks/useT";
import { cacheUserProfile } from "@/lib/userSession";
import { useUniqueEmail } from "@/features/profile/hooks/useUniqueEmail";
import "@/features/profile/components/profile.css";

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
  const fieldId = useId();
  const firstNameId = `${fieldId}-first`;
  const lastNameId = `${fieldId}-last`;
  const emailId = `${fieldId}-email`;
  const {
    emailError,
    taken: emailTaken,
    checking: checkingEmail,
    check: checkEmail,
    clear: clearEmailError,
    markTaken,
  } = useUniqueEmail();

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
      const prevOverflow = body.style.overflow;
      root.classList.add("profile-gate-open");
      body.style.overflow = "hidden";
      const lockHeight = Math.max(window.innerHeight, 500);
      root.style.setProperty("--gate-lock-height", `${lockHeight}px`);

      const pinScroll = () => {
        window.scrollTo(0, 0);
        root.scrollTop = 0;
        body.scrollTop = 0;
        const shell = document.querySelector(".app-shell");
        if (shell instanceof HTMLElement) shell.scrollTop = 0;
      };
      pinScroll();
      window.addEventListener("scroll", pinScroll, true);

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
        root.style.removeProperty("--gate-lock-height");
        body.style.overflow = prevOverflow;
        window.removeEventListener("scroll", pinScroll, true);
        window.removeEventListener("keydown", onKeyDown);
        exitFullscreen();
      };
    }

    document.documentElement.classList.remove("profile-gate-open");
    document.documentElement.style.removeProperty("--gate-lock-height");
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

    const emailOk = await checkEmail(emailValue);
    if (!emailOk) {
      setError(null);
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
      if (emailTakenFromApiError(err)) {
        markTaken();
        setError(null);
      } else {
        const body = apiErr?.body as
          | { message?: string; errors?: Record<string, string[]> }
          | null;
        const field = body?.errors?.email?.[0];
        if (field) {
          setError(field);
        } else {
          setError(
            t("profile.gate_save_error", "Не удалось сохранить. Попробуйте ещё раз."),
          );
        }
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
    firstName.trim().length > 0 &&
    email.trim().length > 0 &&
    !emailTaken &&
    !checkingEmail &&
    !saving;

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
            <div className="profile-edit-row">
              <label className="profile-edit-row__label" htmlFor={firstNameId}>
                {t("profile.first_name", "Имя")}{" "}
                <span className="profile-gate-page__req" aria-hidden>
                  *
                </span>
              </label>
              <input
                id={firstNameId}
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
              />
            </div>
            <div className="profile-edit-row">
              <label className="profile-edit-row__label" htmlFor={lastNameId}>
                {t("profile.last_name", "Фамилия")}{" "}
                <span style={{ fontWeight: 500, color: "var(--app-description)" }}>
                  ({t("common.optional", "необязательно")})
                </span>
              </label>
              <input
                id={lastNameId}
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
              />
            </div>
            <div className="profile-edit-row">
              <label className="profile-edit-row__label" htmlFor={emailId}>
                Email{" "}
                <span className="profile-gate-page__req" aria-hidden>
                  *
                </span>
              </label>
              <input
                id={emailId}
                type="email"
                value={email}
                onChange={(e) => {
                  setError(null);
                  clearEmailError();
                  setEmail(e.target.value);
                }}
                onBlur={(e) => {
                  void checkEmail(e.target.value, { required: false });
                }}
                disabled={saving}
                placeholder="example@mail.com"
                autoComplete="email"
                inputMode="email"
                enterKeyHint="done"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={Boolean(emailError)}
                className={`profile-edit-row__value${emailError ? " is-invalid" : ""}`}
              />
              {emailError ? (
                <p className="profile-edit-row__error" role="alert">
                  {emailError}
                </p>
              ) : null}
            </div>
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

          {error && !emailError ? (
            <p className="profile-edit__feedback is-error">{error}</p>
          ) : null}
        </div>
      </div>
    </PageLayout>
  );
}
