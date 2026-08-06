"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/hooks/useT";
import { useAppSelector } from "@/store/hooks";
import ProfileNavRow from "./ProfileNavRow";

type DocumentsDrawerProps = {
  onClose: () => void;
};

function IconDoc() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3.5h7.5L19 8v12.5H7V3.5Z" />
      <path strokeLinecap="round" d="M14.5 3.5V8H19M9.5 12h5M9.5 15.5h5" />
    </svg>
  );
}

export default function DocumentsDrawer({ onClose }: DocumentsDrawerProps) {
  const t = useT();
  const documents = useAppSelector((state) => state.variables.documents);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!portalReady) return null;

  return createPortal(
    <>
      <button
        type="button"
        className="profile-docs-drawer__backdrop"
        onClick={onClose}
        aria-label={t("common.close", "Закрыть")}
      />
      <div
        className="profile-docs-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t("profile.documents", "Документы")}
      >
        <div className="profile-docs-drawer__top">
          <div className="profile-docs-drawer__headline">
            <h2 className="profile-docs-drawer__title">
              {t("profile.documents", "Документы")}
            </h2>
          </div>
          <button
            type="button"
            className="profile-docs-drawer__close"
            onClick={onClose}
            aria-label={t("common.close", "Закрыть")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="profile-docs-drawer__body">
          <section className="profile-card profile-docs-drawer__list">
            {documents.map((doc) =>
              doc.url ? (
                <ProfileNavRow
                  key={doc.id}
                  icon={<IconDoc />}
                  label={doc.title}
                  href={doc.url}
                  external
                />
              ) : (
                <ProfileNavRow key={doc.id} icon={<IconDoc />} label={doc.title} />
              ),
            )}
          </section>
        </div>
      </div>
    </>,
    document.body,
  );
}
