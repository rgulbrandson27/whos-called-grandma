import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const INVITE_COUNT = 5;

export type WeekStart = "sunday" | "monday";

export type InviteStatus = "not_sent" | "pending" | "accepted";

// In-memory draft of everything collected during the onboarding wizard.
// Cleared once the final screen writes it to Supabase (see resetOnboardingDraft).
type OnboardingDraft = {
  lovedOneName: string;
  // Month (1-12) and day only — year is deliberately never collected.
  // Both null until the user picks a birthday.
  lovedOneBirthdayMonth: number | null;
  lovedOneBirthdayDay: number | null;
  subscriberName: string;
  subscriberRole: string | null;
  // Hex from CIRCLE_COLORS. Only the subscriber's own pick lives here —
  // once invited members start choosing colors too, "what's still available"
  // has to be read from Supabase (other people's picks aren't known locally).
  subscriberColor: string | null;
  // Which day the subscriber's calendar week starts on. Per person
  // (circle_members.week_start_day) — invited members don't choose their own
  // yet, since there's no onboarding screen for that on their side.
  weekStart: WeekStart;
  // True once the user has tried to add more people than the first plan tier
  // holds (the "room for" popup showed). The paywall then opens on Premium annual
  // (best value); otherwise it opens on Basic annual.
  wantsMorePeople: boolean;
  // Parallel arrays, one slot per invite line on the create-circle screen.
  // Kept here (not component state) so they survive navigating back and forth.
  inviteNames: string[];
  invitePhones: string[];
  // Parallel to the above. No backend invite flow exists yet, so this is
  // driven locally (Send Invite / Cancel Invite / a temporary "simulate
  // acceptance" action) until real accept-invite wiring lands.
  inviteStatuses: InviteStatus[];
  inviteColors: (string | null)[];
};

type OnboardingStore = OnboardingDraft & {
  // Id of the circle saved to Supabase (null until a plan is chosen). Lives
  // outside the draft so resetOnboardingDraft doesn't forget it — with no
  // login, this is how the device finds its circle again.
  circleId: string | null;
  setCircleId: (id: string | null) => void;
  setLovedOneName: (name: string) => void;
  setLovedOneBirthday: (month: number | null, day: number | null) => void;
  setSubscriberName: (name: string) => void;
  setSubscriberRole: (role: string | null) => void;
  setSubscriberColor: (hex: string | null) => void;
  setWeekStart: (weekStart: WeekStart) => void;
  setWantsMorePeople: (wantsMorePeople: boolean) => void;
  setInviteNames: (names: string[]) => void;
  setInvitePhones: (phones: string[]) => void;
  setInviteStatuses: (statuses: InviteStatus[]) => void;
  setInviteColors: (colors: (string | null)[]) => void;
  resetInvites: () => void;
  resetOnboardingDraft: () => void;
};

const initialDraft: OnboardingDraft = {
  lovedOneName: "",
  lovedOneBirthdayMonth: null,
  lovedOneBirthdayDay: null,
  subscriberName: "",
  subscriberRole: null,
  subscriberColor: null,
  weekStart: "sunday",
  wantsMorePeople: false,
  inviteNames: Array(INVITE_COUNT).fill(""),
  invitePhones: Array(INVITE_COUNT).fill(""),
  inviteStatuses: Array(INVITE_COUNT).fill("not_sent"),
  inviteColors: Array(INVITE_COUNT).fill(null),
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
  ...initialDraft,
  circleId: null,
  setCircleId: (circleId) => set({ circleId }),
  setLovedOneName: (lovedOneName) => set({ lovedOneName }),
  setLovedOneBirthday: (lovedOneBirthdayMonth, lovedOneBirthdayDay) =>
    set({ lovedOneBirthdayMonth, lovedOneBirthdayDay }),
  setSubscriberName: (subscriberName) => set({ subscriberName }),
  setSubscriberRole: (subscriberRole) => set({ subscriberRole }),
  setSubscriberColor: (subscriberColor) => set({ subscriberColor }),
  setWeekStart: (weekStart) => set({ weekStart }),
  setWantsMorePeople: (wantsMorePeople) => set({ wantsMorePeople }),
  setInviteNames: (inviteNames) => set({ inviteNames }),
  setInvitePhones: (invitePhones) => set({ invitePhones }),
  setInviteStatuses: (inviteStatuses) => set({ inviteStatuses }),
  setInviteColors: (inviteColors) => set({ inviteColors }),
  resetInvites: () =>
    set({
      inviteNames: Array(INVITE_COUNT).fill(""),
      invitePhones: Array(INVITE_COUNT).fill(""),
      inviteStatuses: Array(INVITE_COUNT).fill("not_sent"),
      inviteColors: Array(INVITE_COUNT).fill(null),
    }),
  resetOnboardingDraft: () => set(initialDraft),
    }),
    {
      // The whole account lives on the device until a plan is chosen.
      name: "onboarding-draft",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
