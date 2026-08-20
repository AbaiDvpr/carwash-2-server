import preloaderIcon from "@/img/image_1787059580707.svg";

/** Оригинальный SVG пользователя — файл не меняем, только импорт. */
export const PRELOADER_SVG_SRC =
  typeof preloaderIcon === "string" ? preloaderIcon : preloaderIcon.src;

export type PreloaderCategory = "icon" | "gradient" | "circle" | "combo";

export type PreloaderVariant =
  | "icon-sweep"
  | "icon-rotate"
  | "icon-pulse"
  | "icon-shimmer"
  | "icon-breathe"
  | "icon-wave"
  | "icon-spin"
  | "icon-fade"
  | "icon-bounce"
  | "icon-static"
  | "grad-sweep-h"
  | "grad-sweep-v"
  | "grad-conic"
  | "grad-rainbow"
  | "grad-diagonal"
  | "grad-pulse"
  | "grad-shimmer"
  | "grad-wave"
  | "grad-hue"
  | "grad-soft"
  | "circle-sweep"
  | "circle-rotate"
  | "circle-pulse"
  | "circle-ring"
  | "circle-border"
  | "circle-soft"
  | "circle-shimmer"
  | "circle-double"
  | "circle-dotted"
  | "circle-glass"
  | "combo-grad-h-double";

export type PreloaderVariantMeta = {
  id: PreloaderVariant;
  category: PreloaderCategory;
  label: string;
  hint: string;
};

export const PRELOADER_VARIANTS: PreloaderVariantMeta[] = [
  { id: "icon-sweep", category: "icon", label: "1 · Бегущий градиент", hint: "SVG, без фона" },
  { id: "icon-rotate", category: "icon", label: "2 · Вращение градиента", hint: "SVG, без фона" },
  { id: "icon-pulse", category: "icon", label: "3 · Пульс", hint: "SVG, без фона" },
  { id: "icon-shimmer", category: "icon", label: "4 · Блик", hint: "SVG, без фона" },
  { id: "icon-breathe", category: "icon", label: "5 · Дыхание", hint: "SVG, без фона" },
  { id: "icon-wave", category: "icon", label: "6 · Волна", hint: "SVG, без фона" },
  { id: "icon-spin", category: "icon", label: "7 · Вращение SVG", hint: "SVG, без фона" },
  { id: "icon-fade", category: "icon", label: "8 · Fade", hint: "SVG, без фона" },
  { id: "icon-bounce", category: "icon", label: "9 · Bounce", hint: "SVG, без фона" },
  { id: "icon-static", category: "icon", label: "10 · Статичная", hint: "SVG, без фона" },
  { id: "grad-sweep-h", category: "gradient", label: "11 · Горизонтальный", hint: "SVG + градиент" },
  { id: "grad-sweep-v", category: "gradient", label: "12 · Вертикальный", hint: "SVG + градиент" },
  { id: "grad-conic", category: "gradient", label: "13 · Конический", hint: "SVG + градиент" },
  { id: "grad-rainbow", category: "gradient", label: "14 · Радуга", hint: "SVG + градиент" },
  { id: "grad-diagonal", category: "gradient", label: "15 · Диагональ", hint: "SVG + градиент" },
  { id: "grad-pulse", category: "gradient", label: "16 · Пульс цвета", hint: "SVG + градиент" },
  { id: "grad-shimmer", category: "gradient", label: "17 · Блик", hint: "SVG + градиент" },
  { id: "grad-wave", category: "gradient", label: "18 · Волна", hint: "SVG + градиент" },
  { id: "grad-hue", category: "gradient", label: "19 · Hue-shift", hint: "SVG + градиент" },
  { id: "grad-soft", category: "gradient", label: "20 · Мягкий", hint: "SVG + градиент" },
  { id: "circle-sweep", category: "circle", label: "21 · Круг · градиент", hint: "Круглый блок" },
  { id: "circle-rotate", category: "circle", label: "22 · Круг · вращение", hint: "Круглый блок" },
  { id: "circle-pulse", category: "circle", label: "23 · Круг · пульс", hint: "Круглый блок" },
  { id: "circle-ring", category: "circle", label: "24 · Кольцо", hint: "Круглый блок" },
  { id: "circle-border", category: "circle", label: "25 · Рамка", hint: "Круглый блок" },
  { id: "circle-soft", category: "circle", label: "26 · Мягкий круг", hint: "Круглый блок" },
  { id: "circle-shimmer", category: "circle", label: "27 · Круг · блик", hint: "Круглый блок" },
  { id: "circle-double", category: "circle", label: "28 · Двойное кольцо", hint: "Круглый блок" },
  { id: "circle-dotted", category: "circle", label: "29 · Пунктир", hint: "Круглый блок" },
  { id: "circle-glass", category: "circle", label: "30 · Стекло", hint: "Круглый блок" },
  {
    id: "combo-grad-h-double",
    category: "combo",
    label: "31 · Горизонтальный + двойное кольцо",
    hint: "SVG + градиент + 2 кольца",
  },
];

export const PRELOADER_GROUPS: {
  category: PreloaderCategory;
  title: string;
  description: string;
}[] = [
  {
    category: "icon",
    title: "SVG без фона",
    description: "Ваша иконка как есть — без подложки и bg color",
  },
  {
    category: "gradient",
    title: "SVG с градиентом",
    description: "Цвета как в иконке: #00C0F0 → #80E0A0 → #F0E010",
  },
  {
    category: "circle",
    title: "Круглые блоки",
    description: "Только обводка вокруг иконки — без заливки",
  },
  {
    category: "combo",
    title: "Комбо",
    description: "Горизонтальный градиент на иконке + двойное кольцо вокруг",
  },
];

export function preloaderVariantsByCategory(category: PreloaderCategory) {
  return PRELOADER_VARIANTS.filter((item) => item.category === category);
}

export function iconAnimClass(variant: PreloaderVariant): string {
  return variant.replace(/^icon-/, "");
}

export function gradAnimClass(variant: PreloaderVariant): string {
  return variant.replace(/^grad-/, "");
}

export function circleAnimClass(variant: PreloaderVariant): string {
  return variant.replace(/^circle-/, "");
}

export function isGradientVariant(variant: PreloaderVariant): boolean {
  return variant.startsWith("grad-");
}

export function isIconVariant(variant: PreloaderVariant): boolean {
  return variant.startsWith("icon-");
}

export function isComboVariant(variant: PreloaderVariant): boolean {
  return variant.startsWith("combo-");
}
