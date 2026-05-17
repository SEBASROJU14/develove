export type Event = {
  id: string;
  name: string;
  code: string;
  owner_id: string;
  event_date: string;
  reveal_date: string;
  max_photos_per_person: number;
  max_guests?: number | null;
  created_at: string;
  cover_image_url?: string;
};

export type EventMember = {
  id: string;
  event_id: string;
  user_id: string;
  photos_taken: number;
  joined_at: string;
};

export type Photo = {
  id: string;
  event_id: string;
  user_id: string;
  storage_url: string;
  is_revealed: boolean;
  taken_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export type PhotoWithProfile = Photo & {
  profile: Pick<Profile, "full_name"> | null;
};

export type MembershipWithEvent = EventMember & {
  events: Event;
};
