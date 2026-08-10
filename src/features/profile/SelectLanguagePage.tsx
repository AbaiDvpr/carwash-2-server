"use client";

import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout";
import BackButton from "@/components/ui/BackButton";
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

export default function SelectLanguagePage() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  return (
    <PageLayout title={t("profile.language", "Язык")} className="page--profile-edit">
      <div className="profile-edit">
        <div className="mb-3">
          <BackButton iconOnly href="/profile" />
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
                router.push("/profile");
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
    </PageLayout>
  );
}
