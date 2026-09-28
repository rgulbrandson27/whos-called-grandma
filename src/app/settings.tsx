import { useState } from "react";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { deleteCircle } from "@/data/circles";
import { useOnboardingStore } from "@/store/onboarding-store";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const circleId = useOnboardingStore((state) => state.circleId);
  const [deleting, setDeleting] = useState(false);

  const wipeLocalAndRestart = async () => {
    const store = useOnboardingStore.getState();
    store.resetOnboardingDraft();
    store.setCircleId(null);
    await useOnboardingStore.persist.clearStorage();
    // clearStorage removes the saved copy, but the two calls above just
    // re-wrote it; write the now-empty state once more to be sure it's clean
    // (same pattern as confirmDevReset in utils/dev-reset.ts).
    store.resetOnboardingDraft();
    router.replace("/welcome");
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete your circle?",
      "This permanently deletes your circle, everyone in it, and every check-in. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              if (circleId) await deleteCircle(circleId);
              await wipeLocalAndRestart();
            } catch (e) {
              setDeleting(false);
              Alert.alert(
                "Couldn't delete your circle",
                e instanceof Error ? e.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  return (
    <View
      className="flex-1 bg-country"
      style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom }}
    >
      <View className="flex-row items-center px-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/calendar"))}
          className="items-center justify-center active:opacity-70"
          style={{ width: 44, height: 44 }}
        >
          <Svg width={26} height={26} viewBox="0 0 24 24" accessible={false}>
            <Path
              d="M20 12H4M11 5l-7 7 7 7"
              fill="none"
              stroke="#29486E"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
        <Text className="text-graphite text-xl font-bold ml-2">Settings</Text>
      </View>

      <View className="px-6 mt-6">
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/members")}
          className="w-full items-center rounded-lg py-4 bg-ink active:opacity-80"
        >
          <Text className="text-lg font-semibold text-white">
            View &amp; edit my circle
          </Text>
        </Pressable>
      </View>

      <View className="flex-1 justify-end px-6 pb-10">
        <Text className="text-graphite/60 text-xs mb-3">
          Deleting your circle removes your account's data from our servers —
          everyone in the circle, the shared calendar, and every check-in.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={deleting}
          onPress={handleDelete}
          className="w-full items-center rounded-lg py-4 active:opacity-80"
          style={{ backgroundColor: "#C0392B" }}
        >
          {deleting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-lg font-semibold text-white">
              Delete my circle
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
