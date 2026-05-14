"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import type { Event, PhotoWithProfile } from "@/types/database";

type FilterKey = "golden" | "bw" | "ghost";

const FILTERS: Record<FilterKey, { label: string; desc: string }> = {
  golden: { label: "Golden Film", desc: "Cálido" },
  bw: { label: "Black & White Film", desc: "B&W" },
  ghost: { label: "Ghost Film", desc: "Frío" },
};

const FILTER_SVG_DEFS: Record<FilterKey, string> = {
  // brightness(0.85)*contrast(1.4) → slope=1.19 intercept=-0.2 | saturate(1.5) | sepia(0.35) | hue-rotate(-15)
  // halation: blur(12) orange #ff8c00 screen | grain: 0.65/4oct overlay 18%
  golden: `<filter id="filter-golden" color-interpolation-filters="sRGB" x="-5%" y="-5%" width="110%" height="110%"><feComponentTransfer result="bc"><feFuncR type="linear" slope="1.19" intercept="-0.2"/><feFuncG type="linear" slope="1.19" intercept="-0.2"/><feFuncB type="linear" slope="1.19" intercept="-0.2"/></feComponentTransfer><feColorMatrix in="bc" type="saturate" values="1.5" result="sat"/><feColorMatrix in="sat" type="matrix" values="0.788 0.269 0.066 0 0  0.122 0.890 0.059 0 0  0.095 0.187 0.696 0 0  0 0 0 1 0" result="sep"/><feColorMatrix in="sep" type="hueRotate" values="-15" result="graded"/><feGaussianBlur in="SourceGraphic" stdDeviation="12" result="glow"/><feFlood flood-color="#ff8c00" result="orange"/><feBlend in="orange" in2="glow" mode="multiply" result="orange-glow"/><feBlend in="graded" in2="orange-glow" mode="screen" result="lit"/><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" seed="2" stitchTiles="stitch" result="noise"/><feColorMatrix type="saturate" values="0" in="noise" result="mono"/><feBlend in="lit" in2="mono" mode="overlay" result="grain-blend"/><feComposite in="lit" in2="grain-blend" operator="arithmetic" k1="0" k2="0.82" k3="0.18" k4="0"/></filter>`,
  // grayscale(1) | brightness(1.0)*contrast(1.15) → slope=1.15 intercept=-0.075 | sepia(0.08)
  // grain: 0.55/4oct overlay 13%  (no halation)
  bw: `<filter id="filter-bw" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0" result="gray"/><feComponentTransfer in="gray" result="bc"><feFuncR type="linear" slope="1.15" intercept="-0.075"/><feFuncG type="linear" slope="1.15" intercept="-0.075"/><feFuncB type="linear" slope="1.15" intercept="-0.075"/></feComponentTransfer><feColorMatrix in="bc" type="matrix" values="0.951 0.062 0.015 0 0  0.028 0.975 0.013 0 0  0.022 0.043 0.930 0 0  0 0 0 1 0" result="graded"/><feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="4" seed="5" stitchTiles="stitch" result="noise"/><feColorMatrix type="saturate" values="0" in="noise" result="mono"/><feBlend in="graded" in2="mono" mode="overlay" result="grain-blend"/><feComposite in="graded" in2="grain-blend" operator="arithmetic" k1="0" k2="0.87" k3="0.13" k4="0"/></filter>`,
  // brightness(1.05)*contrast(0.95) → slope=0.9975 intercept=0.025 | saturate(0.7) | hue-rotate(10)
  // halation: blur(8) cold-white #e8f0ff screen | grain: 0.55/4oct overlay 12%
  ghost: `<filter id="filter-ghost" color-interpolation-filters="sRGB" x="-5%" y="-5%" width="110%" height="110%"><feComponentTransfer result="bc"><feFuncR type="linear" slope="0.9975" intercept="0.025"/><feFuncG type="linear" slope="0.9975" intercept="0.025"/><feFuncB type="linear" slope="0.9975" intercept="0.025"/></feComponentTransfer><feColorMatrix in="bc" type="saturate" values="0.7" result="sat"/><feColorMatrix in="sat" type="hueRotate" values="10" result="graded"/><feGaussianBlur in="SourceGraphic" stdDeviation="8" result="glow"/><feFlood flood-color="#e8f0ff" result="cold"/><feBlend in="cold" in2="glow" mode="multiply" result="cold-glow"/><feBlend in="graded" in2="cold-glow" mode="screen" result="lit"/><feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="4" seed="8" stitchTiles="stitch" result="noise"/><feColorMatrix type="saturate" values="0" in="noise" result="mono"/><feBlend in="lit" in2="mono" mode="overlay" result="grain-blend"/><feComposite in="lit" in2="grain-blend" operator="arithmetic" k1="0" k2="0.88" k3="0.12" k4="0"/></filter>`,
};

