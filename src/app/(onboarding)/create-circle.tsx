import { useState } from "react";
import { useFonts } from "expo-font";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Alert, Keyboard, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AddPersonSheet from "@/components/AddPersonSheet";
import MemberIdentifier from "@/components/MemberIdentifier";
import { CIRCLE_COLORS } from "@/constants/circle-colors";
import { InviteStatus, useOnboardingStore } from "@/store/onboarding-store";
import { lighten } from "@/utils/color";
import { possessive } from "@/utils/text";

// How many people the first plan tier has room for (matches the store's slots).
const INVITE_LIMIT = 5;
const AVATAR_GRAY = "#9AA5B1";
// Every card on this screen (subscriber, added people, blank add card) is this tall.
const CARD_HEIGHT = 64;

export default function MemberInvitesScreen() {
  const insets = useSafeAreaInsets();
  const names = useOnboardingStore((state) => state.inviteNames);
  const phones = useOnboardingStore((state) => state.invitePhones);
  const statuses = useOnboardingStore((state) => state.inviteStatuses);
  const colors = useOnboardingStore((state) => state.inviteColors);
  const lovedOneName = useOnboardingStore((state) => state.lovedOneName);
  const subscriberColor = useOnboardingStore((state) => state.subscriberColor);
  const subscriberName = useOnboardingStore((state) => state.subscriberName);
  const setWantsMorePeople = useOnboardingStore((state) => state.setWantsMorePeople);
  const setInviteNames = useOnboardingStore((state) => state.setInviteNames);
  const setInvitePhones = useOnboardingStore((state) => state.setInvitePhones);
  const setInviteStatuses = useOnboardingStore(
    (state) => state.setInviteStatuses,
  );
  const setInviteColors = useOnboardingStore((state) => state.setInviteColors);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);

  const added = names
    .map((name, index) => ({ name: name.trim(), phone: phones[index], index }))
    .filter((person) => person.name.length > 0);

  const handleContinue = (showPremium = false) => {
    setWantsMorePeople(showPremium);
    Keyboard.dismiss();
    // TEMP: skips the adding-members animation and seeds 2 accepted invites
    // so the tab address-book screen can be screenshotted for a demo. Revert
    // to the real hasInvites/adding-members flow once that's no longer needed.
    const demoNames = [...names];
    demoNames[0] = demoNames[0].trim() || "Alex Rivera";
    demoNames[1] = demoNames[1].trim() || "Jordan Lee";
    setInviteNames(demoNames);
    const demoPhones = [...phones];
    demoPhones[0] = demoPhones[0].trim() || "(555) 123-4567";
    demoPhones[1] = demoPhones[1].trim() || "(555) 987-6543";
    setInvitePhones(demoPhones);
    const demoStatuses: InviteStatus[] = [
      "accepted",
      "accepted",
      "not_sent",
      "not_sent",
      "not_sent",
    ];
    setInviteStatuses(demoStatuses);
    const available = CIRCLE_COLORS.filter((c) => c.hex !== subscriberColor);
    setInviteColors([
      available[0]?.hex ?? CIRCLE_COLORS[0].hex,
      available[1]?.hex ?? CIRCLE_COLORS[1].hex,
      null,
      null,
      null,
    ]);
    router.push("/paywall");
  };

  const openSheet = () => {
    // Tell them before they spend time typing someone in, not after.
    if (added.length >= INVITE_LIMIT) {
      setLimitOpen(true);
      return;
    }
    setSheetOpen(true);
  };

  const handleAddPerson = (name: string, phone: string) => {
    const slot = names.findIndex((n) => n.trim().length === 0);
    if (slot === -1) {
      setLimitOpen(true);
      return;
    }
    const nextNames = [...names];
    nextNames[slot] = name;
    setInviteNames(nextNames);
    const nextPhones = [...phones];
    nextPhones[slot] = phone;
    setInvitePhones(nextPhones);
    // Being added here is the invite — there's no separate "send" step, so
    // this has to be a DB-legal status right away (not the "not_sent"
    // default, which circle_members_invite_status_check rejects).
    const nextStatuses = [...statuses];
    nextStatuses[slot] = "pending";
    setInviteStatuses(nextStatuses);
  };

  const confirmRemove = (index: number, name: string) => {
    Alert.alert(
      `Remove ${name}?`,
      `Are you sure you want to remove ${name} from the circle?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => removePerson(index) },
      ],
    );
  };

  // Drops one person and closes the gap, keeping every parallel array aligned.
  const removePerson = (index: number) => {
    const keep = names.map((_, i) => i).filter((i) => i !== index);
    const compact = <T,>(list: T[], blank: T) =>
      [
        ...keep.map((i) => list[i]),
        ...Array(names.length - keep.length).fill(blank),
      ] as T[];
    setInviteNames(compact(names, ""));
    setInvitePhones(compact(phones, ""));
    setInviteStatuses(compact(statuses, "not_sent" as InviteStatus));
    setInviteColors(compact(colors, null as string | null));
  };

  const lovedOne = lovedOneName.trim();
  const circleTitle = lovedOne
    ? `Add to ${possessive(lovedOne)} circle`
    : "Add to your circle";
  const [fontsLoaded, fontError] = useFonts({
    CaveatRegular: require("../../../assets/fonts/Caveat-Regular.ttf"),
  });

  return (
    <View
      className="flex-1 bg-country px-6"
      style={{
        paddingTop: insets.top + (Platform.OS === "web" ? 12 : 20),
        paddingBottom: insets.bottom,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to your color"
        onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/subscriber-color");
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
      {(fontsLoaded || fontError) && (
        <Text
          accessibilityRole="header"
          className="text-[#241E38] text-center mt-8"
          style={{
            fontFamily: fontsLoaded ? "CaveatRegular" : undefined,
            fontSize: 44,
            lineHeight: 60,
            paddingVertical: 0,
          }}
        >
          Create circle.
        </Text>
      )}
      <Text className="text-graphite/80 text-center text-xl mt-1 px-4">
        Who would you like to include?
      </Text>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingVertical: 20,
          justifyContent: "flex-start",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-md self-center" style={{ gap: 10 }}>
          {/* The subscriber is always the first card, tinted with their color. */}
          <View
            className="flex-row items-center rounded-2xl px-4 py-3"
            style={{
              minHeight: CARD_HEIGHT,
              backgroundColor: lighten(subscriberColor ?? AVATAR_GRAY, 0.75),
            }}
          >
            <MemberIdentifier color={subscriberColor ?? AVATAR_GRAY} size={40} />
            <View className="flex-1 ml-5">
              <Text className="text-ink text-lg font-bold" numberOfLines={1}>
                {subscriberName.trim() || "You"}
              </Text>
              <Text className="text-ink/70 text-sm">Organizer</Text>
            </View>
          </View>
          {added.map((person) => (
            <View
              key={person.index}
              className="flex-row items-center rounded-2xl bg-white/60 px-4 py-3"
              style={{ minHeight: CARD_HEIGHT }}
            >
              <MemberIdentifier color={AVATAR_GRAY} size={40} />
              <View className="flex-1 ml-5">
                <Text
                  className="text-ink text-lg font-bold"
                  numberOfLines={1}
                >
                  {person.name}
                </Text>
                <Text className="text-ink/70 text-sm" numberOfLines={1}>
                  {person.phone?.trim() || "No number yet"}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${person.name}`}
                onPress={() => confirmRemove(person.index, person.name)}
                className="rounded-full bg-graphite/10 px-3 py-1.5 active:opacity-60"
              >
                <Text className="text-graphite/70 text-xs font-semibold">
                  Remove
                </Text>
              </Pressable>
            </View>
          ))}
          {/* Blank card: profile icon on the left, plus sign in the middle. Tap to add. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              added.length === 0 ? "Add someone" : "Add another person"
            }
            onPress={openSheet}
            className="flex-row items-center rounded-2xl bg-white/30 px-4 py-3 active:opacity-70"
            style={{
              minHeight: CARD_HEIGHT,
              borderWidth: 1.5,
              borderStyle: "dashed",
              borderColor: "rgba(36, 36, 40, 0.3)",
            }}
          >
            <MemberIdentifier color="#C9CED6" size={40} />
            <View
              pointerEvents="none"
              className="absolute left-0 right-0 top-0 bottom-0 items-center justify-center"
            >
              <Svg width={28} height={28} viewBox="0 0 24 24" accessible={false}>
                <Path
                  d="M12 5v14M5 12h14"
                  stroke="rgba(36, 36, 40, 0.6)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              </Svg>
            </View>
          </Pressable>
        </View>
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        onPress={() => handleContinue()}
        className="w-4/5 max-w-xs self-center items-center rounded-lg py-4 mb-8 bg-ink active:opacity-80"
      >
        <Text className="text-xl font-semibold text-white">Continue</Text>
      </Pressable>

      <AddPersonSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSubmit={handleAddPerson}
        title={circleTitle}
        taken={added.map((person) => ({ name: person.name, phone: person.phone }))}
      />

      <Modal
        visible={limitOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLimitOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-ink/60 px-6">
          <View className="w-full max-w-sm rounded-lg bg-tile p-6">
            <Text className="text-graphite text-xl font-semibold text-center">
              Want to add more people?
            </Text>
            <Text
              className="text-graphite/80 text-lg text-center mt-6"
              style={{ lineHeight: 26 }}
              textBreakStrategy="balanced"
            >
              Your circle allows up to {INVITE_LIMIT + 1} people.{"\n"}
              Premium allows up to 20 people.{"\n"}
              Everyone you&apos;ve added is saved.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setLimitOpen(false);
                handleContinue(true);
              }}
              className="w-full items-center rounded-lg py-3 mt-6 bg-ink active:opacity-80"
            >
              <Text className="text-lg font-semibold text-white">
                See plans
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setLimitOpen(false)}
              className="mt-4 items-center active:opacity-70"
            >
              <Text className="text-graphite/70 text-lg">Return to circle</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
