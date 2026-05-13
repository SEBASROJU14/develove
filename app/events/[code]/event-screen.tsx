"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isRevealed, formatDate } from "@/lib/utils";
import CameraView from "./camera-view";
import type { Event } from "@/types/database";

interface Props {
  event: Event;
  userId: string;
  photosTaken: number;
}

export default function EventScreen({ event, userId, photosTaken: initial }: Props) {
  const router = useRouter();
  const [showCamera, setShowCamera] = useState(false);
  const [photosTaken, setPhotosTaken] = useState(initial);

  const photosLeft = event.max_photos_per_person - photosTaken;
  const pct = Math.min((photosTaken / event.max_photos_per_person) * 100, 100);
  const revealed = isRevealed(event.reveal_date);

  if (showCamera) {
    return (
      <CameraView
        event={event}
        userId={userId}
        photosTaken={photosTaken}
        onBack={() => setShowCamera(false)}
        onPhotoTaken={() => setPhotosTaken((n) => n + 1)}
      />
    );
  }

  return (
    <main className="min-h-screen px-5 pb-10 max-w-sm mx-auto flex flex-col">
      <div
        className="sticky top-0 z-10 -mx-5 px-5 pt-10 pb-4"
        style={{ background: "var(--color-background)" }}
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm"
          style={{ color: "var(--color-muted)" }}
        >
          <ArrowLeft />
          Volver
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-5">
        {/* Nombre y fecha */}
        <div>
          <p
            className="font-mono text-xs tracking-widest mb-2"
            style={{ color: "var(--color-muted)" }}
          >
            #{event.code}
          </p>
          <h1 className="text-3xl font-bold" style={{ color: "var(--color-foreground)" }}>
            {event.name}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
            {formatDate(event.event_date)}
          </p>
        </div>

        {/* Contador del rollo */}
        <div
          className="rounded-3xl p-6 space-y-5"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--color-muted)" }}>
                Exposiciones
              </p>
              <p
                className="text-4xl font-mono font-bold leading-none"
                style={{ color: "var(--color-foreground)" }}
              >
                {photosTaken}
                <span className="text-xl font-normal" style={{ color: "var(--color-muted)" }}>
                  /{event.max_photos_per_person}
                </span>
              </p>
            </div>
            <FilmIcon />
          </div>

          {/* Barra de progreso */}
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ background: "var(--color-border)", height: 5 }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: photosLeft === 0 ? "var(--color-muted)" : "var(--color-primary)",
              }}
            />
          </div>

          <p className="text-xs" style={{ color: "var(--color-muted)" }}>
            {photosLeft > 0
              ? `${photosLeft} foto${photosLeft !== 1 ? "s" : ""} restante${photosLeft !== 1 ? "s" : ""}`
              : "Rollo completo"}
          </p>
        </div>

        {/* Fecha de revelado */}
        <div
          className="rounded-2xl px-4 py-3.5"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <p className="text-xs mb-0.5" style={{ color: "var(--color-muted)" }}>
            {revealed ? "Revelado el" : "Se revela el"}
          </p>
          <p className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>
            {formatDate(event.reveal_date)}
          </p>
        </div>

        {/* CTA */}
        <div className="mt-2">
          {revealed ? (
            <button
              onClick={() => router.refresh()}
              className="w-full py-4 rounded-2xl font-semibold text-sm transition-opacity active:opacity-70"
              style={{ background: "var(--color-primary)", color: "white" }}
            >
              Ver galería
            </button>
          ) : (
            <button
              onClick={() => setShowCamera(true)}
              disabled={photosLeft <= 0}
              className="w-full py-4 rounded-2xl font-semibold text-sm disabled:opacity-40 transition-opacity active:opacity-70"
              style={{ background: "var(--color-primary)", color: "white" }}
            >
              {photosLeft <= 0 ? "Rollo completo" : "Tomar foto"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function ArrowLeft() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function FilmIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: "var(--color-muted)" }}
    >
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="2" y1="7" x2="7" y2="7" />
      <line x1="2" y1="17" x2="7" y2="17" />
      <line x1="17" y1="17" x2="22" y2="17" />
      <line x1="17" y1="7" x2="22" y2="7" />
    </svg>
  );
}
