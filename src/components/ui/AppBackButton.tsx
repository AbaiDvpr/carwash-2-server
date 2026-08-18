"use client";

import BackButton from "@/components/ui/BackButton";
import { useBackButtonStyle } from "@/hooks/useBackButtonStyle";
import { useT } from "@/hooks/useT";

type AppBackButtonProps = {
  onClick?: () => void;
  href?: string;
  /** Название текущего экрана — для режима «текущий блок» */
  title?: string;
  className?: string;
  disabled?: boolean;
};

/** Назад с учётом стиля из Оформления: «Назад» / название / только стрелка */
export default function AppBackButton({
  onClick,
  href,
  title,
  className,
  disabled,
}: AppBackButtonProps) {
  const t = useT();
  const { style } = useBackButtonStyle();

  if (style === "icon") {
    return (
      <BackButton
        iconOnly
        onClick={onClick}
        href={href}
        className={className}
        disabled={disabled}
      />
    );
  }

  const label =
    style === "section" && title?.trim()
      ? title.trim()
      : t("common.back", "Назад");

  return (
    <BackButton
      onClick={onClick}
      href={href}
      className={className}
      disabled={disabled}
    >
      {label}
    </BackButton>
  );
}
