import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { View } from "react-native";
import { useOnboardingStore } from "@/store/onboarding-store";

// The onboarding draft is restored from local storage asynchronously, so we
// have to wait for it before deciding where to send the user.
function useDraftHydrated() {
  const [hydrated, setHydrated] = useState(useOnboardingStore.persist.hasHydrated());
  useEffect(() => {
    const unsubscribe = useOnboardingStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useOnboardingStore.persist.hasHydrated());
    return unsubscribe;
  }, []);
  return hydrated;
}

// Temporary entry point while building the onboarding flow.
export default function IndexScreen() {
  const hydrated = useDraftHydrated();
  const circleId = useOnboardingStore((state) => state.circleId);
  const lovedOneName = useOnboardingStore((state) => state.lovedOneName);
  const subscriberName = useOnboardingStore((state) => state.subscriberName);
  const subscriberColor = useOnboardingStore((state) => state.subscriberColor);

  if (!hydrated) return <View className="flex-1 bg-country" />;

  // A plan was already chosen and the circle saved: skip onboarding.
  if (circleId) return <Redirect href="/member-invites" />;
  // Answers are saved but no plan chosen yet: pick up at the paywall.
  if (lovedOneName && subscriberName && subscriberColor) return <Redirect href="/paywall" />;
  return <Redirect href="/welcome" />;
}
