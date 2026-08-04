"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type TransitionEvent as ReactTransitionEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

const CLOSE_PX = 88;
const CLOSE_VELOCITY = 0.45;
const EXPAND_VELOCITY = 0.35;
const ACTIVATE_PX = 8;
const CLOSE_FALLBACK_MS = 320;
const DEFAULT_PEEK_RATIO = 0.5;
const DEFAULT_EXPANDED_RATIO = 0.92;

type Snap = "peek" | "expanded";
type DragSource = "handle" | "scroll";

type UseMapSheetDragOptions = {
  onClose: () => void;
  /** Два снапа: компакт / полный. Свайп вверх — expand, вниз — collapse/close. */
  expandable?: boolean;
  /** false = без свайпа, только закрытие снаружи (кнопка X) */
  dragEnabled?: boolean;
  peekRatio?: number;
  expandedRatio?: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function measureHeights(peekRatio: number, expandedRatio: number) {
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const expandedH = Math.round(vh * expandedRatio);
  const peekH = Math.round(vh * peekRatio);
  return {
    peekH,
    expandedH,
    range: Math.max(120, expandedH - peekH),
  };
}

/**
 * Bottom-sheet drag.
 * По умолчанию: только свайп вниз → закрыть.
 * expandable: peek ↔ expanded + закрытие вниз из peek.
 */
export function useMapSheetDrag({
  onClose,
  expandable = false,
  dragEnabled = true,
  peekRatio = DEFAULT_PEEK_RATIO,
  expandedRatio = DEFAULT_EXPANDED_RATIO,
}: UseMapSheetDragOptions) {
  const [snap, setSnap] = useState<Snap>("peek");
  const [expandProgress, setExpandProgress] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [closing, setClosing] = useState(false);

  const onCloseRef = useRef(onClose);
  const sheetRef = useRef<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLElement | null>(null);
  const startY = useRef(0);
  const startX = useRef(0);
  const lastY = useRef(0);
  const lastT = useRef(0);
  const velocity = useRef(0);
  const active = useRef(false);
  const draggingRef = useRef(false);
  const pointerId = useRef<number | null>(null);
  const source = useRef<DragSource>("handle");
  const offsetYRef = useRef(0);
  const expandRef = useRef(0);
  const snapRef = useRef<Snap>("peek");
  const closingRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const closedRef = useRef(false);
  const heightsRef = useRef(measureHeights(peekRatio, expandedRatio));
  const startExpandRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const pendingLive = useRef<{ progress: number; offset: number } | null>(
    null,
  );

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    offsetYRef.current = offsetY;
  }, [offsetY]);

  useEffect(() => {
    expandRef.current = expandProgress;
  }, [expandProgress]);

  useEffect(() => {
    snapRef.current = snap;
  }, [snap]);

  useEffect(() => {
    closingRef.current = closing;
  }, [closing]);

  useEffect(() => {
    const update = () => {
      heightsRef.current = measureHeights(peekRatio, expandedRatio);
      paintLive(expandRef.current, offsetYRef.current, false);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peekRatio, expandedRatio, expandable]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
      }
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onTouchMove = (event: TouchEvent) => {
      if (event.cancelable) event.preventDefault();
    };
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, [dragging]);

  const paintLive = useCallback(
    (progress: number, offset: number, withTransition: boolean) => {
      const el = sheetRef.current;
      if (!el) return;

      let height = el.offsetHeight;
      if (expandable) {
        const { peekH, expandedH } = heightsRef.current;
        height = Math.round(peekH + progress * (expandedH - peekH));
        el.style.height = `${height}px`;
        el.style.setProperty("--sheet-expand", String(progress));
        el.style.setProperty("--sheet-h", `${height}px`);
        // свободное место сверху под фото (без React re-render)
        document.documentElement.style.setProperty("--map-sheet-h", `${height}px`);
        document.documentElement.style.setProperty("--map-sheet-expand", String(progress));
        document.documentElement.classList.toggle(
          "map-sheet-photo-on",
          progress > 0.2,
        );
      }

      el.style.transform = offset
        ? `translate3d(0, ${offset}px, 0)`
        : "translate3d(0, 0, 0)";

      if (withTransition) {
        const ease = "cubic-bezier(0.2, 0.8, 0.2, 1)";
        el.style.transition = expandable
          ? `transform 160ms ${ease}, height 160ms ${ease}`
          : `transform 220ms ${ease}`;
      } else {
        el.style.transition = "none";
      }
    },
    [expandable],
  );

  const scheduleLive = useCallback(
    (progress: number, offset: number) => {
      expandRef.current = progress;
      offsetYRef.current = offset;
      pendingLive.current = { progress, offset };
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const next = pendingLive.current;
        if (!next) return;
        // только DOM — без setState, иначе drawer зависает
        paintLive(next.progress, next.offset, false);
      });
    },
    [paintLive],
  );

  const setSheetNode = useCallback(
    (node: HTMLElement | null) => {
      sheetRef.current = node;
      if (node && expandable) {
        paintLive(expandRef.current, offsetYRef.current, false);
      }
    },
    [expandable, paintLive],
  );

  const setScrollNode = useCallback((node: HTMLElement | null) => {
    scrollRef.current = node;
  }, []);

  const emitClose = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    onCloseRef.current();
  }, []);

  const beginDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>, dragSource: DragSource) => {
      if (!dragEnabled) return;
      if (closingRef.current || closedRef.current) return;
      if (event.button != null && event.button !== 0) return;

      pointerId.current = event.pointerId;
      active.current = true;
      draggingRef.current = false;
      source.current = dragSource;
      startY.current = event.clientY;
      startX.current = event.clientX;
      lastY.current = event.clientY;
      lastT.current = performance.now();
      velocity.current = 0;
      startExpandRef.current = expandRef.current;
      setAnimate(false);
      paintLive(expandRef.current, offsetYRef.current, false);

      if (dragSource === "handle") {
        event.preventDefault();
        (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
      }
    },
    [dragEnabled, paintLive],
  );

  const moveDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!active.current || pointerId.current !== event.pointerId) return;
      if (closingRef.current) return;

      const dy = event.clientY - startY.current;
      const dx = event.clientX - startX.current;
      const now = performance.now();
      const dt = Math.max(1, now - lastT.current);
      velocity.current = (event.clientY - lastY.current) / dt;
      lastY.current = event.clientY;
      lastT.current = now;

      if (!expandable) {
        if (dy <= 0) {
          if (draggingRef.current) {
            draggingRef.current = false;
            setDragging(false);
            if (offsetYRef.current !== 0) {
              offsetYRef.current = 0;
              setOffsetY(0);
              paintLive(0, 0, false);
            }
          }
          return;
        }

        if (!draggingRef.current) {
          if (dy < ACTIVATE_PX) return;
          if (Math.abs(dx) > dy + 8) {
            active.current = false;
            pointerId.current = null;
            return;
          }
          if (source.current === "scroll") {
            const scroller = scrollRef.current;
            const atTop = !scroller || scroller.scrollTop <= 0;
            if (!atTop) {
              active.current = false;
              pointerId.current = null;
              return;
            }
            try {
              (event.currentTarget as HTMLElement).setPointerCapture?.(
                event.pointerId,
              );
            } catch {
              /* ignore */
            }
          }
          draggingRef.current = true;
          setDragging(true);
        }

        event.preventDefault();
        scheduleLive(0, dy);
        return;
      }

      const { range } = heightsRef.current;
      const fromExpanded = startExpandRef.current >= 0.98;
      const goingDown = dy > 0;
      const goingUp = dy < 0;

      if (!draggingRef.current) {
        if (Math.abs(dy) < ACTIVATE_PX) return;
        if (Math.abs(dx) > Math.abs(dy) + 8) {
          active.current = false;
          pointerId.current = null;
          return;
        }

        if (source.current === "scroll") {
          const scroller = scrollRef.current;
          const atTop = !scroller || scroller.scrollTop <= 0;
          if (goingUp && !atTop) {
            active.current = false;
            pointerId.current = null;
            return;
          }
          if (goingDown && fromExpanded && !atTop) {
            active.current = false;
            pointerId.current = null;
            return;
          }
          try {
            (event.currentTarget as HTMLElement).setPointerCapture?.(
              event.pointerId,
            );
          } catch {
            /* ignore */
          }
        }

        draggingRef.current = true;
        setDragging(true);
      }

      event.preventDefault();

      if (goingUp || (!goingDown && startExpandRef.current > 0 && startExpandRef.current < 1)) {
        scheduleLive(clamp(startExpandRef.current - dy / range, 0, 1), 0);
        return;
      }

      if (startExpandRef.current > 0.01) {
        const collapse = dy / range;
        if (collapse < startExpandRef.current) {
          scheduleLive(
            clamp(startExpandRef.current - collapse, 0, 1),
            0,
          );
        } else {
          scheduleLive(0, dy - startExpandRef.current * range);
        }
        return;
      }

      scheduleLive(0, Math.max(0, dy));
    },
    [expandable, paintLive, scheduleLive],
  );

  const finishClose = useCallback(() => {
    if (closingRef.current || closedRef.current) return;

    const height = sheetRef.current?.offsetHeight ?? window.innerHeight;
    const target = Math.max(height + 48, window.innerHeight * 0.55);

    setClosing(true);
    closingRef.current = true;
    setDragging(false);
    setAnimate(true);
    expandRef.current = 0;
    offsetYRef.current = target;
    setExpandProgress(0);
    setOffsetY(target);
    setSnap("peek");
    paintLive(0, target, true);

    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      emitClose();
    }, CLOSE_FALLBACK_MS);
  }, [emitClose, paintLive]);

  useEffect(() => {
    return () => {
      document.documentElement.classList.remove("map-sheet-photo-on");
      document.documentElement.style.removeProperty("--map-sheet-h");
      document.documentElement.style.removeProperty("--map-sheet-expand");
    };
  }, []);

  const settleExpand = useCallback(
    (next: Snap, instant = false) => {
      const progress = next === "expanded" ? 1 : 0;
      setSnap(next);
      snapRef.current = next;
      setAnimate(!instant);
      expandRef.current = progress;
      offsetYRef.current = 0;
      setExpandProgress(progress);
      setOffsetY(0);
      paintLive(progress, 0, !instant && next === "expanded");
      if (next === "peek" && scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    },
    [paintLive],
  );

  /** Скролл внутри peek → раскрыть */
  const expandFromScroll = useCallback(() => {
    if (!expandable || closingRef.current || closedRef.current) return;
    if (snapRef.current === "expanded") return;
    if (draggingRef.current) return;
    settleExpand("expanded");
  }, [expandable, settleExpand]);

  /** Скролл/свайп вниз в expanded → сразу стандарт */
  const collapseFromScroll = useCallback(() => {
    if (!expandable || closingRef.current || closedRef.current) return;
    if (snapRef.current !== "expanded") return;
    if (draggingRef.current) return;
    settleExpand("peek", true);
  }, [expandable, settleExpand]);

  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (pointerId.current != null && event.pointerId !== pointerId.current) {
        return;
      }
      if (!active.current && !draggingRef.current) return;

      const wasDragging = draggingRef.current;
      const dyDismiss = Math.max(0, offsetYRef.current);
      const progress = expandRef.current;
      const fastDown = velocity.current > CLOSE_VELOCITY;
      const fastUp = velocity.current < -EXPAND_VELOCITY;

      active.current = false;
      pointerId.current = null;
      draggingRef.current = false;
      setDragging(false);

      if (!wasDragging) return;

      if (!expandable) {
        if (dyDismiss >= CLOSE_PX || (fastDown && dyDismiss > 28)) {
          finishClose();
          return;
        }
        setAnimate(true);
        offsetYRef.current = 0;
        setOffsetY(0);
        paintLive(0, 0, true);
        return;
      }

      if (progress < 0.08 && (dyDismiss >= CLOSE_PX || (fastDown && dyDismiss > 28))) {
        finishClose();
        return;
      }

      // вниз / недостаточно вверх → сразу стандартный режим
      if (fastDown || progress < 0.72) {
        settleExpand("peek", true);
        return;
      }

      if (fastUp || progress >= 0.72) {
        settleExpand("expanded");
        return;
      }

      settleExpand(snapRef.current, true);
    },
    [expandable, finishClose, paintLive, settleExpand],
  );

  const cancelDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (pointerId.current != null && event.pointerId !== pointerId.current) {
        return;
      }
      if (closingRef.current) return;
      active.current = false;
      pointerId.current = null;
      draggingRef.current = false;
      setDragging(false);
      setAnimate(true);
      const progress = snapRef.current === "expanded" ? 1 : 0;
      expandRef.current = progress;
      offsetYRef.current = 0;
      setExpandProgress(progress);
      setOffsetY(0);
      paintLive(progress, 0, snapRef.current === "expanded");
    },
    [paintLive],
  );

  const onSheetTransitionEnd = useCallback(
    (event: ReactTransitionEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget) return;
      if (
        event.propertyName !== "transform" &&
        event.propertyName !== "height"
      ) {
        return;
      }

      if (closingRef.current) {
        emitClose();
        return;
      }
      setAnimate(false);
      const el = sheetRef.current;
      if (el) el.style.transition = "";
    },
    [emitClose],
  );

  const { peekH, expandedH } = heightsRef.current;
  const heightPx = expandable
    ? Math.round(peekH + expandProgress * (expandedH - peekH))
    : undefined;

  const sheetStyle: CSSProperties = (() => {
    if (!dragEnabled) {
      return {};
    }
    if (!expandable) {
      if (dragging || offsetY > 0 || animate || closing) {
        return {
          transform: `translate3d(0, ${offsetY}px, 0)`,
          transition:
            dragging || !animate
              ? "none"
              : "transform 260ms cubic-bezier(0.32, 0.72, 0, 1)",
        };
      }
      return {};
    }

    // Высота/transform пишутся в DOM во время драга; React держит стартовые значения.
    return {
      height: heightPx,
      maxHeight: "100%",
      ["--sheet-expand" as string]: String(expandProgress),
    };
  })();

  const sharedPointer = dragEnabled
    ? {
        onPointerMove: moveDrag,
        onPointerUp: endDrag,
        onPointerCancel: cancelDrag,
      }
    : {};

  const chromeProps = dragEnabled
    ? {
        ...sharedPointer,
        onPointerDown: (event: ReactPointerEvent<HTMLElement>) =>
          beginDrag(event, "handle"),
        style: { touchAction: "none" } as CSSProperties,
      }
    : {};

  const handleProps = dragEnabled
    ? {
        ...chromeProps,
        role: "slider" as const,
        tabIndex: 0,
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        "aria-valuenow": Math.min(
          100,
          Math.round(
            expandable ? expandProgress * 100 : (offsetY / CLOSE_PX) * 100,
          ),
        ),
        "aria-orientation": "vertical" as const,
      }
    : {};

  const headerProps = dragEnabled
    ? {
        ...sharedPointer,
        onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest("button, a, input, textarea, select, label")) return;
          beginDrag(event, "handle");
        },
      }
    : {};

  const scrollProps = {
    ref: setScrollNode,
    ...(dragEnabled
      ? {
          ...sharedPointer,
          onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest("button, a, input, textarea, select, label"))
              return;
            beginDrag(event, "scroll");
          },
          onScroll: () => {
            if (!expandable) return;
            const scroller = scrollRef.current;
            if (!scroller) return;
            if (snapRef.current === "peek" && scroller.scrollTop > 0) {
              scroller.scrollTop = 0;
              expandFromScroll();
            }
          },
          onWheel: (event: ReactWheelEvent<HTMLElement>) => {
            if (!expandable) return;
            const scroller = scrollRef.current;
            if (snapRef.current === "peek" && event.deltaY > 0) {
              event.preventDefault();
              expandFromScroll();
              return;
            }
            if (
              snapRef.current === "expanded" &&
              event.deltaY < 0 &&
              (!scroller || scroller.scrollTop <= 0)
            ) {
              event.preventDefault();
              collapseFromScroll();
            }
          },
        }
      : {}),
    style: {
      touchAction: dragEnabled && dragging ? "none" : "pan-y",
      overscrollBehavior: "contain",
    } as CSSProperties,
  };

  const expanded = dragEnabled && expandable && snap === "expanded";

  return {
    sheetStyle,
    handleProps,
    chromeProps,
    headerProps,
    scrollProps,
    sheetProps: {
      ref: setSheetNode,
      onTransitionEnd: dragEnabled ? onSheetTransitionEnd : undefined,
    },
    dragging: dragEnabled && dragging,
    closing: dragEnabled && closing,
    offsetY: dragEnabled ? offsetY : 0,
    expandProgress: dragEnabled ? expandProgress : 0,
    expanded,
    snap: dragEnabled ? snap : ("peek" as Snap),
    dragEnabled,
  };
}
