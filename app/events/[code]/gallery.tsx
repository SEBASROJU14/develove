"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import type { Event, PhotoWithProfile } from "@/types/database";

type FilterKey = "golden" | "bw" | "ghost";

const FILTERS: Record<FilterKey, { label: string; desc: string; css: string }> = {
  golden: {
    label: "Golden Film",
    desc: "Cálido",
    css: "brightness(1.04) contrast(1.1) saturate(1.3) sepia(0.12) hue-rotate(-5deg)",
  },
  bw: {
    label: "Black & White Film",
    desc: "B&W",
    css: "grayscale(1) contrast(1.2) brightness(0.92) sepia(0.04)",
  },
  ghost: {
    label: "Ghost Film",
    desc: "Frío",
    css: "brightness(1.04) contrast(0.95) saturate(0.75) hue-rotate(8deg)",
  },
};

interface Props {
  event: Event;
  photos: PhotoWithProfile[];
}

// Aplica un CSS filter a una imagen vía Canvas y devuelve el Blob resultante.
// El filtro queda "quemado" en los píxeles — la imagen en Storage no se modifica.
async function applyFilterToBlob(url: string, filterCss: string): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.filter = filterCss;
  ctx.drawImage(img, 0, 0);

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob falló"))),
      "image/jpeg",
      0.92
    )
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Gallery({ event, photos }: Props) {
  const [filter, setFilter] = useState<FilterKey>("golden");
  const [lightbox, setLightbox] = useState<PhotoWithProfile | null>(null);
  const [downloadingPhoto, setDownloadingPhoto] = useState<string | null>(null);
  const [downloadingAlbum, setDownloadingAlbum] = useState(false);

  async function downloadPhoto(photo: PhotoWithProfile) {
    if (downloadingPhoto) return;
    setDownloadingPhoto(photo.id);
    try {
      const blob = await applyFilterToBlob(photo.storage_url, FILTERS[filter].css);
      const author = photo.profile?.full_name?.split(" ")[0] ?? "foto";
      triggerDownload(blob, `${event.name}-${author}-${photo.id.slice(0, 6)}.jpg`);
    } finally {
      setDownloadingPhoto(null);
    }
  }

  async function downloadAlbum() {
    if (downloadingAlbum || photos.length === 0) return;
    setDownloadingAlbum(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const filterCss = FILTERS[filter].css;

      await Promise.all(
        photos.map(async (photo, i) => {
          const blob = await applyFilterToBlob(photo.storage_url, filterCss);
          const author = photo.profile?.full_name?.split(" ")[0] ?? "anon";
          zip.file(`${String(i + 1).padStart(2, "0")}-${author}.jpg`, blob);
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      triggerDownload(content, `${event.name}.zip`);
    } finally {
      setDownloadingAlbum(false);
    }
  }

  return (
    <>
      <div className="min-h-screen" style={{ background: "var(--color-background)" }}>
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-5 pt-10 pb-4"
          style={{
            background: "var(--color-background)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <Link href="/dashboard" className="text-sm" style={{ color: "var(--color-muted)" }}>
              ← Volver
            </Link>

            <div className="text-center">
              <p className="font-semibold text-sm" style={{ color: "var(--color-foreground)" }}>
                {event.name}
              </p>
              <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                {photos.length} foto{photos.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Descarga de álbum completo */}
            <button
              onClick={downloadAlbum}
              disabled={downloadingAlbum || photos.length === 0}
              title="Descargar álbum con filtro"
              className="p-2 rounded-xl disabled:opacity-30 transition-opacity active:opacity-60"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-foreground)",
              }}
            >
              {downloadingAlbum ? <Spinner /> : <DownloadIcon size={16} />}
            </button>
          </div>

          {/* Selector de filtro */}
          <div className="flex gap-2">
            {(Object.entries(FILTERS) as [FilterKey, (typeof FILTERS)[FilterKey]][]).map(
              ([key, f]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{
                    background: filter === key ? "var(--color-primary)" : "var(--color-surface)",
                    color: filter === key ? "white" : "var(--color-muted)",
                    border: filter === key ? "none" : "1px solid var(--color-border)",
                  }}
                >
                  {f.label}
                  <span className="block text-[10px] opacity-70">{f.desc}</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Grid de fotos */}
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              No hay fotos todavía
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-0.5 p-0.5">
            {photos.map((photo) => (
              // div en lugar de button para poder anidar el botón de descarga
              <div
                key={photo.id}
                onClick={() => setLightbox(photo)}
                className="relative aspect-square overflow-hidden cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.storage_url}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ filter: FILTERS[filter].css }}
                  loading="lazy"
                />
                <div className="film-grain" />

                {/* Autor */}
                <div
                  className="absolute bottom-0 left-0 right-0 px-2 py-1.5"
                  style={{
                    background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
                  }}
                >
                  <p className="text-xs text-white truncate">
                    {photo.profile?.full_name?.split(" ")[0] ?? "anon"}
                  </p>
                </div>

                {/* Botón de descarga individual */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadPhoto(photo);
                  }}
                  disabled={!!downloadingPhoto}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-40 transition-opacity active:opacity-60"
                  style={{ background: "rgba(0,0,0,0.5)", color: "white" }}
                >
                  {downloadingPhoto === photo.id ? (
                    <Spinner size={12} />
                  ) : (
                    <DownloadIcon size={13} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="h-20" />
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col"
          onClick={() => setLightbox(null)}
        >
          <div className="flex items-center justify-between px-5 pt-12 pb-4">
            <p className="text-white text-sm">
              {lightbox.profile?.full_name ?? "anon"}
            </p>
            <div
              className="flex items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Descarga desde lightbox */}
              <button
                onClick={() => downloadPhoto(lightbox)}
                disabled={!!downloadingPhoto}
                className="p-1.5 rounded-full disabled:opacity-40 transition-opacity active:opacity-60"
                style={{ background: "rgba(255,255,255,0.12)", color: "white" }}
              >
                {downloadingPhoto === lightbox.id ? (
                  <Spinner size={16} color="white" />
                ) : (
                  <DownloadIcon size={16} />
                )}
              </button>
              <button
                className="text-white text-2xl leading-none"
                onClick={() => setLightbox(null)}
              >
                ×
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.storage_url}
              alt=""
              className="max-w-full max-h-full object-contain"
              style={{ filter: FILTERS[filter].css }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <p className="text-center text-xs pb-10" style={{ color: "rgba(255,255,255,0.4)" }}>
            {formatDate(lightbox.taken_at)}
          </p>
        </div>
      )}
    </>
  );
}

// ── Componentes auxiliares ───────────────────────────────────────────────────

function DownloadIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function Spinner({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <div
      className="rounded-full border-2 border-t-transparent animate-spin"
      style={{
        width: size,
        height: size,
        borderColor: `${color} transparent transparent transparent`,
      }}
    />
  );
}
