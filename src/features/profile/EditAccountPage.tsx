"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout";
import AppBackButton from "@/components/ui/AppBackButton";
import { useLocale, useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { deleteAccount } from "@/lib/api/auth";
import { fetchGaragesV2 } from "@/lib/api/garageV2";
import { ApiError } from "@/lib/api";
import { forceLogout } from "@/lib/forceLogout";
import { useEditProfile } from "./hooks/useEditProfile";
import "./components/profile.css";

type EditAccountPageProps = {
  embedded?: boolean;
  onBack?: () => void;
};

export default function EditAccountPage({
  embedded = false,
  onBack,
}: EditAccountPageProps) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const { showToast } = useToast();
  const profileEdit = useEditProfile();
  const fieldId = useId();
  const firstNameId = `${fieldId}-first`;
  const lastNameId = `${fieldId}-last`;
  const emailId = `${fieldId}-email`;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [onSiteBlock, setOnSiteBlock] = useState(false);
  const [checkingSite, setCheckingSite] = useState(false);

  const onSiteTitle = t("profile.delete_on_site_title", "Нельзя удалить аккаунт");
  const onSiteText = t(
    "profile.delete_on_site",
    locale === "en"
      ? "You can’t delete the account: you are on site now. Leave first."
      : locale === "kz"
        ? "Аккаунтты жоюға болмайды: сіз қазір алаңдасыз. Алдымен шығыңыз."
        : "Вы не сможете удалить аккаунт: вы сейчас на площадке. Сначала выедьте.",
  );

  useEffect(() => {
    if (!deleteOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) setDeleteOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteOpen, deleting]);

  function goBack() {
    if (onBack) onBack();
    else router.push("/profile");
  }

  async function openDeleteModal() {
    if (deleting) return;
    setDeleteOpen(true);
    setOnSiteBlock(false);
    setCheckingSite(true);
    try {
      const cars = await fetchGaragesV2();
      setOnSiteBlock(cars.some((car) => car.on_territory === true));
    } catch {
      setOnSiteBlock(false);
    } finally {
      setCheckingSite(false);
    }
  }

  async function confirmDeleteAccount() {
    if (deleting || onSiteBlock || checkingSite) return;
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
      const body =
        err instanceof ApiError
          ? (err.body as { code?: string } | null)
          : null;
      if (body?.code === "on_territory") {
        setOnSiteBlock(true);
      } else {
        showToast(t("profile.delete_error", "Не удалось удалить аккаунт"));
      }
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
          <div className="profile-edit-row">
            <label className="profile-edit-row__label" htmlFor={firstNameId}>
              {t("profile.first_name", "Имя")}
            </label>
            <input
              id={firstNameId}
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
          </div>
          <div className="profile-edit-row">
            <label className="profile-edit-row__label" htmlFor={lastNameId}>
              {t("profile.last_name", "Фамилия")}
            </label>
            <input
              id={lastNameId}
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
          </div>
          <div className="profile-edit-row">
            <label className="profile-edit-row__label" htmlFor={emailId}>
              Email
            </label>
            <input
              id={emailId}
              type="email"
              value={profileEdit.email}
              onChange={(e) => {
                profileEdit.clearFeedback();
                profileEdit.setEmail(e.target.value);
              }}
              onBlur={(e) => {
                void profileEdit.checkEmail(e.target.value, { required: false });
              }}
              disabled={profileEdit.loading || profileEdit.saving || deleting}
              placeholder="example@mail.com"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={Boolean(profileEdit.emailError)}
              className={`profile-edit-row__value${profileEdit.emailError ? " is-invalid" : ""}`}
            />
            {profileEdit.emailError ? (
              <p className="profile-edit-row__error" role="alert">
                {profileEdit.emailError}
              </p>
            ) : null}
          </div>
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
            onClick={() => void openDeleteModal()}
          >
            {t("profile.delete_account", "Удалить аккаунт")}
          </button>
        </div>

        {profileEdit.message ? (
          <p className="profile-edit__feedback is-ok">{profileEdit.message}</p>
        ) : null}
        {profileEdit.error && !profileEdit.emailError ? (
          <p className="profile-edit__feedback is-error">{profileEdit.error}</p>
        ) : null}
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
                  color: onSiteBlock ? "var(--app-danger)" : "var(--app-text)",
                  letterSpacing: "-0.01em",
                }}
              >
                {onSiteBlock
                  ? onSiteTitle
                  : t("profile.delete_title", "Удалить аккаунт?")}
              </p>
              <p
                className="mt-2 text-center"
                style={{
                  fontSize: "var(--app-text-sm)",
                  color: "var(--app-description)",
                }}
              >
                {checkingSite
                  ? t("common.loading", "Загрузка...")
                  : onSiteBlock
                    ? onSiteText
                    : t("profile.delete_confirm", "Мы удалим ваш аккаунт.")}
              </p>
            </div>
            {onSiteBlock ? (
              <div className="p-4">
                <button
                  type="button"
                  onClick={() => setDeleteOpen(false)}
                  className="theme-button w-full"
                >
                  {t("common.close", "Закрыть")}
                </button>
              </div>
            ) : (
            <div className="grid grid-cols-2 gap-2 p-4">
              <button
                type="button"
                disabled={deleting || checkingSite}
                onClick={() => setDeleteOpen(false)}
                className="theme-button-secondary"
              >
                {t("common.cancel", "Отмена")}
              </button>
              <button
                type="button"
                disabled={deleting || checkingSite}
                onClick={() => void confirmDeleteAccount()}
                className="theme-button"
                style={{ background: "var(--app-danger)" }}
              >
                {deleting
                  ? t("common.saving", "Сохранение…")
                  : t("profile.delete_yes", "Да, удалить")}
              </button>
            </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
