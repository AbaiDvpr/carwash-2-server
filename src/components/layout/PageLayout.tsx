import type { ReactNode } from "react";

type PageLayoutProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

export default function PageLayout({ title, description, children, className }: PageLayoutProps) {
  return <div className={["page", className].filter(Boolean).join(" ")}>{children}</div>;
}