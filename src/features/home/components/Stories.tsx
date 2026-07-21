"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./stories.css";

export type StoryPage = {
  id: string;
  title: string;
  text: string;
  accent: string;
};

export type StoryItem = {
  id: string;
  label: string;
  accent: string;
  pages: StoryPage[];
};

const STORIES: StoryItem[] = [
  {
    id: "wash",
    label: "Мойка\nза 5 мин",
    accent: "#2563eb",
    pages: [
      {
        id: "wash-1",
        title: "Быстрая мойка",
        text: "Найдите свободный пост рядом и начните мойку без очереди.",
        accent: "#2563eb",
      },
      {
        id: "wash-2",
        title: "Оплата в приложении",
        text: "Пополните баланс один раз — дальше просто выбирайте пост.",
        accent: "#1d4ed8",
      },
    ],
  },
  {
    id: "charge",
    label: "ЭЗС\nрядом",
    accent: "#10b981",
    pages: [
      {
        id: "charge-1",
        title: "Зарядка рядом",
        text: "Смотрите свободные станции на карте и стройте маршрут в один тап.",
        accent: "#10b981",
      },
      {
        id: "charge-2",
        title: "Статус в реальном времени",
        text: "Свободно или занято — видно сразу, до приезда на точку.",
        accent: "#059669",
      },
    ],
  },
  {
    id: "bonus",
    label: "Бонусы\nна баланс",
    accent: "#f59e0b",
    pages: [
      {
        id: "bonus-1",
        title: "Копите бонусы",
        text: "За мойки и зарядки начисляем бонусы — ими можно оплачивать услуги.",
        accent: "#f59e0b",
      },
    ],
  },
  {
    id: "map",
    label: "Карта\nточек",
    accent: "#8b5cf6",
    pages: [
      {
        id: "map-1",
        title: "Все точки на карте",
        text: "Фильтруйте мойки и ЭЗС, ищите по названию и смотрите расстояние.",
        accent: "#8b5cf6",
      },
      {
        id: "map-2",
        title: "Список рядом",
        text: "Откройте список — сначала ближайшие в радиусе 100 км.",
        accent: "#7c3aed",
      },
    ],
  },
];

const PAGE_MS = 5000;
const CLOSE_DRAG_PX = 120;

function StoryTileIcon({ storyId }: { storyId: string }) {
  if (storyId === "charge") {
    return (
      <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M11 21h-1l1-7H7l6-11h1l-1 7h4l-6 11z" />
      </svg>
    );
  }
  if (storyId === "bonus") {
    return (
      <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M5 8h14M7 12h10M9 16h6" />
      </svg>
    );
  }
  if (storyId === "map") {
    return (
      <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
        <path strokeLinecap="round" d="M9 4v14M15 6v14" />
      </svg>
    );
  }
  return (
    <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 9.5 12 4l9 5.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5Z"
      />
    </svg>
  );
}

