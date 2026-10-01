import { supabase } from "./supabaseClient";
import { getMembers } from "./members";
import { CIRCLE_COLORS } from "@/constants/circle-colors";
import { useOnboardingStore, type WeekStart } from "@/store/onboarding-store";

// Deliberately takes no selected member ID: preferences belong only to this
// device's established member, never the tab currently being viewed.
export async function getMyPreferences() {
  const { circleId, myMemberId } = useOnboardingStore.getState();
  if (!circleId || !myMemberId) throw new Error("This device's circle membership could not be identified.");
  const members = await getMembers(circleId);
  const member = members.find((row) => row.id === myMemberId && row.circleId === circleId && row.inviteStatus === "accepted");
  if (!member) throw new Error("Your accepted membership could not be found in this circle.");
  const used = new Set(members.filter((row) => row.id !== myMemberId).map((row) => row.color).filter(Boolean));
  return { circleId, member, colors: CIRCLE_COLORS.filter((color) => !used.has(color.hex) || color.hex === member.color) };
}

export async function saveMyPreferences(color: string, weekStart: WeekStart, expected: { circleId: string; memberId: string }) {
  const identity = useOnboardingStore.getState();
  if (identity.circleId !== expected.circleId || identity.myMemberId !== expected.memberId) throw new Error("Your circle changed. Please reopen your preferences.");
  const { circleId, member, colors } = await getMyPreferences();
  if (!colors.some((candidate) => candidate.hex === color)) throw new Error("That color is no longer available. Please choose another.");
  if (weekStart !== "sunday" && weekStart !== "monday") throw new Error("Please choose Sunday or Monday.");
  const current = useOnboardingStore.getState();
  if (current.circleId !== circleId || current.myMemberId !== member.id) throw new Error("Your circle changed. Please reopen your preferences.");
  const { error } = await supabase.from("circle_members")
    .update({ color, week_start_day: weekStart })
    .eq("id", member.id)
    .eq("circle_id", circleId)
    .eq("invite_status", "accepted")
    .select("id")
    .single();
  if (error) throw error;
}
