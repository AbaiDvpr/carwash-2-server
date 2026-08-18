export type BackButtonStyle = "text" | "section" | "icon";

export const BACK_BUTTON_STYLE_KEY = "hipoint.backButtonStyle";

export const BACK_BUTTON_STYLE_OPTIONS: {
  id: BackButtonStyle;
  label: string;
  hint: string;
  example: string;
}[] = [
  {
    id: "text",
    label: "Назад",
    hint: "Стрелка и слово «Назад»",
    example: "‹ Назад",
  },
  {
    id: "section",
    label: "Текущий блок",
    hint: "Стрелка и название экрана",
    example: "‹ Оформление",
  },
  {
    id: "icon",
    label: "Только стрелка",
    hint: "Без текста",
    example: "‹",
  },
];

export function readBackButtonStyle(): BackButtonStyle {
  if (typeof window === "undefined") return "icon";
  try {
    const raw = window.localStorage.getItem(BACK_BUTTON_STYLE_KEY);
    if (raw === "text" || raw === "section" || raw === "icon") return raw;
  } catch {
    /* ignore */
  }
  return "icon";
}

export function writeBackButtonStyle(style: BackButtonStyle) {
  try {
    window.localStorage.setItem(BACK_BUTTON_STYLE_KEY, style);
  } catch {
    /* ignore */
  }
}
