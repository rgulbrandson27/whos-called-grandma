import { useState } from "react";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { ActivityIndicator, Alert, LayoutChangeEvent, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOnboardingStore } from "@/store/onboarding-store";
import { COMPARISON_ROWS, formatPrice, PlanBilling, PlanId, PlanTier, TIERS } from "@/constants/plans";
import { createCircle, updateCirclePlan } from "@/data/circles";
import { saveInviteMembers } from "@/data/invites";
import { confirmDevReset } from "@/utils/dev-reset";
import { possessive } from "@/utils/text";


const HIGHLIGHTS = [
  "Room for up to 20 people",
  "Photos on check-ins",
  "Notifications your way",
];

function CheckIcon({ size = 18, color = "#29486E" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path d="M5 13l4 4L19 7" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CrossIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path d="M6 6l12 12M18 6L6 18" fill="none" stroke="rgba(36, 36, 40, 0.35)" strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

function Radio({ selected }: { selected: boolean }) {
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{
        width: 24,
        height: 24,
        backgroundColor: selected ? "#29486E" : "transparent",
        borderWidth: selected ? 0 : 2,
        borderColor: "rgba(36, 36, 40, 0.35)",
      }}
    >
      {selected && <CheckIcon size={13} color="#FFFFFF" />}
    </View>
  );
}

