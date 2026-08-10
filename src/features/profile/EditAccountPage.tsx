"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout";
import BackButton from "@/components/ui/BackButton";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import {
  deleteUserPhoto,
  resolveMediaUrl,
  uploadUserPhoto,
} from "@/lib/api/photo";
import { forceLogout } from "@/lib/forceLogout";
import { pickImage } from "@/lib/pickImage";
import { useEditProfile } from "./hooks/useEditProfile";
import AvatarCropper from "./components/AvatarCropper";
import IconActionButton, {
  IconEdit,
  IconTrash,
} from "./components/IconActionButton";
import ProfileNavRow from "./components/ProfileNavRow";
import "./components/profile.css";

function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" d="M10 4.5H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h3M14 8l4 4-4 4M10 12h8" />
    </svg>
  );
}

export default function EditAccountPage() {
  const t = useT();
  const router = useRouter();
  const { showToast } = useToast();
  const { name, photoUrl } = useAuthUser();
  const profileEdit = useEditProfile();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [avatarReady, setAvatarReady] = useState(false);

  const avatarSrc = resolveMediaUrl(photoUrl);
  const initials =
    name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?";

  useEffect(() => {
    if (!logoutOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLogoutOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [logoutOpen]);

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

  async function handlePickPhoto() {
    try {
      const dataUrl = await pickImage();
      setCropSrc(dataUrl);
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message === "cancelled" || err.message === "timeout")
      ) {
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

  return (
    <PageLayout title={t("profile.edit", "Редактирование")} className="page--profile-edit">
      <div className="profile-edit">
        <div className="mb-3">
          <BackButton iconOnly href="/profile" />
        </div>

        <div className="profile-edit__main space-y-4">
          <section className="profile-card">
            <div className="profile-edit-fields">
              <div className="profile-edit-photo">
                <div className="profile-edit-photo__main">
                  <span className="profile-nav-row__label">
                    {t("profile.photo", "Фото")}
                  </span>
                </div>

                <span className="profile-edit-photo__thumb" aria-hidden>
                  {avatarSrc ? (
                    <>
                      {!avatarReady ? (
                        <span className="profile-avatar-shimmer absolute inset-0" />
                      ) : null}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={avatarSrc}
                        alt=""
                        onLoad={() => setAvatarReady(true)}
                        onError={() => setAvatarReady(true)}
                        className={avatarReady ? "opacity-100" : "opacity-0"}
                      />
                    </>
                  ) : (
                    <span className="profile-edit-photo__fallback">{initials}</span>
                  )}
                </span>

                <div className="profile-edit-photo__actions">
                  <IconActionButton
                    label={
                      photoUrl
                        ? t("profile.change_photo", "Изменить фото")
                        : t("profile.add_photo", "Добавить фото")
                    }
                    disabled={photoBusy}
                    onClick={() => void handlePickPhoto()}
                  >
                    {photoBusy ? (
                      <span className="profile-boot__spinner profile-boot__spinner--sm" />
                    ) : (
                      <IconEdit />
                    )}
                  </IconActionButton>
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

              <label className="profile-edit-row">
                <span className="profile-nav-row__label">
                  {t("profile.first_name", "Имя")}
                </span>
                <input
                  type="text"
                  value={profileEdit.firstName}
                  onChange={(e) => {
                    profileEdit.clearFeedback();
                    profileEdit.setFirstName(e.target.value);
                  }}
                  disabled={profileEdit.loading || profileEdit.saving}
                  placeholder={t("profile.first_name", "Имя")}
                  autoComplete="given-name"
                  className="profile-edit-row__value"
                />
              </label>
              <label className="profile-edit-row">
                <span className="profile-nav-row__label">
                  {t("profile.last_name", "Фамилия")}
                </span>
                <input
                  type="text"
                  value={profileEdit.lastName}
                  onChange={(e) => {
                    profileEdit.clearFeedback();
                    profileEdit.setLastName(e.target.value);
                  }}
                  disabled={profileEdit.loading || profileEdit.saving}
                  placeholder={t("profile.last_name", "Фамилия")}
                  autoComplete="family-name"
                  className="profile-edit-row__value"
                />
              </label>
              <label className="profile-edit-row">
                <span className="profile-nav-row__label">Email</span>
                <input
                  type="email"
                  value={profileEdit.email}
                  onChange={(e) => {
                    profileEdit.clearFeedback();
                    profileEdit.setEmail(e.target.value);
                  }}
                  disabled={profileEdit.loading || profileEdit.saving}
                  placeholder="example@mail.com"
                  autoComplete="email"
                  inputMode="email"
                  className="profile-edit-row__value"
                />
              </label>
            </div>
          </section>

          <button
            type="button"
            disabled={!profileEdit.canSave}
            onClick={() => {
              void profileEdit.save().then((ok) => {
                if (!ok) return;
                showToast(t("common.saved", "Сохранено"));
                window.setTimeout(() => router.push("/profile"), 350);
              });
            }}
            className="theme-button w-full"
          >
            {profileEdit.saving
              ? t("common.saving", "Сохранение…")
              : t("common.save", "Сохранить")}
          </button>

          {profileEdit.message ? (
            <p className="profile-edit__feedback is-ok">{profileEdit.message}</p>
          ) : null}
          {profileEdit.error ? (
            <p className="profile-edit__feedback is-error">{profileEdit.error}</p>
          ) : null}
        </div>

        <div className="profile-edit__logout">
          <section className="profile-card">
            <ProfileNavRow
              icon={<IconLogout />}
              label={t("profile.logout", "Выйти")}
              danger
              onClick={() => setLogoutOpen(true)}
            />
          </section>
        </div>
      </div>

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
    </PageLayout>
  );
}
