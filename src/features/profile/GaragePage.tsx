"use client";

import { PageLayout } from "@/components/layout";
import BackButton from "@/components/ui/BackButton";
import { useT } from "@/hooks/useT";
import GaragePanel from "./components/GaragePanel";
import "./components/profile.css";

export default function GaragePage() {
  const t = useT();

  return (
    <PageLayout title={t("profile.garage", "Гараж")} className="page--profile-edit">
      <div className="profile-edit">
        <div className="mb-3">
          <BackButton iconOnly href="/profile" />
        </div>
        <GaragePanel />
      </div>
    </PageLayout>
  );
}