function PlanOption({
  tier,
  billing,
  selected,
  onSelect,
}: {
  tier: PlanTier;
  billing: PlanBilling;
  selected: boolean;
  onSelect: () => void;
}) {
  const info = TIERS[tier];
  const annual = billing === "annual";
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${info.label} ${annual ? "annual" : "monthly"}, ${formatPrice(annual ? info.annual : info.monthly)}`}
      onPress={onSelect}
      className="rounded-xl bg-white px-3 py-3 active:opacity-80"
      style={{
        borderWidth: 2,
        borderColor: selected ? "#29486E" : "rgba(36, 36, 40, 0.2)",
      }}
    >
      {annual && tier === "premium" && (
        <View
          className="absolute self-center rounded-full bg-tile px-2 py-0.5"
          style={{ top: -11 }}
        >
          <Text className="text-graphite text-[10px] font-bold">Best value</Text>
        </View>
      )}
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          {annual ? (
            <>
              <View className="self-start rounded-md bg-sunshine px-1.5 py-0.5">
                <Text className="text-graphite text-[10px] font-bold">{info.annualDiscount}</Text>
              </View>
              <Text className="text-graphite text-lg font-bold mt-1">
                {formatPrice(info.annual)}
                <Text className="text-graphite/60 text-xs font-normal">/yr</Text>
              </Text>
              <Text className="text-graphite/60 text-[11px]">{formatPrice(info.annual / 12)}/mo</Text>
            </>
          ) : (
            <>
              <Text className="text-graphite/70 text-sm">Monthly</Text>
              <Text className="text-graphite text-lg font-bold">{formatPrice(info.monthly)}</Text>
            </>
          )}
        </View>
        <Radio selected={selected} />
      </View>
    </Pressable>
  );
}

function ComparisonCell({ value, premium }: { value: string | boolean; premium?: boolean }) {
  if (typeof value === "string") {
    return <Text className="text-graphite text-xs font-semibold text-center">{value}</Text>;
  }
  return value ? <CheckIcon size={16} color={premium ? "#29486E" : "#242428"} /> : <CrossIcon />;
}

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const draft = useOnboardingStore();
  const lovedOneName = draft.lovedOneName.trim();
  const [billing, setBilling] = useState<PlanBilling>("annual");
  // Only the limit popup's "See plans" action starts on Premium annual.
  // Continuing from the circle page always starts on Basic annual.
  const [tier, setTier] = useState<PlanTier>(draft.wantsMorePeople ? "premium" : "basic");
  const [saving, setSaving] = useState(false);
  // Measured so the plan picker can sit at the bottom of the first screen and
  // then pin to the top while the comparison table scrolls underneath it.
  const [viewportHeight, setViewportHeight] = useState(0);
  const [pickerHeight, setPickerHeight] = useState(0);
  const firstScreenSpace = Math.max(0, viewportHeight - pickerHeight);

  const handleContinue = async () => {
    if (saving) return;
    const plan: PlanId = `${tier}_${billing}`;
    setSaving(true);
    try {
      // No purchase flow wired up yet (RevenueCat) — this just records the
      // chosen plan. Coming back from member-invites reuses the saved circle.
      let circleId = draft.circleId;
      if (circleId) {
        await updateCirclePlan(circleId, plan);
      } else {
        circleId = await createCircle({
          lovedOneName: draft.lovedOneName,
          lovedOneBirthdayMonth: draft.lovedOneBirthdayMonth,
          lovedOneBirthdayDay: draft.lovedOneBirthdayDay,
          subscriberName: draft.subscriberName,
          subscriberColor: draft.subscriberColor,
          subscriberWeekStart: draft.weekStart,
          plan,
        });
        draft.setCircleId(circleId);
      }
      // The people added on the create-circle screen — saved here, once the
      // circle itself exists.
      await saveInviteMembers(circleId, draft);
      router.replace("/member-invites");
    } catch (e) {
      Alert.alert("Couldn't save your circle", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLegalPress = (doc: string) => {
    Alert.alert("Coming soon", `${doc} isn't written yet.`);
  };

  const handleLayoutViewport = (e: LayoutChangeEvent) => setViewportHeight(e.nativeEvent.layout.height);
  const handleLayoutPicker = (e: LayoutChangeEvent) => setPickerHeight(e.nativeEvent.layout.height);

  return (
    <View
      className="flex-1 bg-country"
      style={{
        paddingTop: insets.top + (Platform.OS === "web" ? 20 : 12),
        paddingBottom: insets.bottom,
      }}
    >
      <View className="flex-row items-center px-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/create-circle");
          }}
          className="items-center justify-center active:opacity-70"
          style={{ width: 44, height: 44 }}
        >
          <Svg width={26} height={26} viewBox="0 0 24 24" accessible={false}>
            <Path d="M20 12H4M11 5l-7 7 7 7" fill="none" stroke="#29486E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
      </View>
      {/* Child 0: heading + highlights, sized so child 1 (the plan picker) lands
          at the bottom of the first screen. Child 1 is sticky: it pins to the top
          once you scroll past it, so the four plans are always in view. Child 2
          (the comparison table) scrolls underneath. */}
      <ScrollView
        style={{ flex: 1 }}
        onLayout={handleLayoutViewport}
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ minHeight: firstScreenSpace }}>
          {/* onLongPress: development builds only, wipes saved data for testing. */}
          <Text
            onLongPress={__DEV__ ? confirmDevReset : undefined}
            className="text-[#241E38] text-2xl font-bold text-center px-6 mt-4"
          >
            Choose a plan for {lovedOneName ? possessive(lovedOneName) : "your"} circle.
          </Text>
          <View className="px-8 mt-6" style={{ gap: 10 }}>
            {HIGHLIGHTS.map((line) => (
              <View key={line} className="flex-row items-center" style={{ gap: 10 }}>
                <CheckIcon />
                <Text className="text-graphite text-base flex-1">{line}</Text>
              </View>
            ))}
          </View>
          <Text className="text-graphite/60 text-xs text-center px-8 mt-6">
            Your answers are saved. Take your time.
          </Text>
        </View>

        <View
          onLayout={handleLayoutPicker}
          className="bg-country px-4 pt-4 pb-3"
          style={{ boxShadow: "0px 4px 8px rgba(36, 36, 40, 0.08)" }}
        >
          <View className="flex-row" style={{ gap: 12 }}>
            {(Object.keys(TIERS) as PlanTier[]).map((id) => (
              <View
                key={id}
                className={`flex-1 rounded-2xl px-2 pt-3 pb-3 ${id === "premium" ? "bg-tile/60" : "bg-white/50"}`}
                style={{ gap: 12 }}
              >
                <Text className="text-graphite text-base font-bold text-center">{TIERS[id].label}</Text>
                {(["monthly", "annual"] as PlanBilling[]).map((option) => (
                  <PlanOption
                    key={option}
                    tier={id}
                    billing={option}
                    selected={tier === id && billing === option}
                    onSelect={() => {
                      setTier(id);
                      setBilling(option);
                    }}
                  />
                ))}
              </View>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={handleContinue}
            className="w-full items-center rounded-lg py-4 mt-4 bg-ink active:opacity-80"
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-xl font-semibold text-white">Select plan</Text>
            )}
          </Pressable>
          <View className="flex-row justify-center mt-3" style={{ gap: 6 }}>
            <Pressable onPress={() => handleLegalPress("Terms of Use")}>
              <Text className="text-graphite/60 text-xs underline">Terms of Use</Text>
            </Pressable>
            <Text className="text-graphite/60 text-xs">&amp;</Text>
            <Pressable onPress={() => handleLegalPress("Privacy Policy")}>
              <Text className="text-graphite/60 text-xs underline">Privacy Policy</Text>
            </Pressable>
          </View>
        </View>

        {/* At least as tall as the space above the picker, so there's always
            enough to scroll for the picker to reach the top. */}
        <View className="px-4 pt-6" style={{ minHeight: firstScreenSpace, paddingBottom: 24 }}>
          <Text className="text-graphite/70 text-center text-sm font-semibold mb-3">Compare plans</Text>
          <View className="rounded-2xl bg-white/70 overflow-hidden">
            <View className="flex-row items-center px-4 py-3 border-b border-graphite/10">
              <View className="flex-1" />
              <Text className="text-graphite text-xs font-bold text-center" style={{ width: 72 }}>Basic</Text>
              <Text className="text-graphite text-xs font-bold text-center" style={{ width: 72 }}>Premium</Text>
            </View>
            {COMPARISON_ROWS.map((row, i) => (
              <View
                key={row.label}
                className={`flex-row items-center px-4 py-3 ${i < COMPARISON_ROWS.length - 1 ? "border-b border-graphite/10" : ""}`}
              >
                <Text className="text-graphite text-sm flex-1 pr-2">{row.label}</Text>
                <View className="items-center" style={{ width: 72 }}>
                  <ComparisonCell value={row.basic} />
                </View>
                <View className="items-center" style={{ width: 72 }}>
                  <ComparisonCell value={row.premium} premium />
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
