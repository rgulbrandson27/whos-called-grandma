import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

export default function BackOnlyScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-country px-5" style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to calendar"
        className="self-start rounded-lg bg-tile px-5 py-3 active:opacity-75"
        onPress={() => router.canGoBack() ? router.back() : router.replace("/calendar")}>
        <Text className="text-graphite text-base font-semibold">← Back</Text>
      </Pressable>
    </View>
  );
}
