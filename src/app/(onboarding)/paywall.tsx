import { setupStep, setupError } from "@/utils/setup-errors";
import { useState } from "react";
import { useFonts } from "expo-font";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOnboardingStore } from "@/store/onboarding-store";
import { formatPrice, PlanBilling, PlanId, PlanTier, TIERS } from "@/constants/plans";
import { createCircle, updateCirclePlan } from "@/data/circles";
import { saveInviteMembers } from "@/data/invites";
import { confirmDevReset } from "@/utils/dev-reset";
import { errorMessage } from "@/utils/errors";
import { purchasePlan, restorePurchases } from "@/utils/purchases";
import { registerForPushNotifications } from "@/utils/push-notifications";
import { possessive } from "@/utils/text";


const HIGHLIGHTS = [
  "Shared family calendar for circle members",
  "Notification to members when check-ins have slowed over time",
  "Basic: up to 6 people, simple contact log, 1 month history",
  "Premium: up to 20 people, contact customization, 12 months history",
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
  const [billing, setBilling] = useState<PlanBilling>(draft.pendingSetupPlan?.split("_")[1] as PlanBilling ?? "annual");
  // Only the limit popup's "See plans" action starts on Premium annual.
  // Continuing from the circle page always starts on Basic annual.
  const [tier, setTier] = useState<PlanTier>(draft.pendingSetupPlan?.split("_")[0] as PlanTier ?? (draft.wantsMorePeople ? "premium" : "basic"));
  const [saving, setSaving] = useState(false);
  const [fontsLoaded] = useFonts({
    CaveatRegular: require("../../../assets/fonts/Caveat-Regular.ttf"),
  });

  const handleContinue = async () => {
    if (saving) return;
    const plan: PlanId = `${tier}_${billing}`;
    setSaving(true);
    let step = "Local onboarding state update";
    try {
      await draft.setPendingSetupPlan(plan);
      step = "RevenueCat purchase";
      // Reuse an active purchase before attempting a new charge.
      // Web has no native purchase mechanism.
      const purchase = await purchasePlan(plan);
      if (!purchase.success) {
        // Cancelled from the native purchase sheet — not an error, just
        // back to the paywall with nothing recorded.
        await setupStep("Local onboarding state update", () => draft.setPendingSetupPlan(null));
        return;
      }

      // Coming back from member-invites reuses the already-saved circle.
      let circleId = draft.circleId;
      step = circleId ? "Circle plan update" : "Circle creation";
      if (circleId) {
        await updateCirclePlan(circleId, plan);
      } else {
        const created = await createCircle({
          lovedOneName: draft.lovedOneName,
          lovedOneBirthdayMonth: draft.lovedOneBirthdayMonth,
          lovedOneBirthdayDay: draft.lovedOneBirthdayDay,
          subscriberName: draft.subscriberName,
          subscriberColor: draft.subscriberColor,
          subscriberWeekStart: draft.weekStart,
          plan,
        });
        circleId = created.circleId;
        step = "Local onboarding state update";
        await draft.setCircleId(circleId);
        await draft.setMyMemberId(created.ownerMemberId);
        registerForPushNotifications(created.ownerMemberId);
      }
      // The people added on the create-circle screen — saved here, once the
      // circle itself exists.
      step = "Invite preparation";
      await saveInviteMembers(circleId, draft);
      step = "Routing to /member-invites";
      router.replace("/member-invites");
      await setupStep("Local onboarding state update", () => draft.setPendingSetupPlan(null));
    } catch (e) {
      Alert.alert("Couldn't complete that", setupError(step, e).message);
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

  const handleRestore = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await restorePurchases();
      Alert.alert("Restored", "Your previous purchase has been restored.");
    } catch (e) {
      Alert.alert(
        "Couldn't restore purchases",
        errorMessage(e),
      );
    } finally {
      setSaving(false);
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/create-circle");
        }}
        className="absolute items-center justify-center active:opacity-70"
        style={{ top: insets.top + 8, left: 16, width: 48, height: 48, zIndex: 1 }}
      >
        <Svg width={26} height={26} viewBox="0 0 24 24" accessible={false}>
          <Path d="M20 12H4M11 5l-7 7 7 7" fill="none" stroke="#29486E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-start" }}
        showsVerticalScrollIndicator={false}
      >
        {/* onLongPress: development builds only, wipes saved data for testing. */}
        <Text
          onLongPress={__DEV__ ? confirmDevReset : undefined}
          className="text-[#241E38] text-center px-6 mt-8"
          style={{ fontFamily: fontsLoaded ? "CaveatRegular" : undefined, fontSize: 44, lineHeight: 52 }}
        >
          {"Choose a plan for\n"}
          {lovedOneName ? possessive(lovedOneName) : "your"} circle.
        </Text>
        <View className="px-8 mt-6" style={{ gap: 10 }}>
          {HIGHLIGHTS.map((line) => {
            const tierLabel = line.match(/^(Basic|Premium): /);
            return (
              <View key={line} className="flex-row items-center" style={{ gap: 10 }}>
                <CheckIcon />
                <Text className="text-graphite text-base flex-1">
                  {tierLabel ? (
                    <>
                      <Text className="font-bold">{tierLabel[1]}:</Text>
                      {line.slice(tierLabel[0].length - 1)}
                    </>
                  ) : (
                    line
                  )}
                </Text>
              </View>
            );
          })}
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
        <View className="flex-row justify-center mt-2 mb-1" style={{ gap: 6 }}>
          <Pressable onPress={() => handleLegalPress("Terms of Use", TERMS_URL)}>
            <Text className="text-graphite/60 text-xs underline">Terms of Use</Text>
          </Pressable>
          <Text className="text-graphite/60 text-xs">&amp;</Text>
          <Pressable onPress={() => handleLegalPress("Privacy Policy", PRIVACY_URL)}>
            <Text className="text-graphite/60 text-xs underline">Privacy Policy</Text>
          </Pressable>
        </View>
        <Pressable onPress={handleRestore} className="items-center" style={{ marginTop: 2 }}>
          <Text className="text-graphite/60 text-xs underline">
            Restore purchases
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
