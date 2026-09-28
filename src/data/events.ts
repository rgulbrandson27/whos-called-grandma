import { supabase } from "./supabaseClient";
import type { CalendarEvent, EventStatus } from "./fakeData";

export async function getEvents(circleId: string): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("circle_id", circleId);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    circleId: row.circle_id,
    memberId: row.circle_member_id,
    date: row.event_date,
    status: row.status,
    kind: row.kind,
    notePreset: row.note_preset,
    noteCustom: row.note_custom,
  }));
}

// Logs one check-in (or schedules a future one — the caller decides "done"
// vs "planned" based on whether the picked date is today/past or future).
// kind/noteCustom are Premium-only from the UI side, but nothing here
// enforces that — callers just pass null for Basic.
export async function logCheckIn(params: {
  circleId: string;
  memberId: string;
  date: string; // 'YYYY-MM-DD'
  status: EventStatus;
  kind: string | null;
  noteCustom: string | null;
}): Promise<void> {
  const { error } = await supabase.from("events").insert({
    circle_id: params.circleId,
    circle_member_id: params.memberId,
    event_date: params.date,
    status: params.status,
    kind: params.kind,
    note_custom: params.noteCustom,
  });
  if (error) throw error;
}
