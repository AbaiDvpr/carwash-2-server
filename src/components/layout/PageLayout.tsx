import type { ReactNode } from "react";

type PageLayoutProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  /**
   * true — без .page-content (чат и спец. layouts).
   * По умолчанию все страницы получают одинаковые паддинги.
   */
  bare?: boolean;
};

export default function PageLayout({
  children,
  className,
  bare = false,
}: PageLayoutProps) {
  return (
    <div className={["page", className].filter(Boolean).join(" ")}>
      {bare ? children : <div className="page-content">{children}</div>}
    </div>
  );
}
