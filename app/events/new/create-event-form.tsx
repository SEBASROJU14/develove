"use client";

import { useRef, useState } from "react";
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

  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setCoverPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

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

    // Subir imagen de portada si fue seleccionada
    if (coverFile) {
      const ext = coverFile.name.split(".").pop() ?? "jpg";
      const path = `covers/${event.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("event-photos")
        .upload(path, coverFile, { contentType: coverFile.type, upsert: true });
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from("event-photos")
          .getPublicUrl(path);
        await supabase.from("events").update({ cover_image_url: publicUrl }).eq("id", event.id);
      }
    }

    router.push(`/events/${event.code}`);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Imagen de portada */}
      <div>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCoverChange}
        />
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          className="relative w-full rounded-2xl overflow-hidden transition-opacity active:opacity-70"
          style={{
            height: 90,
            border: coverPreview ? "none" : "1.5px dashed var(--color-border)",
            background: "var(--color-surface)",
          }}
        >
          {coverPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 h-full">
              <UploadIcon />
              <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                Imagen de portada (opcional)
              </p>
            </div>
          )}
        </button>
      </div>

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
          style={{ color: "var(--color-foreground)", colorScheme: "light" }}
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
          style={{ color: "var(--color-foreground)", colorScheme: "light" }}
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

function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      style={{ color: "var(--color-muted)" }}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
