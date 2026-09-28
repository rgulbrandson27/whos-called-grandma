import { useState } from "react";
import { useFonts } from "expo-font";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOnboardingStore } from "@/store/onboarding-store";

const ROLE_GROUPS = [
  { options: ["Son", "Daughter", "Child"], color: "#FFF1C7", selectedColor: "#F2DEA0" },
  { options: ["Grandson", "Granddaughter", "Grandchild"], color: "#DDEEDB", selectedColor: "#BEDCB9" },
  { options: ["Spouse", "Partner"], color: "#F5DFE8", selectedColor: "#E8BDCF" },
  { options: ["Brother", "Sister", "Sibling"], color: "#DDEAF7", selectedColor: "#BCD3EB" },
  { options: ["Niece", "Nephew", "Nibling"], color: "#F5E2D2", selectedColor: "#E8C5A9" },
  { options: ["Friend", "Neighbor"], color: "#DCEFEB", selectedColor: "#B9DDD4" },
  { options: ["Service Provider", "Other"], color: "#E5DFF2", selectedColor: "#CEC2E5" },
];
const ROLES = ROLE_GROUPS.flatMap((group) => group.options);

export default function SubscriberRolesScreen() {
  const insets = useSafeAreaInsets();
  const lovedOne = useOnboardingStore((state) => state.lovedOneName);
  const setSubscriberRole = useOnboardingStore(
    (state) => state.setSubscriberRole,
  );
  const lovedOneName = lovedOne.trim() || "your loved one";
  // Start from a previously chosen relationship (e.g. after coming back with
  // the back arrow). A saved value that isn't in the list was typed under "Other".
  const savedRole = useOnboardingStore((state) => state.subscriberRole);
  const savedIsCustom = savedRole !== null && !ROLES.includes(savedRole);
  const [role, setRole] = useState<string | null>(
    savedIsCustom ? "Other" : savedRole,
  );
  const [otherText, setOtherText] = useState<string | null>(
    savedIsCustom ? savedRole : null,
  );
  const [otherModalVisible, setOtherModalVisible] = useState(false);
  const [otherDraft, setOtherDraft] = useState("");
  const canContinue = role !== null;
  const handleContinue = () => {
    if (!canContinue) return;
    const finalRole = role === "Other" && otherText ? otherText : role;
    setSubscriberRole(finalRole);
    router.push("/subscriber-color");
  };
  const openOtherModal = () => {
    setOtherDraft(otherText ?? "");
    setOtherModalVisible(true);
  };
  const confirmOtherIsFine = () => {
    setOtherText(null);
    setRole("Other");
    setOtherModalVisible(false);
  };
  const confirmOtherText = () => {
    if (otherDraft.trim().length === 0) return;
    setOtherText(otherDraft.trim());
    setRole("Other");
    setOtherModalVisible(false);
  };
  const [fontsLoaded, fontError] = useFonts({
    CaveatRegular: require("../../../assets/fonts/Caveat-Regular.ttf"),
  });

  return (
    <View
      className="flex-1 bg-country px-6"
      style={{
        paddingTop: insets.top + 52,
        paddingBottom: insets.bottom,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to your name"
        onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/subscriber");
        }}
        className="absolute items-center justify-center active:opacity-70"
        style={{ top: insets.top + 8, left: 16, width: 48, height: 48 }}
      >
        <Svg width={30} height={30} viewBox="0 0 24 24" accessible={false}>
          <Path
            d="M20 12H4M11 5l-7 7 7 7"
            fill="none"
            stroke="#241E38"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {(fontsLoaded || fontError) && (
          <Text
            accessibilityRole="header"
            className="text-center"
            style={{
              fontFamily: fontsLoaded ? "CaveatRegular" : undefined,
              color: "#241E38",
              fontSize: 36,
              lineHeight: 42,
              paddingVertical: 4,
            }}
          >
            Your primary relationship to {lovedOneName}?
          </Text>
        )}
        <View
          className="w-full max-w-md self-center mt-6"
          style={{ flexGrow: 1, justifyContent: "space-between", gap: 10 }}
        >
          {ROLE_GROUPS.map((group) => (
            <View key={group.options[0]} style={{ flexDirection: "row", gap: 6 }}>
              {group.options.map((option) => {
                const selected = role === option;
                const isOther = option === "Other";
                const label = isOther && otherText ? otherText : option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="radio"
                    accessibilityLabel={label}
                    accessibilityState={{ selected }}
                    onPress={() => (isOther ? openOtherModal() : setRole(option))}
                    className="items-center justify-center rounded-lg active:opacity-80"
                    style={{
                      flex: 1,
                      minHeight: 48,
                      paddingHorizontal: 4,
                      paddingVertical: 8,
                      backgroundColor: selected ? group.selectedColor : group.color,
                      borderWidth: 2,
                      borderColor: selected ? "#29486E" : "transparent",
                    }}
                  >
                    <Text
                      className="text-center"
                      style={{
                        fontSize: 14,
                        lineHeight: 18,
                        fontWeight: selected ? "700" : "500",
                        color: "#241E38",
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        disabled={!canContinue}
        accessibilityState={{ disabled: !canContinue }}
        onPress={handleContinue}
        className={`w-4/5 max-w-xs self-center items-center rounded-lg py-4 mb-4 ${canContinue ? "bg-ink active:opacity-80" : "bg-tile"}`}
      >
        <Text
          className={`text-xl font-semibold ${canContinue ? "text-white" : "text-graphite/50"}`}
        >
          Continue
        </Text>
      </Pressable>
      <Modal
        visible={otherModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOtherModalVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-ink/60 px-6">
          <View className="w-full max-w-sm rounded-lg bg-tile p-6">
            <Text className="text-graphite text-lg font-semibold text-center mb-4">
              Would you like to specify?
            </Text>
            <TextInput
              value={otherDraft}
              onChangeText={setOtherDraft}
              placeholder="Yes"
              placeholderTextColor="rgba(36, 36, 40, 0.25)"
              maxLength={30}
              multiline
              className="w-full rounded-lg bg-white px-4 py-3 text-base text-graphite"
              style={{ minHeight: 48 }}
            />
            <Pressable
              accessibilityRole="button"
              onPress={confirmOtherIsFine}
              className="mt-8 items-center active:opacity-70"
            >
              <Text className="text-graphite/70 text-base">
                No, &quot;Other&quot; is fine
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={otherDraft.trim().length === 0}
              onPress={confirmOtherText}
              className={`w-full items-center rounded-lg py-3 mt-6 ${
                otherDraft.trim().length === 0
                  ? "bg-white/40"
                  : "bg-ink active:opacity-80"
              }`}
            >
              <Text
                className={`text-lg font-semibold ${
                  otherDraft.trim().length === 0 ? "text-graphite/40" : "text-white"
                }`}
              >
                Continue
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
