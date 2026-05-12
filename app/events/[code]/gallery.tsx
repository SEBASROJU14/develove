"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import type { Event, PhotoWithProfile } from "@/types/database";

type FilterKey = "kodak" | "ilford" | "modern";

const FILTERS: Record<FilterKey, { label: string; desc: string; css: string }> = {
  kodak: {
    label: "Kodak",
    desc: "Cálido",
    css: "brightness(1.04) contrast(1.1) saturate(1.3) sepia(0.12) hue-rotate(-5deg)",
  },
  ilford: {
    label: "Ilford",
    desc: "B&W",
    css: "grayscale(1) contrast(1.2) brightness(0.92) sepia(0.04)",
  },
  modern: {
    label: "Modern",
    desc: "Frío",
    css: "brightness(1.04) contrast(0.95) saturate(0.75) hue-rotate(8deg)",
  },
};

interface Props {
  event: Event;
  photos: PhotoWithProfile[];
}

export default function Gallery({ event, photos }: Props) {
  const [filter, setFilter] = useState<FilterKey>("kodak");
  const [lightbox, setLightbox] = useState<PhotoWithProfile | null>(null);

  return (
    <>
      <div className="min-h-screen" style={{ background: "var(--color-background)" }}>
        {/* Header */}
        <div className="sticky top-0 z-10 px-5 pt-10 pb-4"
          style={{ background: "var(--color-background)", borderBottom: "1px solid var(--color-border)" }}>
          <div className="flex items-center justify-between mb-4">
            <Link href="/dashboard" className="text-sm" style={{ color: "var(--color-muted)" }}>
              ← Volver
            </Link>
            <div className="text-right">
              <p className="font-semibold text-sm" style={{ color: "var(--color-foreground)" }}>
                {event.name}
              </p>
              <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                {photos.length} foto{photos.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Filter selector */}
          <div className="flex gap-2">
            {(Object.entries(FILTERS) as [FilterKey, typeof FILTERS[FilterKey]][]).map(
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

        {/* Photo grid */}
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              No hay fotos todavía
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-0.5 p-0.5">
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setLightbox(photo)}
                className="relative aspect-square overflow-hidden"
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
                <div
                  className="absolute bottom-0 left-0 right-0 px-2 py-1.5"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)" }}
                >
                  <p className="text-xs text-white truncate">
                    {photo.profile?.full_name?.split(" ")[0] ?? "anon"}
                  </p>
                </div>
              </button>
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
            <button className="text-white text-2xl leading-none" onClick={() => setLightbox(null)}>
              ×
            </button>
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
