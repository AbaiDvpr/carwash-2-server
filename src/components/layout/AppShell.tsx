import type { ReactNode } from "react";
import Header from "./Header/header";
import MobileAccessGate from "./MobileAccessGate";
import PagePreloader from "./PagePreloader";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <MobileAccessGate>
      <div className="app-layout">
        <PagePreloader />
        <Header />
        <div className="app-shell">{children}</div>
      </div>
    </MobileAccessGate>
  );
}
