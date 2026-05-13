import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { isRevealed } from "@/lib/utils";
import EventScreen from "./event-screen";
import Gallery from "./gallery";
import JoinScreen from "./join-screen";
import type { Event, Photo, Profile, PhotoWithProfile } from "@/types/database";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function EventPage({ params }: Props) {
  const { code } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: eventRaw } = await supabase
    .from("events")
    .select("*")
    .eq("code", code.toUpperCase())
    .single();

  if (!eventRaw) notFound();
  const event = eventRaw as Event;

  const { data: membership } = await supabase
    .from("event_members")
    .select("id, photos_taken")
    .eq("event_id", event.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return <JoinScreen event={event} />;
  }

  if (!isRevealed(event.reveal_date)) {
    return (
      <EventScreen
        event={event}
        userId={user.id}
        photosTaken={membership.photos_taken}
      />
    );
  }

  // Gallery — fetch photos + profiles
  const { data: photosRaw } = await supabase
    .from("photos")
    .select("*")
    .eq("event_id", event.id)
    .order("taken_at", { ascending: true });

  const photos = (photosRaw ?? []) as Photo[];
  const userIds = [...new Set(photos.map((p) => p.user_id))];

  const profiles: Profile[] = [];
  if (userIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);
    if (data) profiles.push(...(data as Profile[]));
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const photosWithProfiles: PhotoWithProfile[] = photos.map((p) => ({
    ...p,
    profile: profileMap.get(p.user_id) ?? null,
  }));

  return <Gallery event={event} photos={photosWithProfiles} />;
}
