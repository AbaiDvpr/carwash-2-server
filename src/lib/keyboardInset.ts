/** Высота экранной клавиатуры (логические px) → CSS --app-keyboard-h */

const MIN_KEYBOARD_PX = 80;

export function readKeyboardHeightPx(): number {
  if (typeof window === "undefined") return 0;

  const vv = window.visualViewport;
  if (!vv) return 0;

  // Клавиатура «съедает» низ layout viewport относительно visualViewport.
  const covered = Math.round(
    window.innerHeight - vv.height - vv.offsetTop,
  );
  if (!Number.isFinite(covered) || covered < MIN_KEYBOARD_PX) return 0;
  return covered;
}

export function applyKeyboardInset(): number {
  if (typeof document === "undefined") return 0;
  const px = readKeyboardHeightPx();
  document.documentElement.style.setProperty("--app-keyboard-h", `${px}px`);
  if (px > 0) {
    document.documentElement.setAttribute("data-keyboard-open", "true");
  } else {
    document.documentElement.removeAttribute("data-keyboard-open");
  }
  return px;
}

/** Прокрутить активное поле выше клавиатуры. */
export function scrollFocusedFieldIntoView(): void {
  if (typeof document === "undefined") return;
  const el = document.activeElement;
  if (!(el instanceof HTMLElement)) return;
  const tag = el.tagName;
  if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") return;
  if (el.getAttribute("type") === "hidden") return;

  try {
    el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  } catch {
    el.scrollIntoView(true);
  }
}
