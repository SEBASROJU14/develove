"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import SignOutButton from "./sign-out-button";
import JoinSheet from "./join-sheet";
import { formatDate } from "@/lib/utils";
import type { Event, MembershipWithEvent } from "@/types/database";

interface Props {
  firstName: string;
  active: MembershipWithEvent[];
  revealed: MembershipWithEvent[];
  thumbsByEvent: Record<string, string[]>;
}

function computeCountdown(revealDate: string, now: number): string {
  const diff = new Date(revealDate).getTime() - now;
  if (diff <= 0) return "Listo";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export default function DashboardShell({ firstName, active, revealed, thumbsByEvent }: Props) {
  const [joinOpen, setJoinOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <main
        className="max-w-lg mx-auto px-5"
        style={{
          paddingTop: "2.5rem",
          paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom))",
          minHeight: "100svh",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Image src="/logo.png" alt="develove" width={120} height={36} className="h-8 w-auto" />
            <p className="text-xs mt-1" style={{ color: "#888" }}>
              hola, {firstName}
            </p>
          </div>
          <SignOutButton />
        </div>

        {/* Eventos activos */}
        <section className="mb-8">
          <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: "#888" }}>
            Tus eventos activos
          </p>

          {active.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: "#888" }}>
              Crea un evento o únete con un código.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {active.map((m) => {
                const ev = m.events as unknown as Event;
                const pct = Math.min((m.photos_taken / ev.max_photos_per_person) * 100, 100);
                const countdown = computeCountdown(ev.reveal_date, now);

                return (
                  <Link
                    key={m.id}
                    href={`/events/${ev.code}`}
                    className="flex flex-col rounded-2xl overflow-hidden transition-opacity active:opacity-60"
                    style={{
                      background: "#1A1A1A",
                      border: "1px solid #2A2A2A",
                      minHeight: 164,
                    }}
                  >
                    {ev.cover_image_url ? (
                      /* Con imagen de portada */
                      <>
                        <div className="relative shrink-0" style={{ height: 80 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ev.cover_image_url}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div
                            className="absolute inset-0"
                            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65), transparent 60%)" }}
                          />
                          <div className="absolute top-2.5 left-3 right-3 flex items-start justify-between">
                            <p className="font-mono text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                              #{ev.code}
                            </p>
                            <ArrowUpRight color="rgba(255,255,255,0.7)" />
                          </div>
                          <div className="absolute bottom-2.5 left-3 right-3">
                            <p
                              className="font-playfair font-bold text-sm leading-snug line-clamp-1"
                              style={{ color: "white" }}
                            >
                              {ev.name}
                            </p>
                          </div>
                        </div>
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[11px]" style={{ color: "#888" }}>
                              {m.photos_taken}/{ev.max_photos_per_person} fotos
                            </p>
                            <p className="text-[11px] font-mono" style={{ color: "#4A8B8C" }}>
                              {countdown}
                            </p>
                          </div>
                          <div style={{ background: "#2A2A2A", height: 3, borderRadius: 2 }}>
                            <div
                              style={{
                                width: `${pct}%`,
                                height: 3,
                                background: "#4A8B8C",
                                borderRadius: 2,
                                transition: "width 0.5s ease",
                              }}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Sin imagen — layout original */
                      <div className="flex flex-col p-4" style={{ flex: 1 }}>
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-mono text-[11px]" style={{ color: "#888" }}>
                            #{ev.code}
                          </p>
                          <ArrowUpRight />
                        </div>
                        <p
                          className="font-playfair font-bold text-sm leading-snug line-clamp-2 mb-auto"
                          style={{ color: "#F5F5F5" }}
                        >
                          {ev.name}
                        </p>
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[11px]" style={{ color: "#888" }}>
                              {m.photos_taken}/{ev.max_photos_per_person} fotos
                            </p>
                            <p className="text-[11px] font-mono" style={{ color: "#4A8B8C" }}>
                              {countdown}
                            </p>
                          </div>
                          <div style={{ background: "#2A2A2A", height: 3, borderRadius: 2 }}>
                            <div
                              style={{
                                width: `${pct}%`,
                                height: 3,
                                background: "#4A8B8C",
                                borderRadius: 2,
                                transition: "width 0.5s ease",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Rollos revelados */}
        {revealed.length > 0 && (
          <section>
            <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: "#888" }}>
              Rollos revelados
            </p>
            <div className="space-y-2">
              {revealed.map((m) => {
                const ev = m.events as unknown as Event;
                const thumbs = thumbsByEvent[ev.id] ?? [];

                return (
                  <Link
                    key={m.id}
                    href={`/events/${ev.code}`}
                    className="flex items-stretch rounded-2xl overflow-hidden transition-opacity active:opacity-60"
                    style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
                  >
                    {/* Portada a la izquierda */}
                    {ev.cover_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ev.cover_image_url}
                        alt=""
                        className="object-cover shrink-0"
                        style={{ width: 56 }}
                      />
                    )}

                    <div
                      className="flex items-center justify-between flex-1 min-w-0"
                      style={{ padding: ev.cover_image_url ? "10px 14px" : "16px" }}
                    >
                      <div className="min-w-0 mr-3">
                        <p
                          className="font-playfair font-medium text-sm truncate"
                          style={{ color: "#F5F5F5" }}
                        >
                          {ev.name}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "#888" }}>
                          Revelado el {formatDate(ev.reveal_date)}
                        </p>
                      </div>

                      <div className="flex gap-1 shrink-0">
                        {thumbs.length === 0 ? (
                          <div
                            className="rounded-lg flex items-center justify-center text-[10px]"
                            style={{ width: 38, height: 38, background: "#2A2A2A", color: "#888" }}
                          >
                            —
                          </div>
                        ) : (
                          thumbs.slice(0, 4).map((url, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={i}
                              src={url}
                              alt=""
                              className="rounded-lg object-cover"
                              style={{ width: 38, height: 38 }}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex gap-3 px-5 pt-3"
        style={{
          background: "#0F0F0F",
          borderTop: "1px solid #2A2A2A",
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        }}
      >
        <button
          onClick={() => setJoinOpen(true)}
          className="flex-1 py-3 rounded-xl text-sm font-bold transition-opacity active:opacity-60"
          style={{ border: "1.5px solid #2A2A2A", color: "#F5F5F5", background: "transparent" }}
        >
          Unirse
        </button>
        <Link
          href="/events/new"
          className="flex-1 py-3 rounded-xl text-sm font-bold text-center transition-opacity active:opacity-60"
          style={{ background: "#4A8B8C", color: "white" }}
        >
          Crear evento
        </Link>
      </div>

      <JoinSheet open={joinOpen} onClose={() => setJoinOpen(false)} />
    </>
  );
}

function ArrowUpRight({ color = "#888" }: { color?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17L17 7M17 7H7M17 7v10" />
    </svg>
  );
}
