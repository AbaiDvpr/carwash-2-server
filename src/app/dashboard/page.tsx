import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

/** Пустой экран-заготовка: без блоков и без текстов. */
export default function Page() {
  return <div className="page page--dashboard" />;
}
