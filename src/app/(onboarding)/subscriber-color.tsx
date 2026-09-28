import { useState } from "react";
import { useFonts } from "expo-font";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CIRCLE_COLORS } from "@/constants/circle-colors";
// Uncomment this import to restore the flower picker below.
// import { ColorFlower } from "@/components/ColorFlower";
import { WeekStartPicker } from "@/components/WeekStartPicker";
import { useOnboardingStore } from "@/store/onboarding-store";

export default function SubscriberColorScreen() {
  const insets = useSafeAreaInsets();
  const [gridWidth, setGridWidth] = useState(0);
  const swatchSize = Math.max(0, Math.min(72, (gridWidth - 24) / 4));
  const subscriberColor = useOnboardingStore((state) => state.subscriberColor);
  const setSubscriberColor = useOnboardingStore(
    (state) => state.setSubscriberColor,
  );
  const weekStart = useOnboardingStore((state) => state.weekStart);
  const setWeekStart = useOnboardingStore((state) => state.setWeekStart);
  const canContinue = subscriberColor !== null;
  const handleContinue = () => {
    if (!canContinue) return;
    router.push("/create-circle");
  };
  const [fontsLoaded, fontError] = useFonts({
    CaveatRegular: require("../../../assets/fonts/Caveat-Regular.ttf"),
  });

  return (
    <View
      className="flex-1 bg-country px-6"
      style={{
        paddingTop: insets.top + (Platform.OS === "web" ? 28 : 44),
        paddingBottom: insets.bottom,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to your relationship"
        onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/subscriber-roles");
        }}
        className="absolute items-center justify-center active:opacity-70"
        style={{ top: insets.top + 8, left: 16, width: 48, height: 48 }}
      >
        <Svg width={30} height={30} viewBox="0 0 24 24" accessible={false}>
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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
      {(fontsLoaded || fontError) && (
        <Text
          accessibilityRole="header"
          className="text-center mt-6"
          style={{
            color: "#241E38",
            fontFamily: fontsLoaded ? "CaveatRegular" : undefined,
            fontSize: 44,
            lineHeight: 60,
            paddingVertical: 8,
          }}
        >
          Choose your profile color and calendar view.
        </Text>
      )}
      {/* Saved flower alternative: replace the square grid below with this
          and uncomment the ColorFlower import above.
      <View style={{ flexGrow: 1, alignItems: "center", justifyContent: "center", paddingVertical: 24 }}>
        <ColorFlower
          value={subscriberColor}
          onChange={setSubscriberColor}
          size={300}
        />
      </View>
      */}
      <View
        onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
        style={{ flexGrow: 1, justifyContent: "flex-start", paddingVertical: 24, gap: 20 }}
      >
        {[CIRCLE_COLORS.slice(0, 4), CIRCLE_COLORS.slice(4, 8)].map((row, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: "row", gap: 8, width: "100%", maxWidth: 400, alignSelf: "center" }}>
            {row.map((color) => {
              const selected = subscriberColor === color.hex;
              return (
                <Pressable
                  key={color.hex}
                  accessibilityRole="radio"
                  accessibilityLabel={color.name}
                  accessibilityState={{ selected }}
                  onPress={() => setSubscriberColor(color.hex)}
                  className="items-center active:opacity-80"
                  style={{ flex: 1 }}
                >
                  <View
                    style={{
                      width: swatchSize,
                      height: swatchSize,
                      flexShrink: 0,
                      borderRadius: 8,
                      backgroundColor: color.hex,
                      borderWidth: 3,
                      borderColor: selected ? "#241E38" : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selected && (
                      <Svg width={28} height={28} viewBox="0 0 24 24" accessible={false}>
                        <Path d="M5 12l4 4L19 6" fill="none" stroke="#241E38" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    )}
                  </View>
                  <Text style={{ color: "#29486E", fontSize: 13, textAlign: "center", marginTop: 8, fontWeight: selected ? "700" : "500" }}>
                    {color.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <WeekStartPicker value={weekStart} onChange={setWeekStart} />
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        disabled={!canContinue}
        accessibilityState={{ disabled: !canContinue }}
        onPress={handleContinue}
        className={`w-4/5 max-w-xs self-center items-center rounded-lg py-4 mb-6 ${canContinue ? "bg-ink active:opacity-80" : "bg-tile"}`}
      >
        <Text
          className={`text-xl font-semibold ${canContinue ? "text-white" : "text-graphite/50"}`}
        >
          Continue
        </Text>
      </Pressable>
    </View>
  );
}
