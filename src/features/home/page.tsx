"use client";

import PageLayout from "@/components/layout/PageLayout";
import HomeMap from "./components/HomeMap";
import Main from "./components/Main";
import { useHomeTab } from "./hooks/useHomeTab";

export default function HomePage() {
  const { isHome, isMap } = useHomeTab();

  return (
    <PageLayout title="Home" description="Главная страница CarWash">
      {isHome && <Main />}
      {isMap && <HomeMap />}
    </PageLayout>
  );
}
