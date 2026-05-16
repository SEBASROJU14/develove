"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function JoinForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [codeLen, setCodeLen] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  function handleInput() {
    const el = inputRef.current;
    if (!el) return;
    // Filtrar a mayúsculas alfanuméricas directamente en el DOM
    const filtered = el.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    el.value = filtered;
    setCodeLen(filtered.length);
    if (error) setError("");
  }

  async function join(e: React.FormEvent) {
    e.preventDefault();
    const code = inputRef.current?.value ?? "";
    if (code.length !== 6) return;

    setLoading(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: event } = await supabase
      .from("events")
      .select("id, code")
      .eq("code", code)
      .single();

    if (!event) {
      setError("Código no válido");
      setLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from("event_members")
      .select("id")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      await supabase
        .from("event_members")
        .insert({ event_id: event.id, user_id: user.id });
    }

    router.push(`/events/${event.code}`);
  }

  return (
    <form onSubmit={join} className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="text"
        onInput={handleInput}
        maxLength={6}
        placeholder="ABC123"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        enterKeyHint="go"
        className="w-full text-center font-mono text-lg tracking-widest bg-transparent outline-none py-1"
        style={{ color: "var(--color-foreground)" }}
      />
      {error && (
        <p className="text-xs text-center" style={{ color: "#ef4444" }}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading || codeLen < 6}
        className="w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-30 cursor-pointer transition-opacity"
        style={{
          background: "var(--color-primary)",
          color: "white",
        }}
      >
        {loading ? "Buscando..." : "Entrar"}
      </button>
    </form>
  );
}
