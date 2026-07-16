"use client";

import PageLayout from "@/components/layout/PageLayout";
import { useStations } from "@/hooks/useStations";
import HomeMap from "./components/HomeMap";
import Main from "./components/Main";
import { useHomeTab } from "./hooks/useHomeTab";

export default function HomePage() {
  const { isHome, isMap, setActiveTab } = useHomeTab();
  const { stations, loading, error } = useStations();

  return (
    <PageLayout title="Home" description="Главная страница CarWash">
      {isHome && (
        <Main
          stations={stations}
          loading={loading}
          error={error}
          onOpenMap={() => setActiveTab("map")}
        />
      )}
      {isMap && (
        <HomeMap
          stations={stations}
          loading={loading}
          error={error}
          onBackToList={() => setActiveTab("home")}
        />
      )}
    </PageLayout>
  );
}
