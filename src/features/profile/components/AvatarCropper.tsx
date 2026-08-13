"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type AvatarCropperProps = {
  imageSrc: string;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
  busy?: boolean;
};

/** Итоговый аватар маленький: 256×256 JPEG ≈ 20–60 КБ */
const VIEWPORT = 260;
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
 * Круглый кроппер в общем app-bottom-sheet.
 * На выходе лёгкий JPEG.
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
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

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

  if (!portalReady) return null;

  return createPortal(
    <>
      <button
        type="button"
        className="app-bottom-sheet-backdrop"
        onClick={() => {
          if (!busy) onCancel();
        }}
        aria-label="Закрыть"
      />

      <div
        className="app-bottom-sheet app-bottom-sheet--avatar-crop"
        role="dialog"
        aria-modal="true"
        aria-label="Фото профиля"
      >
        <div className="app-bottom-sheet__toolbar">
          <button
            type="button"
            className="app-drawer-close"
            disabled={busy}
            onClick={() => {
              if (!busy) onCancel();
            }}
            aria-label="Закрыть"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="app-bottom-sheet__body">
          <div className="avatar-crop__stage">
            <div
              className="avatar-crop__viewport"
              style={{
                width: VIEWPORT,
                height: VIEWPORT,
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
                  className="avatar-crop__img"
                  style={{
                    width: drawW,
                    height: drawH,
                    left: (VIEWPORT - drawW) / 2 + offset.x,
                    top: (VIEWPORT - drawH) / 2 + offset.y,
                  }}
                />
              ) : (
                <div className="avatar-crop__loading">Загрузка…</div>
              )}
              <div className="avatar-crop__ring" aria-hidden />
            </div>
          </div>

          <div className="avatar-crop__preview-row">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Превью" className="avatar-crop__preview" />
            ) : (
              <div className="avatar-crop__preview avatar-crop__preview--empty" />
            )}
            <p className="avatar-crop__preview-title">Превью аватара</p>
          </div>

          <div className="avatar-crop__zoom">
            <button
              type="button"
              disabled={!ready || busy}
              onClick={() => setScale((s) => Math.max(minScale, s - 0.08))}
              className="avatar-crop__zoom-btn"
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
              className="avatar-crop__range"
            />
            <button
              type="button"
              disabled={!ready || busy}
              onClick={() =>
                setScale((s) => Math.min(Math.max(minScale * 4, 2.5), s + 0.08))
              }
              className="avatar-crop__zoom-btn"
              aria-label="Увеличить"
            >
              +
            </button>
          </div>
        </div>

        <div className="app-bottom-sheet__footer">
          <button
            type="button"
            disabled={!ready || busy}
            onClick={() => void handleConfirm()}
            className="theme-button"
          >
            {busy ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
