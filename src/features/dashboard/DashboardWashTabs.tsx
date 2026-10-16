"use client";

import { useState } from "react";
import {
  WashCaseCalled,
  WashCaseDone,
  WashCaseWaiting,
  WashCaseWashing,
} from "@/features/dashboard/cases/WashCaseMocks";
import "@/features/dashboard/dashboard-wash-cases.css";

const TABS = [
  { id: "waiting", label: "Мойка — ожидание" },
  { id: "called", label: "Мойка — позвали" },
  { id: "washing", label: "Мойка — моет" },
  { id: "done", label: "Мойка — завершена" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Тестовый дашборд: 4 кейса статусов мойки + локальные стили. */
export default function DashboardWashTabs() {
  const [active, setActive] = useState<TabId>("waiting");

  return (
    <div className="dash-wash">
      <div className="dash-wash__tabs" role="tablist" aria-label="Статусы мойки">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={isActive ? "dash-wash__tab is-active" : "dash-wash__tab"}
              onClick={() => setActive(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="dash-wash__panel" role="tabpanel">
        {active === "waiting" ? <WashCaseWaiting /> : null}
        {active === "called" ? <WashCaseCalled /> : null}
        {active === "washing" ? <WashCaseWashing /> : null}
        {active === "done" ? <WashCaseDone /> : null}
      </div>
    </div>
  );
}
