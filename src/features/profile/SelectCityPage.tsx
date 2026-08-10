"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout";
import BackButton from "@/components/ui/BackButton";
import { useLocale, useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { useUserCity } from "@/hooks/useUserCity";
import { updateUserSettings } from "@/lib/api/auth";
import { formatCityName } from "@/lib/api/geos";
import "./components/profile.css";

function RadioMark({ checked, busy = false }: { checked: boolean; busy?: boolean }) {
  return (
    <span
      className={[
        "theme-radio relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
        checked ? "is-on" : "",
        busy ? "opacity-60" : "",
      ].join(" ")}
      aria-hidden
    >
      {busy ? (
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white/80" />
      ) : checked ? (
        <span className="h-2 w-2 rounded-full bg-[var(--app-button-text)]" />
      ) : null}
    </span>
  );
}

export default function SelectCityPage() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const { showToast } = useToast();
  const { geoId, cities, loading, refresh } = useUserCity();
  const [savingId, setSavingId] = useState<number | null>(null);

  return (
    <PageLayout title={t("profile.city", "Ваш город")} className="page--profile-edit">
      <div className="profile-edit">
        <div className="mb-3">
          <BackButton iconOnly href="/profile" />
        </div>

        <p
          className="mb-3 px-0.5"
          style={{
            color: "var(--app-description)",
            fontSize: "var(--app-text-sm)",
          }}
        >
          Мойки и ЭЗС показываются только в выбранном городе.
        </p>

        {loading ? (
          <div
            className="h-28 animate-pulse"
            style={{
              borderRadius: "var(--app-section-radius)",
              border: "var(--app-border-width) solid var(--app-border)",
              background: "var(--app-hover)",
            }}
          />
        ) : (
          <section className="profile-card">
            {cities.map((city) => {
              const selected = geoId === city.id;
              const busy = savingId === city.id;
              return (
                <button
                  key={city.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={savingId != null}
                  onClick={() => {
                    void (async () => {
                      if (selected) return;
                      setSavingId(city.id);
                      try {
                        await updateUserSettings({ geo_id: city.id });
                        refresh();
                        showToast(formatCityName(city, locale));
                        router.push("/profile");
                      } catch {
                        showToast("Не удалось сохранить город");
                      } finally {
                        setSavingId(null);
                      }
                    })();
                  }}
                  className="profile-nav-row theme-hover text-left disabled:opacity-60"
                >
                  <RadioMark checked={selected} busy={busy} />
                  <span className="profile-nav-row__main">
                    <span className="profile-nav-row__hint">
                      {formatCityName(city, locale)}
                    </span>
                  </span>
                </button>
              );
            })}
          </section>
        )}
      </div>
    </PageLayout>
  );
}
