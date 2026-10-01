import { setupStep, setupError } from "@/utils/setup-errors";
import { supabase } from "./supabaseClient";
import { toE164 } from "@/utils/phone";
import type { InviteStatus } from "@/store/onboarding-store";

type InviteDraft = {
  inviteNames: string[];
  invitePhones: string[];
  inviteColors: (string | null)[];
  inviteStatuses: InviteStatus[];
};

// Writes the invited people (from create-circle / member-invites) to
// circle_members. The client doesn't keep each row's own id, so this clears
// out the circle's existing non-subscriber rows first and reinserts the
// current set — safe to call again each time the draft changes.
export async function saveInviteMembers(circleId: string, draft: InviteDraft) {
  const { error: deleteError } = await setupStep("Invite deletion", () => supabase
    .from("circle_members")
    .delete()
    .eq("circle_id", circleId)
    .neq("role", "owner"));
  if (deleteError) throw setupError("Invite deletion", deleteError);

  const rows = draft.inviteNames
    .map((name, i) => ({
      name: name.trim(),
      phone: draft.invitePhones[i]?.trim() ?? "",
      color: draft.inviteColors[i] ?? null,
      status: draft.inviteStatuses[i] === "not_sent" ? "pending" : draft.inviteStatuses[i],
    }))
    .filter((invite) => invite.name.length > 0)
    .map((invite) => ({
      circle_id: circleId,
      display_name: invite.name,
      // toE164 only returns a value for a real, complete number; fall back to
      // whatever was typed (e.g. a demo number like "(555) 123-4567") so
      // nothing is silently dropped.
      phone: invite.phone ? (toE164(invite.phone) ?? invite.phone) : null,
      color: invite.color,
      shape: "circle",
      role: "member",
      invite_status: invite.status,
      accepted_at: invite.status === "accepted" ? new Date().toISOString() : null,
    }));

  if (rows.length === 0) return;

  const { error: insertError } = await setupStep("Invite insertion", () => supabase.from("circle_members").insert(rows));
  if (insertError) throw setupError("Invite insertion", insertError);
}
