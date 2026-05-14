import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import SignOutButton from "./sign-out-button";
import JoinForm from "./join-form";
import { formatDate, isRevealed } from "@/lib/utils";
import type { Event, MembershipWithEvent } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const firstName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    "dev";

  const { data: raw } = await supabase
    .from("event_members")
    .select("id, event_id, photos_taken, joined_at, events(*)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  const memberships = (raw ?? []) as unknown as MembershipWithEvent[];

  return (
    <main className="min-h-screen px-5 py-10 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <Image src="/logo.png" alt="develove" width={120} height={36} className="h-8 w-auto" />
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
            hola, {firstName}
          </p>
        </div>
        <SignOutButton />
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 mb-10">
        <Link
          href="/events/new"
          className="flex flex-col items-center justify-center gap-3 py-8 rounded-2xl font-medium transition-opacity active:opacity-70"
          style={{ background: "var(--color-primary)", color: "white" }}
        >
          <CameraIcon />
          <span className="text-sm">Crear evento</span>
        </Link>

        <div
          className="rounded-2xl p-4 flex flex-col justify-between"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <p className="text-xs mb-3" style={{ color: "var(--color-muted)" }}>
            Unirse con código
          </p>
          <JoinForm />
        </div>
      </div>

      {/* Events */}
      <div className="space-y-3">
        <p className="text-xs font-medium tracking-wider uppercase" style={{ color: "var(--color-muted)" }}>
          Tus rollos
        </p>

        {memberships.length === 0 && (
          <p className="text-sm py-6 text-center" style={{ color: "var(--color-muted)" }}>
            Crea tu primer evento o únete con un código.
          </p>
        )}

        {memberships.map((m) => {
          const ev = m.events as unknown as Event;
          const revealed = isRevealed(ev.reveal_date);
          const remaining = ev.max_photos_per_person - m.photos_taken;

          return (
            <Link
              key={m.id}
              href={`/events/${ev.code}`}
              className="flex items-center justify-between p-4 rounded-2xl transition-opacity active:opacity-70"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="min-w-0">
                <p
                  className="font-medium truncate font-playfair"
                  style={{ color: "var(--color-foreground)" }}
                >
                  {ev.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
                  {formatDate(ev.event_date)}
                </p>
              </div>
              <div className="ml-4 text-right shrink-0">
                {revealed ? (
                  <span
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{ background: "var(--color-primary)", color: "white" }}
                  >
                    Revelado
                  </span>
                ) : (
                  <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                    {remaining} fotos
                  </p>
                )}
                <p
                  className="text-xs font-mono mt-1"
                  style={{ color: "var(--color-border)" }}
                >
                  #{ev.code}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}

function CameraIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  );
}
