"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  fetchStories,
  markStoryViewed,
  pickStoryLabel,
  pickStoryPhoto,
  pickStoryText,
  pickStoryTitle,
  type StoryDto,
} from "@/lib/api/stories";
import { enterFullscreen, exitFullscreen } from "@/lib/fullscreenController";
import { useLocale, useT } from "@/hooks/useT";
import "./stories.css";

export type StoryItem = StoryDto;

const PAGE_MS = 5000;
const CLOSE_DRAG_PX = 120;
const SWIPE_X_PX = 56;
/** На мобилке ghost-click / остаточный touch приходит ~300–500мс после открытия */
const OPEN_TAP_GUARD_MS = 700;

function StoryViewer({
  stories,
  startIndex,
  onClose,
  onStoryShown,
}: {
  stories: StoryItem[];
  startIndex: number;
  onClose: () => void;
  onStoryShown?: (storyId: number) => void;
}) {
  const lang = useLocale();
  const t = useT();
  const [storyIndex, setStoryIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [tapNavReady, setTapNavReady] = useState(false);

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const dragYRef = useRef(0);
  const pausedRef = useRef(false);
  const draggingRef = useRef(false);
  const storyIndexRef = useRef(storyIndex);
  const markedRef = useRef<Set<number>>(new Set());
  const onCloseRef = useRef(onClose);
  const onStoryShownRef = useRef(onStoryShown);
  const tapPressAtRef = useRef(0);

  const story = stories[storyIndex];
  const headerTitle =
    (story && (pickStoryTitle(story, lang) || pickStoryLabel(story, lang))) || "";

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    onStoryShownRef.current = onStoryShown;
  }, [onStoryShown]);

  useEffect(() => {
    setTapNavReady(false);
    const timer = window.setTimeout(() => setTapNavReady(true), OPEN_TAP_GUARD_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    storyIndexRef.current = storyIndex;
  }, [storyIndex]);

  useEffect(() => {
    if (!story || story.viewed || markedRef.current.has(story.id)) return;
    markedRef.current.add(story.id);
    onStoryShownRef.current?.(story.id);
  }, [story]);

  const goNext = useCallback(() => {
    const sIndex = storyIndexRef.current;
    if (sIndex < stories.length - 1) {
      setStoryIndex(sIndex + 1);
      setProgress(0);
      return;
    }
    onCloseRef.current();
  }, [stories.length]);

  const goPrev = useCallback(() => {
    const sIndex = storyIndexRef.current;
    if (sIndex > 0) {
      setStoryIndex(sIndex - 1);
      setProgress(0);
      return;
    }
    setProgress(0);
  }, []);

  const pause = useCallback(() => {
    pausedRef.current = true;
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
  }, []);

  const handleTapNav = useCallback(
    (direction: "prev" | "next") => {
      // Длинное удержание (>280ms) — только пауза, без перехода
      if (Date.now() - tapPressAtRef.current > 280) return;
      if (direction === "prev") goPrev();
      else goNext();
    },
    [goNext, goPrev],
  );

  const onTapPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.pointerType === "touch" || event.pointerType === "pen") {
        event.preventDefault();
      }
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
      tapPressAtRef.current = Date.now();
      touchStart.current = { x: event.clientX, y: event.clientY };
      lastPointer.current = { x: event.clientX, y: event.clientY };
      dragYRef.current = 0;
      draggingRef.current = false;
      pause();
    },
    [pause],
  );

  const onTapPointerMove = useCallback((event: React.PointerEvent) => {
    const start = touchStart.current;
    if (!start) return;
    lastPointer.current = { x: event.clientX, y: event.clientY };
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const isPullDown = dy > 12 && Math.abs(dy) > Math.abs(dx);
    if (isPullDown) {
      draggingRef.current = true;
      setDragging(true);
      dragYRef.current = dy;
      setDragY(dy);
    }
  }, []);

  const onTapPointerUp = useCallback(
    (direction: "prev" | "next") => {
      const start = touchStart.current;
      const end = lastPointer.current;
      const wasDragging = draggingRef.current;
      const currentDragY = dragYRef.current;
      touchStart.current = null;
      lastPointer.current = null;
      resume();
      draggingRef.current = false;

      if (wasDragging || currentDragY > 0) {
        if (currentDragY >= CLOSE_DRAG_PX) onCloseRef.current();
        dragYRef.current = 0;
        setDragY(0);
        setDragging(false);
        return;
      }

      if (start && end) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        if (Math.abs(dx) >= SWIPE_X_PX && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) goNext();
          else goPrev();
          return;
        }
      }

      handleTapNav(direction);
    },
    [goNext, goPrev, handleTapNav, resume],
  );

  useEffect(() => {
    if (!tapNavReady) {
      setProgress(0);
      return;
    }

    setProgress(0);
    let raf = 0;
    let start = performance.now();
    let value = 0;
    let closed = false;

    const tick = (now: number) => {
      if (closed) return;
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
    return () => {
      closed = true;
      cancelAnimationFrame(raf);
    };
  }, [goNext, storyIndex, tapNavReady]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    enterFullscreen();
    return () => {
      document.body.style.overflow = previous;
      exitFullscreen();
    };
  }, []);

  if (!story) return null;

  const dismissProgress = Math.min(1, Math.max(0, dragY / CLOSE_DRAG_PX));
  const currentLabel = headerTitle.replace("\n", " · ");

  return createPortal(
    <div
      className="story-viewer"
      style={{
        transform: `translateY(${Math.max(0, dragY)}px) scale(${1 - dismissProgress * 0.06})`,
        opacity: 1 - dismissProgress * 0.35,
        transition: dragging ? "none" : "transform 180ms ease, opacity 180ms ease",
      }}
    >
      <div className="story-viewer__viewport">
        <div
          className="story-viewer__track"
          style={{
            transform: `translate3d(-${storyIndex * 100}%, 0, 0)`,
          }}
        >
          {stories.map((item) => {
            const slidePhoto = pickStoryPhoto(item, lang);
            const slideTitle = pickStoryTitle(item, lang);
            const slideText = pickStoryText(item, lang);
            return (
              <article key={item.id} className="story-viewer__slide">
                <div
                  className="story-viewer__bg"
                  style={
                    slidePhoto
                      ? {
                          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.72) 100%), url(${slidePhoto})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : {
                          background: `linear-gradient(165deg, ${item.accent} 0%, #0a0a0b 58%, #09090b 100%)`,
                        }
                  }
                />
                <div className="story-viewer__content">
                  <p className="story-viewer__eyebrow">История</p>
                  <h2 className="story-viewer__title">{slideTitle}</h2>
                  <p className="story-viewer__text">{slideText}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        className="story-viewer__tap story-viewer__tap--prev"
        aria-label="Предыдущий"
        tabIndex={tapNavReady ? 0 : -1}
        disabled={!tapNavReady}
        onPointerDown={onTapPointerDown}
        onPointerMove={onTapPointerMove}
        onPointerUp={() => onTapPointerUp("prev")}
        onPointerCancel={resume}
      />
      <button
        type="button"
        className="story-viewer__tap story-viewer__tap--next"
        aria-label="Следующий"
        tabIndex={tapNavReady ? 0 : -1}
        disabled={!tapNavReady}
        onPointerDown={onTapPointerDown}
        onPointerMove={onTapPointerMove}
        onPointerUp={() => onTapPointerUp("next")}
        onPointerCancel={resume}
      />

      <div className="story-viewer__top">
        <div className="story-viewer__bars">
          {/* Один сторис = одна линия прогресса (не все сразу) */}
          <div className="story-viewer__bar">
            <span style={{ width: `${progress * 100}%` }} />
          </div>
        </div>

        <div className="story-viewer__header">
          <p className="story-viewer__label">{currentLabel}</p>
          <button
            type="button"
            className="story-viewer__close"
            onTouchStart={(event) => {
              event.stopPropagation();
            }}
            onTouchEnd={(event) => {
              event.stopPropagation();
              event.preventDefault();
              onCloseRef.current();
            }}
            onClick={(event) => {
              event.stopPropagation();
              onCloseRef.current();
            }}
            aria-label="Закрыть"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      </div>

      <p className="story-viewer__hint">
        {t("stories.swipe_close", "Свайп вниз — закрыть")}
      </p>
    </div>,
    document.body,
  );
}

export default function Stories() {
  const lang = useLocale();
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const touchOpenedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchStories()
      .then((items) => {
        if (cancelled) return;
        setStories(items ?? []);
      })
      .catch(() => {
        if (!cancelled) setStories([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClose = useCallback(() => {
    setOpenIndex(null);
  }, []);

  const handleStoryShown = useCallback((storyId: number) => {
    setStories((prev) =>
      prev.map((item) =>
        item.id === storyId && !item.viewed ? { ...item, viewed: true } : item,
      ),
    );
    void markStoryViewed(storyId).catch(() => {});
  }, []);

  const openStory = useCallback((index: number) => {
    setOpenIndex(index);
  }, []);

  if (loading || stories.length === 0) {
    return null;
  }

  return (
    <section className="stories" aria-label="Истории">
      <div className="stories__scroller">
        {stories.map((story, index) => {
          const cover = pickStoryPhoto(story, lang);
          const label = pickStoryLabel(story, lang);
          return (
            <button
              key={story.id}
              type="button"
              className={`stories__tile${story.viewed ? " stories__tile--viewed" : ""}`}
              style={{ ["--story-accent" as string]: story.accent }}
              onTouchEnd={(event) => {
                // preventDefault гасит синтетический click → нет ghost-click в viewer
                event.preventDefault();
                touchOpenedRef.current = true;
                openStory(index);
              }}
              onClick={() => {
                if (touchOpenedRef.current) {
                  touchOpenedRef.current = false;
                  return;
                }
                openStory(index);
              }}
            >
              <span className="stories__tile-ring" aria-hidden />
              <span
                className="stories__tile-inner"
                style={
                  cover
                    ? {
                        backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.55)), url(${cover})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        color: "#fff",
                      }
                    : undefined
                }
              >
                <span className="stories__tile-label">{label}</span>
              </span>
            </button>
          );
        })}
      </div>

      {openIndex != null ? (
        <StoryViewer
          key={openIndex}
          stories={stories}
          startIndex={openIndex}
          onClose={handleClose}
          onStoryShown={handleStoryShown}
        />
      ) : null}
    </section>
  );
}
