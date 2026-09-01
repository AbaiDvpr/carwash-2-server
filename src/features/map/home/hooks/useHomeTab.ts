import { useState } from "react";

export type HomeTab = "home" | "map";

export function useHomeTab(initialTab: HomeTab = "home") {
  const [activeTab, setActiveTab] = useState<HomeTab>(initialTab);

  return {
    activeTab,
    setActiveTab,
    isHome: activeTab === "home",
    isMap: activeTab === "map",
  };
}
