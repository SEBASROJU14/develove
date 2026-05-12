"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateEventCode, toLocalDatetimeInput } from "@/lib/utils";

const PHOTO_LIMITS = [12, 24, 27, 36] as const;

const now = new Date();
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);

export default function CreateEventForm() {
  const router = useRouter();
  const [code] = useState(() => generateEventCode());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState(toLocalDatetimeInput(tomorrow));
  const [revealDate, setRevealDate] = useState(toLocalDatetimeInput(dayAfter));
  const [maxPhotos, setMaxPhotos] = useState<(typeof PHOTO_LIMITS)[number]>(27);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: event, error: insertError } = await supabase
      .from("events")
      .insert({
        name: name.trim(),
        code,
        owner_id: user.id,
        event_date: new Date(eventDate).toISOString(),
        reveal_date: new Date(revealDate).toISOString(),
        max_photos_per_person: maxPhotos,
      })
      .select("id, code")
      .single();

    if (insertError || !event) {
      setError("No se pudo crear el evento. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    await supabase.from("event_members").insert({
      event_id: event.id,
      user_id: user.id,
    });

    router.push(`/events/${event.code}`);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Nombre */}
      <Field label="Nombre del evento">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Boda de Ana y Luis"
          required
          className="w-full bg-transparent outline-none text-sm"
          style={{ color: "var(--color-foreground)" }}
        />
      </Field>

      {/* Código */}
      <Field label="Código del rollo">
        <div className="flex items-center justify-between">
          <span className="font-mono text-lg tracking-widest" style={{ color: "var(--color-foreground)" }}>
            {code}
          </span>
          <span className="text-xs" style={{ color: "var(--color-muted)" }}>
            Auto-generado
          </span>
        </div>
      </Field>

      {/* Fecha evento */}
      <Field label="Fecha del evento">
        <input
          type="datetime-local"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          min={toLocalDatetimeInput()}
          required
          className="w-full bg-transparent outline-none text-sm"
          style={{ color: "var(--color-foreground)", colorScheme: "dark" }}
        />
      </Field>

      {/* Fecha revelado */}
      <Field label="Fecha de revelado">
        <input
          type="datetime-local"
          value={revealDate}
          onChange={(e) => setRevealDate(e.target.value)}
          min={eventDate}
          required
          className="w-full bg-transparent outline-none text-sm"
          style={{ color: "var(--color-foreground)", colorScheme: "dark" }}
        />
      </Field>

      {/* Fotos */}
      <div>
        <p className="text-xs mb-3 font-medium tracking-wider uppercase" style={{ color: "var(--color-muted)" }}>
          Fotos por persona
        </p>
        <div className="grid grid-cols-4 gap-2">
          {PHOTO_LIMITS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMaxPhotos(n)}
              className="py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: maxPhotos === n ? "var(--color-primary)" : "var(--color-surface)",
                color: maxPhotos === n ? "white" : "var(--color-muted)",
                border: maxPhotos === n ? "1px solid transparent" : "1px solid var(--color-border)",
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm" style={{ color: "#ef4444" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="w-full py-4 rounded-2xl font-semibold text-sm disabled:opacity-40 transition-opacity mt-2"
        style={{ background: "var(--color-primary)", color: "white" }}
      >
        {loading ? "Creando..." : "Crear rollo"}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl px-4 py-3.5"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <p className="text-xs mb-1.5 font-medium tracking-wider uppercase" style={{ color: "var(--color-muted)" }}>
        {label}
      </p>
      {children}
    </div>
  );
}
