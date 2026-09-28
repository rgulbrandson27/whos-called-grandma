import { supabase } from "./supabaseClient";
import type { CalendarEvent } from "./fakeData";

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
