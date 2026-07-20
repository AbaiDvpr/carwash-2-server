"use client";

import { useEffect, useRef, useState } from "react";

type AvatarCropperProps = {
  imageSrc: string;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
  busy?: boolean;
};

/** Итоговый аватар маленький: 256×256 JPEG ≈ 20–60 КБ */
const VIEWPORT = 280;
const OUTPUT_SIZE = 256;
const JPEG_QUALITY = 0.72;
const MAX_BYTES = 80 * 1024;

async function compressJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  let quality = JPEG_QUALITY;
  let blob: Blob | null = null;

  for (let i = 0; i < 6; i += 1) {
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
    });
    if (!blob) break;
    if (blob.size <= MAX_BYTES || quality <= 0.45) break;
    quality -= 0.08;
  }

  if (!blob) {
    throw new Error("compress_failed");
  }
  return blob;
}

/**
 * Круглый кроппер: двигать / масштаб / смотреть превью.
 * На выходе лёгкий JPEG, не тяжёлая картинка.
 */
export default function AvatarCropper({
  imageSrc,
  onCancel,
  onCropped,
  busy = false,
}: AvatarCropperProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(0.2);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [ready, setReady] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [approxKb, setApproxKb] = useState<number | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const minSide = Math.min(img.naturalWidth, img.naturalHeight);
      const fit = VIEWPORT / minSide;
      const initial = Math.max(fit * 1.05, 0.12);
      setMinScale(Math.max(fit * 0.85, 0.08));
      setScale(initial);
      setOffset({ x: 0, y: 0 });
      setReady(true);
    };
    img.onerror = () => setReady(false);
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  // Живое превью круга + оценка размера
  useEffect(() => {
    if (!ready || !imgRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imgRef.current;
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const left = (VIEWPORT - drawW) / 2 + offset.x;
    const top = (VIEWPORT - drawH) / 2 + offset.y;
    const sx = (0 - left) / scale;
    const sy = (0 - top) / scale;
    const sSize = VIEWPORT / scale;

    ctx.beginPath();
    ctx.arc(48, 48, 48, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, 96, 96);

    const url = canvas.toDataURL("image/jpeg", 0.7);
    setPreviewUrl(url);

    // Оценка финального веса на маленьком canvas-прокси
    const full = document.createElement("canvas");
    full.width = OUTPUT_SIZE;
    full.height = OUTPUT_SIZE;
    const fctx = full.getContext("2d");
    if (fctx) {
      fctx.fillStyle = "#fff";
      fctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      fctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      full.toBlob(
        (b) => setApproxKb(b ? Math.round(b.size / 1024) : null),
        "image/jpeg",
        JPEG_QUALITY,
      );
    }
  }, [ready, scale, offset, imageSrc]);

  function onPointerDown(event: React.PointerEvent) {
    if (busy) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      ox: offset.x,
      oy: offset.y,
    };
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!dragging || busy) return;
    setOffset({
      x: dragStart.current.ox + (event.clientX - dragStart.current.x),
      y: dragStart.current.oy + (event.clientY - dragStart.current.y),
    });
  }

  function onPointerUp(event: React.PointerEvent) {
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
    setDragging(false);
  }

  async function handleConfirm() {
    const img = imgRef.current;
    if (!img || busy) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const left = (VIEWPORT - drawW) / 2 + offset.x;
    const top = (VIEWPORT - drawH) / 2 + offset.y;
    const sx = (0 - left) / scale;
    const sy = (0 - top) / scale;
    const sSize = VIEWPORT / scale;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    try {
      const blob = await compressJpeg(canvas);
      onCropped(blob);
    } catch {
      canvas.toBlob(
        (blob) => {
          if (blob) onCropped(blob);
        },
        "image/jpeg",
        JPEG_QUALITY,
      );
    }
  }

  const img = imgRef.current;
  const drawW = img ? img.naturalWidth * scale : 0;
  const drawH = img ? img.naturalHeight * scale : 0;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-crop-title"
    >
      <div className="absolute inset-0 bg-black/65" onClick={() => !busy && onCancel()} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-xl sm:rounded-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <p
            id="avatar-crop-title"
            className="text-center text-base font-bold text-zinc-900 dark:text-zinc-50"
          >
            Обрезать фото
          </p>
          <p className="mt-1 text-center text-xs text-zinc-500">
            Двигай пальцем · масштаб · смотри превью
          </p>
        </div>

        <div className="px-4 py-4">
          <div className="flex items-start justify-center gap-4">
            <div
              className="relative shrink-0 overflow-hidden bg-zinc-900 touch-none"
              style={{
                width: VIEWPORT,
                height: VIEWPORT,
                borderRadius: "50%",
                cursor: dragging ? "grabbing" : "grab",
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {ready && img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageSrc}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute max-w-none select-none"
                  style={{
                    width: drawW,
                    height: drawH,
                    left: (VIEWPORT - drawW) / 2 + offset.x,
                    top: (VIEWPORT - drawH) / 2 + offset.y,
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                  Загрузка…
                </div>
              )}
              <div
                className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/90"
                aria-hidden
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-3">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Превью"
                className="h-14 w-14 rounded-full border-2 border-zinc-200 object-cover dark:border-zinc-700"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-zinc-200 dark:bg-zinc-800" />
            )}
            <div className="min-w-0 text-left">
              <p className="text-xs font-medium text-zinc-800 dark:text-zinc-100">Превью аватара</p>
              <p className="mt-0.5 text-[11px] text-zinc-400">
                {approxKb != null ? `≈ ${approxKb} КБ · JPEG` : "Сжатие…"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              disabled={!ready || busy}
              onClick={() => setScale((s) => Math.max(minScale, s - 0.08))}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-lg font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
              aria-label="Уменьшить"
            >
              −
            </button>
            <input
              type="range"
              min={minScale}
              max={Math.max(minScale * 4, 2.5)}
              step={0.01}
              value={scale}
              disabled={!ready || busy}
              onChange={(e) => setScale(Number(e.target.value))}
              className="min-w-0 flex-1 accent-blue-600"
            />
            <button
              type="button"
              disabled={!ready || busy}
              onClick={() => setScale((s) => Math.min(Math.max(minScale * 4, 2.5), s + 0.08))}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-lg font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
              aria-label="Увеличить"
            >
              +
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={!ready || busy}
            onClick={() => void handleConfirm()}
            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Сохранение…" : "Готово"}
          </button>
        </div>
      </div>
    </div>
  );
}
