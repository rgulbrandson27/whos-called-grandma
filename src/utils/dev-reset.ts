import { router } from "expo-router";
import { Alert } from "react-native";
import { useOnboardingStore } from "@/store/onboarding-store";

// DEVELOPMENT ONLY. Wipes every saved onboarding answer (and the saved circle
// id) so the app starts from scratch, without deleting the app from the phone.
// Callers: a long-press on the welcome title and on the paywall heading (the app
// opens on the paywall when answers are saved), both guarded by __DEV__ so it
// never exists in a release build. This does NOT delete
// anything in Supabase.
export function confirmDevReset() {
  Alert.alert(
    "Reset saved data? (dev only)",
    "Clears every answer saved on this phone and starts over. Nothing in Supabase is deleted.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: async () => {
          const store = useOnboardingStore.getState();
          store.resetOnboardingDraft();
          store.setCircleId(null);
          await useOnboardingStore.persist.clearStorage();
          // clearStorage removes the saved copy, but the two calls above just
          // re-wrote it; write the now-empty state once more to be sure it's clean.
          store.resetOnboardingDraft();
          router.replace("/welcome");
          Alert.alert("Done", "Saved data cleared. You're starting fresh.");
        },
      },
    ],
  );
}
