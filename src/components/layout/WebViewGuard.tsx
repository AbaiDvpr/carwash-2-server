"use client";

import { useEffect } from "react";

/**
 * WebView: блокирует системные меню (сохранить фото, копировать, выделить).
 * Ввод в input/textarea не трогаем.
 */
export default function WebViewGuard() {
  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      if (!(el instanceof Element)) return false;
      const node = el.closest(
        "input, textarea, select, [contenteditable='true'], .allow-select",
      );
      return Boolean(node);
    };

    const onContextMenu = (event: Event) => {
      if (isEditable(event.target)) return;
      event.preventDefault();
    };

    const onDragStart = (event: DragEvent) => {
      const t = event.target;
      if (t instanceof HTMLImageElement || t instanceof HTMLMediaElement) {
        event.preventDefault();
      }
    };

    const onSelectStart = (event: Event) => {
      if (isEditable(event.target)) return;
      event.preventDefault();
    };

    document.addEventListener("contextmenu", onContextMenu, { capture: true });
    document.addEventListener("dragstart", onDragStart, { capture: true });
    document.addEventListener("selectstart", onSelectStart, { capture: true });

    return () => {
      document.removeEventListener("contextmenu", onContextMenu, true);
      document.removeEventListener("dragstart", onDragStart, true);
      document.removeEventListener("selectstart", onSelectStart, true);
    };
  }, []);

  return null;
}
