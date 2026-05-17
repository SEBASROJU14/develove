"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import type { Event } from "@/types/database";

export default function JoinScreen({ event }: { event: Event }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function join() {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Verificar aforo
    if (event.max_guests !== null && event.max_guests !== undefined) {
      const { count } = await supabase
        .from("event_members")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id);
      if ((count ?? 0) >= event.max_guests) {
        setError("Este rollo está lleno");
        setLoading(false);
        return;
      }
    }

    await supabase
      .from("event_members")
      .insert({ event_id: event.id, user_id: user.id });

    router.refresh();
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <div className="max-w-xs w-full space-y-6">
        <div className="text-4xl">📷</div>

        <div>
          <h1 className="text-2xl font-bold font-playfair" style={{ color: "var(--color-foreground)" }}>
            {event.name}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
            {formatDate(event.event_date)}
          </p>
        </div>

        <div
          className="rounded-2xl p-4 text-sm space-y-1"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <p style={{ color: "var(--color-muted)" }}>
            Límite de fotos
          </p>
          <p className="font-semibold" style={{ color: "var(--color-foreground)" }}>
            {event.max_photos_per_person} exposiciones
          </p>
        </div>

        {error && (
          <p className="text-sm text-center" style={{ color: "#ef4444" }}>
            {error}
          </p>
        )}

        <button
          onClick={join}
          disabled={loading || !!error}
          className="w-full py-4 rounded-2xl font-semibold text-sm disabled:opacity-40 transition-opacity"
          style={{ background: "var(--color-primary)", color: "white" }}
        >
          {loading ? "Uniéndose..." : "Unirse al evento"}
        </button>
      </div>
    </main>
  );
}
