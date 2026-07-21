"use client";

import PageLayout from "@/components/layout/PageLayout";
import Main from "./components/Main";

export default function HomePage() {
  return (
    <PageLayout title="Home" description="Главная страница CarWash">
      <Main />
    </PageLayout>
  );
}
