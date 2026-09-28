import { supabase } from "./supabaseClient";
import type { PlanId } from "@/constants/plans";
import type { WeekStart } from "@/store/onboarding-store";

type NewCircle = {
  lovedOneName: string;
  lovedOneBirthdayMonth: number | null;
  lovedOneBirthdayDay: number | null;
  subscriberName: string;
  subscriberColor: string | null;
  subscriberWeekStart: WeekStart;
  plan: PlanId;
};

// Writes the onboarding draft to Supabase: the circle plus the subscriber's own
// member row. There is no login, so subscriber_user_id / user_id stay null —
// the caller keeps the returned id in local storage to find the circle again.
export async function createCircle(draft: NewCircle): Promise<string> {
  const { data: circle, error } = await supabase
    .from("circles")
    .insert({
      loved_one_name: draft.lovedOneName,
      loved_one_birthday_month: draft.lovedOneBirthdayMonth,
      loved_one_birthday_day: draft.lovedOneBirthdayDay,
      plan: draft.plan,
    })
    .select("id")
    .single();
  if (error) throw error;

  const { error: memberError } = await supabase.from("circle_members").insert({
    circle_id: circle.id,
    display_name: draft.subscriberName,
    color: draft.subscriberColor,
    shape: "circle",
    // circle_members_role_check only allows 'owner' | 'member'.
    role: "owner",
    invite_status: "accepted",
    accepted_at: new Date().toISOString(),
    // "sunday" / "monday" — the same words the app uses internally, saved as-is.
    week_start_day: draft.subscriberWeekStart,
  });
  if (memberError) {
    // Don't leave a circle with no subscriber behind (best effort).
    await supabase.from("circles").delete().eq("id", circle.id);
    throw memberError;
  }

  return circle.id;
}

export async function updateCirclePlan(circleId: string, plan: PlanId) {
  const { error } = await supabase.from("circles").update({ plan }).eq("id", circleId);
  if (error) throw error;
}

// Add fields here as screens need them.
export async function getCircleSummary(
  circleId: string,
): Promise<{ plan: PlanId; lovedOneName: string }> {
  const { data, error } = await supabase
    .from("circles")
    .select("plan, loved_one_name")
    .eq("id", circleId)
    .single();
  if (error) throw error;
  return { plan: data.plan as PlanId, lovedOneName: data.loved_one_name };
}

// Deletes the circle and everything under it. There's no ON DELETE CASCADE
// assumed here — children are removed explicitly before the parent row.
// Used by the in-app "Delete my circle" action (App Store 5.1.1(v): apps that
// store personal data need an in-app way to delete it, not just support email).
export async function deleteCircle(circleId: string): Promise<void> {
  const { error: eventsError } = await supabase
    .from("events")
    .delete()
    .eq("circle_id", circleId);
  if (eventsError) throw eventsError;

  const { error: membersError } = await supabase
    .from("circle_members")
    .delete()
    .eq("circle_id", circleId);
  if (membersError) throw membersError;

  const { error: circleError } = await supabase
    .from("circles")
    .delete()
    .eq("id", circleId);
  if (circleError) throw circleError;
}