// Viñeta: radialGradient CSS para DOM, opacidades según especificación
const VIGNETTES: Record<FilterKey, string> = {
  golden: "radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0,0,0,0.35) 100%)",
  ghost:  "radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0,0,0,0.20) 100%)",
  bw:     "radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0,0,0,0.15) 100%)",
};

const VIGNETTE_OPACITY: Record<FilterKey, number> = { golden: 0.35, ghost: 0.20, bw: 0.15 };

interface Props {
  event: Event;
  photos: PhotoWithProfile[];
}

async function applyFilterToBlob(url: string, filterId: FilterKey): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = url;
  });

  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width = w;
  tmpCanvas.height = h;
  tmpCanvas.getContext("2d")!.drawImage(img, 0, 0);
  const dataUrl = tmpCanvas.toDataURL("image/jpeg", 0.92);

  const filterDef = FILTER_SVG_DEFS[filterId].replace(/id="filter-[^"]*"/, 'id="ff"');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}"><defs>${filterDef}</defs><image width="${w}" height="${h}" href="${dataUrl}" filter="url(#ff)"/></svg>`;

  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const svgImg = new Image();
    await new Promise<void>((resolve, reject) => {
      svgImg.onload = () => resolve();
      svgImg.onerror = () => reject(new Error("SVG render failed"));
      svgImg.src = svgUrl;
    });

    const outCanvas = document.createElement("canvas");
    outCanvas.width = w;
    outCanvas.height = h;
    const outCtx = outCanvas.getContext("2d")!;
    outCtx.drawImage(svgImg, 0, 0);

    // Viñeta: radialGradient quemado en canvas
    const cx = w / 2, cy = h / 2;
    const outerR = Math.sqrt(cx * cx + cy * cy);
    const vgrad = outCtx.createRadialGradient(cx, cy, outerR * 0.35, cx, cy, outerR);
    vgrad.addColorStop(0, "rgba(0,0,0,0)");
    vgrad.addColorStop(1, `rgba(0,0,0,${VIGNETTE_OPACITY[filterId]})`);
    outCtx.fillStyle = vgrad;
    outCtx.fillRect(0, 0, w, h);

    return new Promise<Blob>((resolve, reject) =>
      outCanvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob falló"))),
        "image/jpeg",
        0.92
      )
    );
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
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
      const blob = await applyFilterToBlob(photo.storage_url, filter);
      const author = photo.profile?.full_name?.split(" ")[0] ?? "foto";
      triggerDownload(blob, `${event.name}-${author}-${photo.id.slice(0, 6)}.jpg`);
    } finally {
      setDownloadingPhoto(null);
    }
  }

  async function downloadAlbum() {
    if (downloadingAlbum || photos.length === 0) return;
    setDownloadingAlbum(true);
    const currentFilter = filter;
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();

      await Promise.all(
        photos.map(async (photo, i) => {
          const blob = await applyFilterToBlob(photo.storage_url, currentFilter);
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
      <div
        aria-hidden="true"
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
        dangerouslySetInnerHTML={{
          __html: `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"><defs>${Object.values(FILTER_SVG_DEFS).join("")}</defs></svg>`,
        }}
      />
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
              <p className="font-semibold text-sm font-playfair" style={{ color: "var(--color-foreground)" }}>
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
                  style={{ filter: `url('#filter-${filter}')` }}
                  loading="lazy"
                />
                <div className="absolute inset-0 pointer-events-none" style={{ background: VIGNETTES[filter] }} />
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

          <div className="flex-1 flex items-center justify-center px-2 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.storage_url}
              alt=""
              className="max-w-full max-h-full object-contain"
              style={{ filter: `url('#filter-${filter}')` }}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute inset-0 pointer-events-none" style={{ background: VIGNETTES[filter] }} />
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
