import { supabase } from "./supabaseClient";
import type { WeekStart } from "@/store/onboarding-store";

export type InvitePreviewMember = {
  id: string;
  name: string;
  color: string | null;
  role: string;
  inviteStatus: string;
};

export type InvitePreview = {
  circleId: string;
  lovedOneName: string;
  ownerName: string;
  // Everyone already in the circle, owner included — the invitee isn't in
  // this list, it's who they'd be joining.
  members: InvitePreviewMember[];
  // Already accepted before this page was even opened (e.g. they tapped the
  // link twice) — the caller should skip straight past onboarding.
  alreadyAccepted: boolean;
};

export async function getInvitePreview(memberId: string): Promise<InvitePreview> {
  const { data: member, error: memberError } = await supabase
    .from("circle_members")
    .select("id, circle_id, invite_status")
    .eq("id", memberId)
    .single();
  if (memberError) throw memberError;

  const { data: circle, error: circleError } = await supabase
    .from("circles")
    .select("loved_one_name")
    .eq("id", member.circle_id)
    .single();
  if (circleError) throw circleError;

  const { data: others, error: othersError } = await supabase
    .from("circle_members")
    .select("id, display_name, color, role, invite_status")
    .eq("circle_id", member.circle_id)
    .neq("id", memberId);
  if (othersError) throw othersError;

  const owner = others.find((m) => m.role === "owner");

  return {
    circleId: member.circle_id,
    lovedOneName: circle.loved_one_name,
    ownerName: owner?.display_name ?? "",
    members: others.map((m) => ({
      id: m.id,
      name: m.display_name,
      color: m.color,
      role: m.role,
      inviteStatus: m.invite_status,
    })),
    alreadyAccepted: member.invite_status === "accepted",
  };
}

// The invitee's own mini onboarding ends here: their picked color, calendar
// week-start, and relationship to the loved one all get recorded at once,
// same moment their invite flips to accepted.
export async function acceptInvite(
  memberId: string,
  choice: { color: string; weekStart: WeekStart; relationship: string },
): Promise<{ circleId: string }> {
  const { data, error } = await supabase
    .from("circle_members")
    .update({
      color: choice.color,
      week_start_day: choice.weekStart,
      relationship: choice.relationship,
      invite_status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", memberId)
    .select("circle_id")
    .single();
  if (error) throw error;
  return { circleId: data.circle_id };
}
