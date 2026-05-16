import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isRevealed } from "@/lib/utils";
import type { Event, MembershipWithEvent } from "@/types/database";
import DashboardShell from "./dashboard-shell";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const firstName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ?? "dev";

  const { data: raw } = await supabase
    .from("event_members")
    .select("id, event_id, photos_taken, joined_at, events(*)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  const memberships = (raw ?? []) as unknown as MembershipWithEvent[];

  const active = memberships.filter(
    (m) => !isRevealed((m.events as unknown as Event).reveal_date)
  );
  const revealed = memberships.filter((m) =>
    isRevealed((m.events as unknown as Event).reveal_date)
  );

  const revealedIds = revealed.map((m) => (m.events as unknown as Event).id);
  const thumbsByEvent: Record<string, string[]> = {};

  if (revealedIds.length > 0) {
    const { data: thumbs } = await supabase
      .from("photos")
      .select("event_id, storage_url")
      .in("event_id", revealedIds)
      .order("taken_at", { ascending: true })
      .limit(revealedIds.length * 6);

    for (const t of thumbs ?? []) {
      if (!thumbsByEvent[t.event_id]) thumbsByEvent[t.event_id] = [];
      if (thumbsByEvent[t.event_id].length < 4)
        thumbsByEvent[t.event_id].push(t.storage_url);
    }
  }

  return (
    <DashboardShell
      firstName={firstName}
      active={active}
      revealed={revealed}
      thumbsByEvent={thumbsByEvent}
    />
  );
}
