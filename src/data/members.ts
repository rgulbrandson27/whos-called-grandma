import { supabase } from "./supabaseClient";
import type { Member } from "./fakeData";

export async function getMembers(circleId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from("circle_members")
    .select("*")
    .eq("circle_id", circleId);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    circleId: row.circle_id,
    userId: row.user_id,
    name: row.display_name,
    phone: row.phone,
    email: row.email,
    color: row.color,
    shape: row.shape,
    role: row.role,
    inviteStatus: row.invite_status,
    invitedAt: row.invited_at,
    acceptedAt: row.accepted_at,
  }));
}
