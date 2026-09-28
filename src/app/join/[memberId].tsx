import { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path } from "react-native-svg";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WeekStartPicker } from "@/components/WeekStartPicker";
import { CIRCLE_COLORS } from "@/constants/circle-colors";
import { ROLES } from "@/constants/relationship-roles";
import { acceptInvite, getInvitePreview } from "@/data/invite";
import { useOnboardingStore, type WeekStart } from "@/store/onboarding-store";
import { possessive } from "@/utils/text";

type Step = "color" | "calendar" | "relationship";

export default function JoinCircleScreen() {
  const insets = useSafeAreaInsets();
  const { memberId } = useLocalSearchParams<{ memberId: string }>();
  const setCircleId = useOnboardingStore((state) => state.setCircleId);

  const [lovedOneName, setLovedOneName] = useState("");
  const [availableColors, setAvailableColors] = useState<
    (typeof CIRCLE_COLORS)[number][] | null
  >(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("color");
  const [color, setColor] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<WeekStart>("sunday");
  const [relationship, setRelationship] = useState<string | null>(null);
  const [otherText, setOtherText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!memberId) return;
    getInvitePreview(memberId)
      .then((preview) => {
        if (preview.alreadyAccepted) {
          setCircleId(preview.circleId);
          router.replace("/calendar");
          return;
        }
        setLovedOneName(preview.lovedOneName);
        const used = new Set(preview.members.map((m) => m.color).filter(Boolean));
        setAvailableColors(CIRCLE_COLORS.filter((c) => !used.has(c.hex)));
      })
      .catch((e) =>
        setLoadError(e instanceof Error ? e.message : "This invite link isn't valid."),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  const [fontsLoaded, fontError] = useFonts({
    CaveatRegular: require("../../../assets/fonts/Caveat-Regular.ttf"),
  });

  const finish = async () => {
    if (!memberId || !color) return;
    const finalRelationship =
      relationship === "Other" ? otherText.trim() || "Other" : relationship;
    if (!finalRelationship) return;
    setSaving(true);
    try {
      const { circleId } = await acceptInvite(memberId, {
        color,
        weekStart,
        relationship: finalRelationship,
      });
      setCircleId(circleId);
      router.replace("/calendar");
    } catch (e) {
      setSaving(false);
      Alert.alert(
        "Couldn't join the circle",
        e instanceof Error ? e.message : "Please try again.",
      );
    }
  };

  if (loadError) {
    return (
      <View
        className="flex-1 bg-country items-center justify-center px-8"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <Text className="text-graphite/70 text-center text-sm">{loadError}</Text>
      </View>
    );
  }

  if (!availableColors) {
    return (
      <View
        className="flex-1 bg-country items-center justify-center"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <ActivityIndicator color="#29486E" />
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-country px-6"
      style={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom }}
    >
      {step !== "color" && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => setStep(step === "relationship" ? "calendar" : "color")}
          className="absolute items-center justify-center active:opacity-70"
          style={{ top: insets.top + 8, left: 16, width: 44, height: 44, zIndex: 1 }}
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
      )}

      {(fontsLoaded || fontError) && (
        <Text
          className="text-[#241E38] text-center mt-6"
          style={{
            fontFamily: fontsLoaded ? "CaveatRegular" : undefined,
            fontSize: 38,
            lineHeight: 48,
          }}
        >
          {step === "color" && `Pick your color in ${possessive(lovedOneName || "the")} circle.`}
          {step === "calendar" && "Pick your calendar view."}
          {step === "relationship" && `Your relationship to ${lovedOneName || "them"}?`}
        </Text>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingVertical: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {step === "color" && (
          <View
            className="flex-row flex-wrap justify-center"
            style={{ gap: 14, maxWidth: 400, alignSelf: "center" }}
          >
            {availableColors.map((c) => {
              const selected = color === c.hex;
              return (
                <Pressable
                  key={c.hex}
                  accessibilityRole="radio"
                  accessibilityLabel={c.name}
                  accessibilityState={{ selected }}
                  onPress={() => setColor(c.hex)}
                  className="items-center active:opacity-80"
                >
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 8,
                      backgroundColor: c.hex,
                      borderWidth: 3,
                      borderColor: selected ? "#241E38" : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selected && (
                      <Svg width={26} height={26} viewBox="0 0 24 24" accessible={false}>
                        <Path
                          d="M5 12l4 4L19 6"
                          fill="none"
                          stroke="#241E38"
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    )}
                  </View>
                  <Text
                    style={{
                      color: "#29486E",
                      fontSize: 12,
                      textAlign: "center",
                      marginTop: 6,
                      fontWeight: selected ? "700" : "500",
                    }}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {step === "calendar" && (
          <View className="items-center">
            <WeekStartPicker value={weekStart} onChange={setWeekStart} />
          </View>
        )}

        {step === "relationship" && (
          <View className="w-full max-w-md self-center" style={{ gap: 10 }}>
            {ROLES.map((option) => {
              const selected = relationship === option;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setRelationship(option)}
                  className={`w-full items-center rounded-lg border py-3 active:opacity-80 ${
                    selected ? "bg-sunshine border-sunshine" : "bg-transparent border-graphite/40"
                  }`}
                >
                  <Text
                    className={`text-base ${selected ? "text-graphite font-semibold" : "text-graphite/80"}`}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
            {relationship === "Other" && (
              <TextInput
                accessibilityLabel="Describe your relationship"
                value={otherText}
                onChangeText={(t) => setOtherText(t.slice(0, 30))}
                placeholder="e.g. Godson, Caregiver..."
                placeholderTextColor="rgba(36, 36, 40, 0.4)"
                className="w-full rounded-lg bg-white px-4 py-3 text-base text-graphite web:outline-none"
              />
            )}
          </View>
        )}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        disabled={
          saving ||
          (step === "color" && !color) ||
          (step === "relationship" &&
            (!relationship || (relationship === "Other" && !otherText.trim())))
        }
        onPress={() => {
          if (step === "color") return setStep("calendar");
          if (step === "calendar") return setStep("relationship");
          finish();
        }}
        className="w-4/5 max-w-xs self-center items-center rounded-lg py-4 mb-8 bg-ink active:opacity-80"
        style={{
          opacity:
            (step === "color" && !color) ||
            (step === "relationship" &&
              (!relationship || (relationship === "Other" && !otherText.trim())))
              ? 0.4
              : 1,
        }}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-xl font-semibold text-white">
            {step === "relationship" ? "Join the circle" : "Continue"}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
