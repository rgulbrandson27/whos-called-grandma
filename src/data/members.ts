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
    color: row.color,
    shape: row.shape,
    role: row.role,
    inviteStatus: row.invite_status,
    invitedAt: row.invited_at,
    acceptedAt: row.accepted_at,
  }));
}

// Adds one person to an already-saved circle (the members.tsx "Add person"
// action — separate from saveInviteMembers, which is onboarding-only bulk sync).
export async function addMember(
  circleId: string,
  name: string,
  phone: string,
  color: string,
): Promise<void> {
  const { error } = await supabase.from("circle_members").insert({
    circle_id: circleId,
    display_name: name,
    phone: phone || null,
    color,
    shape: "circle",
    role: "member",
    invite_status: "pending",
  });
  if (error) throw error;
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase.from("circle_members").delete().eq("id", memberId);
  if (error) throw error;
}

// TEMP stand-in until there's a real invite/accept flow (needs actually
// sending a text and a screen for the invitee to open on their own phone).
// Marks a pending member accepted, keeping the color already reserved for
// them at add-time — the invitee doesn't get to pick their own color/calendar
// yet, since there's no real per-invitee flow to do that in.
export async function acceptMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from("circle_members")
    .update({ invite_status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", memberId);
  if (error) throw error;
}
