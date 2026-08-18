"use client";

import { PageLayout } from "@/components/layout";
import BackButton from "@/components/ui/BackButton";
import { useT } from "@/hooks/useT";
import GaragePanel from "./components/GaragePanel";
import "./components/profile.css";

type GaragePageProps = {
  embedded?: boolean;
  onBack?: () => void;
};

export default function GaragePage({
  embedded = false,
  onBack,
}: GaragePageProps) {
  const t = useT();

  const content = (
    <div className="profile-edit">
      <div className="app-back-bar">
        {onBack ? (
          <BackButton iconOnly onClick={onBack} />
        ) : (
          <BackButton iconOnly href="/profile" />
        )}
      </div>
      <GaragePanel />
    </div>
  );

  if (embedded) return content;

  return (
    <PageLayout title={t("profile.garage", "Гараж")} className="page--profile-edit">
      {content}
    </PageLayout>
  );
}
