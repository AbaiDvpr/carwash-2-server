import type { Metadata } from "next";
import DashboardWashTabs from "@/features/dashboard/DashboardWashTabs";

export const metadata: Metadata = {
  title: "Dashboard",
};

/** Тестовый дашборд мойки: только 4 таба. */
export default function Page() {
  return (
    <div className="page page--dashboard">
      <DashboardWashTabs />
    </div>
  );
}
