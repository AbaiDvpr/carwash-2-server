import type { ReactNode } from "react";
import LocationPoller from "@/components/location/LocationPoller";
import AuthErrorBlock from "./AuthErrorBlock";
import Header from "./Header/header";
import MobileAccessGate from "./MobileAccessGate";
import PagePreloader from "./PagePreloader";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <MobileAccessGate>
      <LocationPoller />
      <div className="app-layout">
        <PagePreloader />
        <Header />
        <div className="app-shell">{children}</div>
        <AuthErrorBlock />
      </div>
    </MobileAccessGate>
  );
}
