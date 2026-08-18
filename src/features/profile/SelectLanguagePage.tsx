"use client";

import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout";
import AppBackButton from "@/components/ui/AppBackButton";
import { useLocale, useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { useAppDispatch } from "@/store/hooks";
import { setLocale } from "@/store/slices/i18nSlice";
import { notifyLocaleChanged } from "@/lib/localeController";
import type { AppLocale } from "@/lib/i18n/storage";
import "./components/profile.css";

export const LANGUAGE_OPTIONS: { id: AppLocale; label: string }[] = [
  { id: "ru", label: "Русский" },
  { id: "kz", label: "Қазақша" },
  { id: "en", label: "English" },
];

function RadioMark({ checked }: { checked: boolean }) {
  return (
    <span
      className={[
        "theme-radio relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
        checked ? "is-on" : "",
      ].join(" ")}
      aria-hidden
    >
      {checked ? (
        <span className="h-2 w-2 rounded-full bg-[var(--app-button-text)]" />
      ) : null}
    </span>
  );
}

type SelectLanguagePageProps = {
  embedded?: boolean;
  onBack?: () => void;
};

export default function SelectLanguagePage({
  embedded = false,
  onBack,
}: SelectLanguagePageProps) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  function goBack() {
    if (onBack) onBack();
    else router.push("/profile");
  }

  const content = (
    <div className="profile-edit">
      <div className="app-back-bar">
        <AppBackButton title={t("profile.language", "Язык")} onClick={goBack} />
      </div>

      <section className="profile-card">
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
              goBack();
            }}
            className="profile-nav-row theme-hover text-left"
          >
            <RadioMark checked={lang.id === locale} />
            <span className="profile-nav-row__main">
              <span className="profile-nav-row__hint">{lang.label}</span>
            </span>
          </button>
        ))}
      </section>
    </div>
  );

  if (embedded) return content;

  return (
    <PageLayout title={t("profile.language", "Язык")} className="page--profile-edit">
      {content}
    </PageLayout>
  );
}
