import { useState } from "react";
import { useFonts } from "expo-font";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WheelPicker } from "@/components/WheelPicker";
import { useOnboardingStore } from "@/store/onboarding-store";
import { possessive } from "@/utils/text";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// Year is never collected, so February always allows the 29th.
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Room for two lines of the heading (64px line height + 12px padding top and bottom).
const HEADING_HEIGHT = 152;

export default function LovedOneBirthdayScreen() {
  const insets = useSafeAreaInsets();
  const lovedOneName = useOnboardingStore((state) => state.lovedOneName).trim();
  const savedMonth = useOnboardingStore((state) => state.lovedOneBirthdayMonth);
  const savedDay = useOnboardingStore((state) => state.lovedOneBirthdayDay);
  const setLovedOneBirthday = useOnboardingStore((state) => state.setLovedOneBirthday);
  // Start from a previously chosen birthday (e.g. after coming back with the
  // back arrow). Until the user scrolls or taps a wheel, nothing counts as chosen.
  const [monthIndex, setMonthIndex] = useState((savedMonth ?? 1) - 1);
  const [dayIndex, setDayIndex] = useState((savedDay ?? 1) - 1);
  const [picked, setPicked] = useState(savedMonth !== null && savedDay !== null);
  const dayItems = Array.from({ length: DAYS_IN_MONTH[monthIndex] }, (_, i) => String(i + 1));

  const handleMonthChange = (i: number) => {
    setMonthIndex(i);
    setDayIndex((d) => Math.min(d, DAYS_IN_MONTH[i] - 1));
    setPicked(true);
  };
  const handleDayChange = (i: number) => {
    setDayIndex(i);
    setPicked(true);
  };
  const goNext = () => router.push("/subscriber");
  const handleContinue = () => {
    if (!picked) return;
    setLovedOneBirthday(monthIndex + 1, dayIndex + 1);
    goNext();
  };
  const handleSkip = () => {
    setLovedOneBirthday(null, null);
    goNext();
  };
  const [fontsLoaded, fontError] = useFonts({
    CaveatRegular: require("../../../assets/fonts/Caveat-Regular.ttf"),
  });

  return (
    <View
      className="flex-1 bg-country px-6"
      style={{ paddingTop: insets.top + (Platform.OS === "web" ? 28 : 44), paddingBottom: insets.bottom }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to loved one's name"
        onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/loved-one");
        }}
        className="absolute items-center justify-center active:opacity-70"
        style={{ top: insets.top + 8, left: 16, width: 48, height: 48 }}
      >
        <Svg width={30} height={30} viewBox="0 0 24 24" accessible={false}>
          <Path d="M20 12H4M11 5l-7 7 7 7" fill="none" stroke="#241E38" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      <View className="flex-1">
        {/* Same margin and text styling as the heading on the loved one page, so
            the first line sits at exactly the same height. The wrapper has a fixed
            height so a long name's second line doesn't push the wheels down. */}
        <View className="mt-10" style={{ height: HEADING_HEIGHT }}>
          {(fontsLoaded || fontError) && (
            <Text
              accessibilityRole="header"
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              className="text-center"
              style={{
                color: "#241E38",
                fontFamily: fontsLoaded ? "CaveatRegular" : undefined,
                fontSize: 48,
                lineHeight: 64,
                paddingVertical: 12,
              }}
            >
              {lovedOneName ? `When is ${possessive(lovedOneName)} birthday?` : "When is their birthday?"}
            </Text>
          )}
        </View>
        <View className="flex-row justify-center items-center" style={{ gap: 12 }}>
          <WheelPicker
            accessibilityLabel="Birthday month"
            textColor="#29486E"
            items={MONTHS}
            index={monthIndex}
            onChange={handleMonthChange}
            width={200}
            active={picked}
          />
          <WheelPicker
            accessibilityLabel="Birthday day"
            textColor="#29486E"
            items={dayItems}
            index={dayIndex}
            onChange={handleDayChange}
            width={96}
            active={picked}
          />
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={!picked}
        accessibilityState={{ disabled: !picked }}
        onPress={handleContinue}
        className={`w-4/5 max-w-xs self-center items-center rounded-lg py-4 ${picked ? "bg-[#241E38] active:opacity-80" : "bg-tile"}`}
      >
        <Text className={`text-xl font-semibold ${picked ? "text-white" : "text-graphite/50"}`}>Continue</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Skip birthday for now"
        onPress={handleSkip}
        className="self-center mt-4 mb-10 px-4 py-2 active:opacity-60"
      >
        <Text className="text-[#241E38] text-base underline">Skip for Now</Text>
      </Pressable>
    </View>
  );
}
