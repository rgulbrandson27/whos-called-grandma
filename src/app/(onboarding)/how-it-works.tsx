import { useEffect, useRef, useState } from "react";
import { useFonts } from "expo-font";
import { router } from "expo-router";
import HomeIcon from "react-native-heroicons/outline/HomeIcon";
import PhoneIcon from "react-native-heroicons/outline/PhoneIcon";
import Svg, { Path } from "react-native-svg";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MemberIdentifier from "@/components/MemberIdentifier";

// Two made-up circle members for the example — nobody's real name/color is
// known yet at this point in onboarding (this page comes before any of that).
const VISITOR = { name: "Jordan", color: "#FF6B6B", caption: "Jordan visits Grandma." };
const CALLER = { name: "Casey", color: "#5B9BD5", caption: "Casey calls Grandma." };
const SAME_DOT_CAPTION = "Both show up the same way on the calendar.";
const CAPTION_HEIGHT = 26;
const TEASER_HEIGHT = 60;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const animate = (value: Animated.Value, toValue: number, duration = 320) =>
  new Promise<void>((resolve) => {
    Animated.timing(value, {
      toValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => resolve());
  });

export default function HowItWorksScreen() {
  const insets = useSafeAreaInsets();
  const [caption, setCaption] = useState(VISITOR.caption);
  const [teaserVisible, setTeaserVisible] = useState(false);
  const visitorScale = useRef(new Animated.Value(0)).current;
  const callerScale = useRef(new Animated.Value(0)).current;
  const captionOpacity = useRef(new Animated.Value(0)).current;
  const teaserOpacity = useRef(new Animated.Value(0)).current;
  // Guards against a replay tap starting a second sequence on top of one
  // that's still running.
  const running = useRef(false);

  const runSequence = async () => {
    if (running.current) return;
    running.current = true;
    visitorScale.setValue(0);
    callerScale.setValue(0);
    captionOpacity.setValue(0);
    teaserOpacity.setValue(0);
    setTeaserVisible(false);

    const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled?.().catch(() => false);
    if (reduceMotion) {
      visitorScale.setValue(1);
      callerScale.setValue(1);
      captionOpacity.setValue(1);
      teaserOpacity.setValue(1);
      setCaption(SAME_DOT_CAPTION);
      setTeaserVisible(true);
      running.current = false;
      return;
    }

    setCaption(VISITOR.caption);
    await animate(captionOpacity, 1);
    await animate(visitorScale, 1, 420);
    await wait(900);
    await animate(captionOpacity, 0, 200);

    setCaption(CALLER.caption);
    await animate(captionOpacity, 1);
    await animate(callerScale, 1, 420);
    await wait(900);
    await animate(captionOpacity, 0, 200);

    setCaption(SAME_DOT_CAPTION);
    await animate(captionOpacity, 1);
    await wait(1400);

    setTeaserVisible(true);
    await animate(teaserOpacity, 1, 400);
    running.current = false;
  };

  useEffect(() => {
    runSequence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        accessibilityLabel="Back to welcome"
        onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/welcome");
        }}
        className="absolute items-center justify-center active:opacity-70"
        style={{ top: insets.top + 8, left: 16, width: 48, height: 48, zIndex: 1 }}
      >
        <Svg width={30} height={30} viewBox="0 0 24 24" accessible={false}>
          <Path d="M20 12H4M11 5l-7 7 7 7" fill="none" stroke="#29486E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>

      <View className="flex-1">
        {(fontsLoaded || fontError) && (
          <Text
            accessibilityRole="header"
            className="text-[#241E38] text-center mt-16"
            style={{
              fontFamily: fontsLoaded ? "CaveatRegular" : undefined,
              fontSize: 44,
              lineHeight: 60,
              paddingVertical: 8,
            }}
          >
            Here's how it works.
          </Text>
        )}

        {/* Screen-reader users get the whole idea in one place, since the
            animation and timed captions aren't accessible on their own. */}
        <Text
          accessible
          accessibilityLabel={`Example: ${VISITOR.caption} ${CALLER.caption} ${SAME_DOT_CAPTION} Premium lets you mark a check-in as a visit or a call.`}
          className="text-graphite/80 text-center text-base mt-2 px-4"
        >
          Every visit or call shows up on a calendar shared by circle members.
        </Text>

        <View className="items-center mt-10" importantForAccessibility="no-hide-descendants">
          <View
            className="items-center justify-center rounded-2xl bg-white/50"
            style={{ width: 140, height: 140, borderWidth: 1.5, borderColor: "rgba(36, 36, 40, 0.2)" }}
          >
            <Text className="text-graphite/60 text-xs font-semibold mb-2">Today</Text>
            <View className="flex-row" style={{ gap: 14 }}>
              <Animated.View style={{ transform: [{ scale: visitorScale }] }}>
                <MemberIdentifier color={VISITOR.color} size={40} />
              </Animated.View>
              <Animated.View style={{ transform: [{ scale: callerScale }] }}>
                <MemberIdentifier color={CALLER.color} size={40} />
              </Animated.View>
            </View>
          </View>

          <Animated.Text
            style={{
              opacity: captionOpacity,
              color: "#242428",
              fontSize: 16,
              fontWeight: "600",
              marginTop: 14,
              height: CAPTION_HEIGHT,
              textAlign: "center",
            }}
          >
            {caption}
          </Animated.Text>

          <Animated.View
            style={{ opacity: teaserOpacity, height: TEASER_HEIGHT, marginTop: 6 }}
            pointerEvents={teaserVisible ? "auto" : "none"}
          >
            <View className="flex-row items-center justify-center" style={{ gap: 6 }}>
              <HomeIcon size={16} color="#29486E" />
              <PhoneIcon size={16} color="#29486E" />
              <Text className="text-ink text-xs font-bold ml-1">Premium</Text>
            </View>
            <Text className="text-graphite/70 text-xs text-center mt-1 px-8">
              Mark check-ins as visits or calls.
            </Text>
          </Animated.View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={runSequence}
          className="self-center mt-2 px-4 py-2 active:opacity-60"
        >
          <Text className="text-graphite text-sm underline">Replay</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/loved-one")}
        className="w-4/5 max-w-xs self-center items-center rounded-lg py-4 mb-12 bg-ink active:opacity-80"
      >
        <Text className="text-xl font-semibold text-white">Continue</Text>
      </Pressable>
    </View>
  );
}
