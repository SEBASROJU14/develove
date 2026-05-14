import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import CreateEventForm from "./create-event-form";

export default async function NewEventPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  return (
    <main className="min-h-screen px-5 pb-10 max-w-lg mx-auto">
      <div
        className="sticky top-0 z-10 -mx-5 px-5 pt-10 pb-4 mb-4"
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

      <div className="mb-8">
        <h1 className="text-2xl font-bold font-playfair" style={{ color: "var(--color-foreground)" }}>
          Nuevo rollo
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
          Una cámara desechable para tu momento
        </p>
      </div>

      <CreateEventForm />
    </main>
  );
}

function ArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
  );
}
