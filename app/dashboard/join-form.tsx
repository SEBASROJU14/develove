"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function JoinForm() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function join(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) return;
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
      .eq("code", trimmed)
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
        value={code}
        onChange={(e) => {
          setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
          setError("");
        }}
        maxLength={6}
        placeholder="ABC123"
        className="w-full text-center font-mono text-lg tracking-widest bg-transparent outline-none"
        style={{ color: "var(--color-foreground)" }}
      />
      {error && (
        <p className="text-xs text-center" style={{ color: "#ef4444" }}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading || code.length < 6}
        className="w-full py-2 rounded-lg text-sm font-medium disabled:opacity-30 cursor-pointer transition-opacity"
        style={{
          background: "var(--color-border)",
          color: "var(--color-foreground)",
        }}
      >
        {loading ? "Buscando..." : "Entrar"}
      </button>
    </form>
  );
}
