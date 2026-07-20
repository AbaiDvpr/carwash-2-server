"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageLayout from "@/components/layout/PageLayout";
import { useStations } from "@/hooks/useStations";
import HomeMap from "./components/HomeMap";
import Main from "./components/Main";
import { useHomeTab } from "./hooks/useHomeTab";

function HomePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isHome, isMap, setActiveTab } = useHomeTab();
  const { stations, loading, error } = useStations();
  const [focusStationId, setFocusStationId] = useState<string | null>(null);

  // /?map=1&station=… — открыть карту на точке (из деталки или deep link)
  useEffect(() => {
    const map = searchParams.get("map");
    const station = searchParams.get("station");
    if (map === "1" || station) {
      setActiveTab("map");
      if (station) setFocusStationId(station);
      router.replace("/", { scroll: false });
    }
  }, [searchParams, setActiveTab, router]);

  function openMapOnStation(stationId: string) {
    setFocusStationId(stationId);
    setActiveTab("map");
  }

  return (
    <PageLayout
      title="Home"
      description="Главная страница CarWash"
      className={isMap ? "page--map" : undefined}
    >
      {isHome && (
        <Main
          stations={stations}
          loading={loading}
          error={error}
          onOpenMap={() => {
            setFocusStationId(null);
            setActiveTab("map");
          }}
          onShowOnMap={openMapOnStation}
        />
      )}
      {isMap && (
        <HomeMap
          stations={stations}
          loading={loading}
          error={error}
          focusStationId={focusStationId}
          onFocusConsumed={() => setFocusStationId(null)}
          onBackToList={() => {
            setFocusStationId(null);
            setActiveTab("home");
          }}
        />
      )}
    </PageLayout>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageInner />
    </Suspense>
  );
}
