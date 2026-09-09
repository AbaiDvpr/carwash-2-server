"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout";
import AppBackButton from "@/components/ui/AppBackButton";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { deleteAccount } from "@/lib/api/auth";
import { ApiError } from "@/lib/api";
import { forceLogout } from "@/lib/forceLogout";
import { useEditProfile } from "./hooks/useEditProfile";
import ProfileNavRow from "./components/ProfileNavRow";
import "./components/profile.css";

function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" d="M10 4.5H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h3M14 8l4 4-4 4M10 12h8" />
    </svg>
  );
}

type EditAccountPageProps = {
  embedded?: boolean;
  onBack?: () => void;
};

export default function EditAccountPage({
  embedded = false,
  onBack,
}: EditAccountPageProps) {
  const t = useT();
  const router = useRouter();
  const { showToast } = useToast();
  const profileEdit = useEditProfile();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!logoutOpen && !deleteOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLogoutOpen(false);
        setDeleteOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [logoutOpen, deleteOpen]);

  function goBack() {
    if (onBack) onBack();
    else router.push("/profile");
  }

  async function confirmDeleteAccount() {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteAccount();
      setDeleteOpen(false);
      forceLogout({
        skipDebug: true,
        reason: "Аккаунт удалён",
        source: "EditAccountPage",
      });
    } catch (err) {
      const message =
        err instanceof ApiError &&
        typeof (err.body as { message?: string } | null)?.message === "string"
          ? (err.body as { message: string }).message
          : t("profile.delete_error", "Не удалось удалить аккаунт");
      showToast(message);
      setDeleting(false);
    }
  }

  const content = (
    <div className="profile-edit">
      <div className="app-back-bar">
        <AppBackButton
          title={t("profile.edit", "Редактирование профиля")}
          onClick={goBack}
        />
      </div>

      <div className="profile-edit__main space-y-4">
        <div className="profile-edit-fields">
          <label className="profile-edit-row">
            <span className="profile-edit-row__label">
              {t("profile.first_name", "Имя")}
            </span>
            <input
              type="text"
              value={profileEdit.firstName}
              onChange={(e) => {
                profileEdit.clearFeedback();
                profileEdit.setFirstName(e.target.value);
              }}
              disabled={profileEdit.loading || profileEdit.saving || deleting}
              placeholder={t("profile.first_name", "Имя")}
              autoComplete="given-name"
              className="profile-edit-row__value"
            />
          </label>
          <label className="profile-edit-row">
            <span className="profile-edit-row__label">
              {t("profile.last_name", "Фамилия")}
            </span>
            <input
              type="text"
              value={profileEdit.lastName}
              onChange={(e) => {
                profileEdit.clearFeedback();
                profileEdit.setLastName(e.target.value);
              }}
              disabled={profileEdit.loading || profileEdit.saving || deleting}
              placeholder={t("profile.last_name", "Фамилия")}
              autoComplete="family-name"
              className="profile-edit-row__value"
            />
          </label>
          <label className="profile-edit-row">
            <span className="profile-edit-row__label">Email</span>
            <input
              type="email"
              value={profileEdit.email}
              onChange={(e) => {
                profileEdit.clearFeedback();
                profileEdit.setEmail(e.target.value);
              }}
              disabled={profileEdit.loading || profileEdit.saving || deleting}
              placeholder="example@mail.com"
              autoComplete="email"
              inputMode="email"
              className="profile-edit-row__value"
            />
          </label>
        </div>

        <button
          type="button"
          disabled={!profileEdit.canSave || deleting}
          onClick={() => {
            void profileEdit.save().then((ok) => {
              if (!ok) return;
              showToast(t("common.saved", "Сохранено"));
              window.setTimeout(goBack, 350);
            });
          }}
          className="theme-button w-full"
        >
          {profileEdit.saving
            ? t("common.saving", "Сохранение…")
            : t("common.save", "Сохранить")}
        </button>

        <div className="profile-edit__delete">
          <button
            type="button"
            className="profile-edit__delete-btn"
            disabled={deleting}
            onClick={() => setDeleteOpen(true)}
          >
            {t("profile.delete_account", "Удалить аккаунт")}
          </button>
        </div>

        {profileEdit.message ? (
          <p className="profile-edit__feedback is-ok">{profileEdit.message}</p>
        ) : null}
        {profileEdit.error ? (
          <p className="profile-edit__feedback is-error">{profileEdit.error}</p>
        ) : null}
      </div>

      <div className="profile-edit__logout">
        <ProfileNavRow
          icon={<IconLogout />}
          label={t("profile.logout", "Выйти")}
          danger
          onClick={() => setLogoutOpen(true)}
        />
      </div>
    </div>
  );

  return (
    <>
      {embedded ? (
        content
      ) : (
        <PageLayout title={t("profile.edit", "Редактирование")} className="page--profile-edit">
          {content}
        </PageLayout>
      )}

      {logoutOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
          onClick={() => setLogoutOpen(false)}
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
                className="text-center font-bold"
                style={{
                  fontSize: "var(--app-text-lg)",
                  color: "var(--app-text)",
                  letterSpacing: "-0.01em",
                }}
              >
                {t("profile.logout_title", "Выйти из аккаунта?")}
              </p>
              <p
                className="mt-2 text-center"
                style={{
                  fontSize: "var(--app-text-sm)",
                  color: "var(--app-description)",
                }}
              >
                {t("profile.logout_confirm", "Вы уверены, что хотите выйти?")}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4">
              <button
                type="button"
                onClick={() => setLogoutOpen(false)}
                className="theme-button-secondary"
              >
                {t("common.cancel", "Отмена")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLogoutOpen(false);
                  forceLogout({
                    skipDebug: true,
                    reason: "Выход из профиля",
                    source: "EditAccountPage",
                  });
                }}
                className="theme-button"
                style={{ background: "var(--app-danger)" }}
              >
                {t("profile.logout_yes", "Да, выйти")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
          onClick={() => {
            if (!deleting) setDeleteOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-modal-title"
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <p
                id="delete-account-modal-title"
                className="text-center font-bold"
                style={{
                  fontSize: "var(--app-text-lg)",
                  color: "var(--app-text)",
                  letterSpacing: "-0.01em",
                }}
              >
                {t("profile.delete_title", "Удалить аккаунт?")}
              </p>
              <p
                className="mt-2 text-center"
                style={{
                  fontSize: "var(--app-text-sm)",
                  color: "var(--app-description)",
                }}
              >
                {t("profile.delete_confirm", "Мы удалим ваш аккаунт.")}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteOpen(false)}
                className="theme-button-secondary"
              >
                {t("common.cancel", "Отмена")}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void confirmDeleteAccount()}
                className="theme-button"
                style={{ background: "var(--app-danger)" }}
              >
                {deleting
                  ? t("common.saving", "Сохранение…")
                  : t("profile.delete_yes", "Да, удалить")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