function StoryViewer({
  stories,
  startIndex,
  onClose,
}: {
  stories: StoryItem[];
  startIndex: number;
  onClose: () => void;
}) {
  const [storyIndex, setStoryIndex] = useState(startIndex);
  const [pageIndex, setPageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const dragYRef = useRef(0);
  const pausedRef = useRef(false);
  const draggingRef = useRef(false);
  const storyIndexRef = useRef(storyIndex);
  const pageIndexRef = useRef(pageIndex);

  const story = stories[storyIndex];
  const page = story?.pages[pageIndex];

  useEffect(() => {
    storyIndexRef.current = storyIndex;
  }, [storyIndex]);

  useEffect(() => {
    pageIndexRef.current = pageIndex;
  }, [pageIndex]);

  const goNext = useCallback(() => {
    const sIndex = storyIndexRef.current;
    const pIndex = pageIndexRef.current;
    const current = stories[sIndex];
    if (!current) {
      onClose();
      return;
    }
    if (pIndex < current.pages.length - 1) {
      setPageIndex(pIndex + 1);
      setProgress(0);
      return;
    }
    if (sIndex < stories.length - 1) {
      setStoryIndex(sIndex + 1);
      setPageIndex(0);
      setProgress(0);
      return;
    }
    onClose();
  }, [onClose, stories]);

  const goPrev = useCallback(() => {
    const sIndex = storyIndexRef.current;
    const pIndex = pageIndexRef.current;
    if (pIndex > 0) {
      setPageIndex(pIndex - 1);
      setProgress(0);
      return;
    }
    if (sIndex > 0) {
      const prevStory = stories[sIndex - 1];
      setStoryIndex(sIndex - 1);
      setPageIndex(Math.max(0, (prevStory?.pages.length ?? 1) - 1));
      setProgress(0);
      return;
    }
    setProgress(0);
  }, [stories]);

  useEffect(() => {
    setProgress(0);
    let raf = 0;
    let start = performance.now();
    let value = 0;

    const tick = (now: number) => {
      if (pausedRef.current || draggingRef.current) {
        start = now - value * PAGE_MS;
        raf = requestAnimationFrame(tick);
        return;
      }

      value = Math.min(1, (now - start) / PAGE_MS);
      setProgress(value);
      if (value >= 1) {
        goNext();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [goNext, pageIndex, storyIndex]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!story || !page) return null;

  const dismissProgress = Math.min(1, Math.max(0, dragY / CLOSE_DRAG_PX));

  return createPortal(
    <div
      className="story-viewer"
      style={{
        transform: `translateY(${Math.max(0, dragY)}px) scale(${1 - dismissProgress * 0.06})`,
        opacity: 1 - dismissProgress * 0.35,
        transition: dragging ? "none" : "transform 180ms ease, opacity 180ms ease",
      }}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = { x: touch.clientX, y: touch.clientY };
        pausedRef.current = true;
        draggingRef.current = false;
        setDragging(false);
      }}
      onTouchMove={(event) => {
        const start = touchStart.current;
        if (!start) return;
        const touch = event.touches[0];
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        const isPullDown = dy > 12 && Math.abs(dy) > Math.abs(dx);
        if (isPullDown) {
          draggingRef.current = true;
          setDragging(true);
          dragYRef.current = dy;
          setDragY(dy);
        }
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        const wasDragging = draggingRef.current;
        const currentDragY = dragYRef.current;
        touchStart.current = null;
        pausedRef.current = false;
        draggingRef.current = false;

        if (wasDragging || currentDragY > 0) {
          if (currentDragY >= CLOSE_DRAG_PX) onClose();
          dragYRef.current = 0;
          setDragY(0);
          setDragging(false);
          return;
        }

        if (!start) return;
        const touch = event.changedTouches[0];
        const dx = Math.abs(touch.clientX - start.x);
        const dy = Math.abs(touch.clientY - start.y);
        if (dx > 10 || dy > 10) return;

        if (touch.clientX < window.innerWidth * 0.3) goPrev();
        else goNext();
      }}
      onMouseDown={() => {
        pausedRef.current = true;
      }}
      onMouseUp={(event) => {
        pausedRef.current = false;
        if (event.button !== 0) return;
        if (event.clientX < window.innerWidth * 0.3) goPrev();
        else goNext();
      }}
    >
      <div
        className="story-viewer__bg"
        style={{
          background: `linear-gradient(165deg, ${page.accent} 0%, #0a0a0b 58%, #09090b 100%)`,
        }}
      />

      <div className="story-viewer__top">
        <div className="story-viewer__bars">
          {story.pages.map((item, index) => (
            <div key={item.id} className="story-viewer__bar">
              <span
                style={{
                  width:
                    index < pageIndex
                      ? "100%"
                      : index === pageIndex
                        ? `${progress * 100}%`
                        : "0%",
                }}
              />
            </div>
          ))}
        </div>

        <div className="story-viewer__header">
          <p className="story-viewer__label">{story.label.replace("\n", " · ")}</p>
          <button
            type="button"
            className="story-viewer__close"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            onMouseUp={(event) => event.stopPropagation()}
            aria-label="Закрыть"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="story-viewer__content">
        <p className="story-viewer__eyebrow">История</p>
        <h2 className="story-viewer__title">{page.title}</h2>
        <p className="story-viewer__text">{page.text}</p>
        <div className="story-viewer__art" style={{ color: page.accent }}>
          <StoryTileIcon storyId={story.id} />
        </div>
      </div>

      <p className="story-viewer__hint">Свайп вниз — закрыть</p>
    </div>,
    document.body,
  );
}

export default function Stories() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="stories" aria-label="Истории">
      <div className="stories__scroller">
        {STORIES.map((story, index) => (
          <button
            key={story.id}
            type="button"
            className="stories__tile"
            style={{ ["--story-accent" as string]: story.accent }}
            onClick={() => setOpenIndex(index)}
          >
            <span className="stories__tile-ring" aria-hidden />
            <span className="stories__tile-inner">
              <span className="stories__tile-label">{story.label}</span>
              <span className="stories__tile-icon" style={{ color: story.accent }}>
                <StoryTileIcon storyId={story.id} />
              </span>
            </span>
          </button>
        ))}
      </div>

      {openIndex != null ? (
        <StoryViewer
          stories={STORIES}
          startIndex={openIndex}
          onClose={() => setOpenIndex(null)}
        />
      ) : null}
    </section>
  );
}
