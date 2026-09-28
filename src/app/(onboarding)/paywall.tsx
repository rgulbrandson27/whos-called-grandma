import { useState } from "react";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOnboardingStore } from "@/store/onboarding-store";
import { formatPrice, PlanBilling, PlanId, PlanTier, TIERS } from "@/constants/plans";
import { createCircle, updateCirclePlan } from "@/data/circles";
import { saveInviteMembers } from "@/data/invites";
import { confirmDevReset } from "@/utils/dev-reset";
import { possessive } from "@/utils/text";


const HIGHLIGHTS = [
  "Shared family calendar for everyone in your circle",
  "Basic: up to 6 people, a simple check-in log",
  "Premium: up to 20 people, label how you connected and add a short note",
];

const TERMS_URL =
  "https://sites.google.com/view/rainzbuilds/whos-called-grandma/terms-and-conditions";
const PRIVACY_URL =
  "https://sites.google.com/view/rainzbuilds/whos-called-grandma/privacy-policy";

function CheckIcon({ size = 18, color = "#29486E" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path d="M5 13l4 4L19 7" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
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

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const draft = useOnboardingStore();
  const lovedOneName = draft.lovedOneName.trim();
  const [billing, setBilling] = useState<PlanBilling>("annual");
  // Only the limit popup's "See plans" action starts on Premium annual.
  // Continuing from the circle page always starts on Basic annual.
  const [tier, setTier] = useState<PlanTier>(draft.wantsMorePeople ? "premium" : "basic");
  const [saving, setSaving] = useState(false);

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

  const handleLegalPress = async (doc: string, url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Couldn't open link", `Please try again to view the ${doc}.`);
    }
  };

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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        showsVerticalScrollIndicator={false}
      >
        {/* onLongPress: development builds only, wipes saved data for testing. */}
        <Text
          onLongPress={__DEV__ ? confirmDevReset : undefined}
          className="text-[#241E38] text-3xl font-bold text-center px-6 mt-4"
        >
          {"Choose a plan for\n"}
          {lovedOneName ? possessive(lovedOneName) : "your"} circle.
        </Text>
        <View className="px-8 mt-6" style={{ gap: 10 }}>
          {HIGHLIGHTS.map((line) => (
            <View key={line} className="flex-row items-center" style={{ gap: 10 }}>
              <CheckIcon />
              <Text className="text-graphite text-base flex-1">{line}</Text>
            </View>
          ))}
        </View>

        <View className="px-4 mt-8">
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
        </View>
      </ScrollView>
      <View className="px-4 pt-3">
        <Text className="text-graphite/60 text-[11px] text-center px-4 mb-2">
          {TIERS[tier].label} ({billing === "annual" ? "yearly" : "monthly"})
          renews automatically at {formatPrice(billing === "annual" ? TIERS[tier].annual : TIERS[tier].monthly)}
          /{billing === "annual" ? "yr" : "mo"} until canceled. Manage or cancel anytime in your
          Apple ID account settings.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={handleContinue}
          className="w-full items-center rounded-lg py-4 bg-ink active:opacity-80"
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-xl font-semibold text-white">Select plan</Text>
          )}
        </Pressable>
        <View className="flex-row justify-center mt-3 mb-1" style={{ gap: 6 }}>
          <Pressable onPress={() => handleLegalPress("Terms of Use", TERMS_URL)}>
            <Text className="text-graphite/60 text-xs underline">Terms of Use</Text>
          </Pressable>
          <Text className="text-graphite/60 text-xs">&amp;</Text>
          <Pressable onPress={() => handleLegalPress("Privacy Policy", PRIVACY_URL)}>
            <Text className="text-graphite/60 text-xs underline">Privacy Policy</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
