import { useEffect } from "react";
import { router } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOnboardingStore } from "@/store/onboarding-store";

const DISPLAY_MS = 2000;

export default function AddingMembersScreen() {
  const insets = useSafeAreaInsets();
  const inviteNames = useOnboardingStore((state) => state.inviteNames);
  const invitePhones = useOnboardingStore((state) => state.invitePhones);
  const count = inviteNames.filter(
    (name, index) => name.trim().length > 0 || invitePhones[index].trim().length > 0,
  ).length;

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/member-invites");
    }, DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      className="flex-1 bg-country items-center justify-center px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <Text className="text-[#241E38] text-2xl font-semibold text-center mb-10">
        Adding {count} additional {count === 1 ? "contact" : "contacts"}
      </Text>
      <ActivityIndicator
        size="large"
        color="#29486E"
        style={{ transform: [{ scale: 1.8 }] }}
      />
    </View>
  );
}
