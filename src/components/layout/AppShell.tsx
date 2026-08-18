import type { ReactNode } from "react";
import AuthDebugBoot from "@/components/auth/AuthDebugBoot";
import ProfileCompleteGate from "@/components/auth/ProfileCompleteGate";
import I18nBoot from "@/components/i18n/I18nBoot";
import LocationPoller from "@/components/location/LocationPoller";
import AuthErrorBlock from "./AuthErrorBlock";
import Header from "./Header/header";
import MobileAccessGate from "./MobileAccessGate";
import PagePreloader from "./PagePreloader";
import WebViewGuard from "./WebViewGuard";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <>
      <WebViewGuard />
      {/* До gate: debug успеет включиться, модалка видна даже на preloader */}
      <AuthDebugBoot />
      <MobileAccessGate>
        <I18nBoot />
        <LocationPoller />
        <div className="app-layout">
          <PagePreloader />
          <Header />
          <div className="app-shell">{children}</div>
          <ProfileCompleteGate />
        </div>
      </MobileAccessGate>
      <AuthErrorBlock />
    </>
  );
}
