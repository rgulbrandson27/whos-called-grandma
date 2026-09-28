import { useState } from "react";
import { useFonts } from "expo-font";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MemberIdentifier from "@/components/MemberIdentifier";
import { CIRCLE_COLORS } from "@/constants/circle-colors";
import { InviteStatus, useOnboardingStore } from "@/store/onboarding-store";
import { lighten } from "@/utils/color";

const GRAY_BG = "#D7DBE1";
const GRAY_AVATAR = "#9AA5B1";

type Slot = {
  key: string;
  isSubscriber: boolean;
  inviteIndex: number | null;
  name: string;
  phone: string | null;
  color: string | null;
  status: InviteStatus;
};

export default function MemberInvitesScreen() {
  const insets = useSafeAreaInsets();
  const subscriberName = useOnboardingStore((state) => state.subscriberName);
  const subscriberColor = useOnboardingStore((state) => state.subscriberColor);
  const names = useOnboardingStore((state) => state.inviteNames);
  const phones = useOnboardingStore((state) => state.invitePhones);
  const statuses = useOnboardingStore((state) => state.inviteStatuses);
  const colors = useOnboardingStore((state) => state.inviteColors);
  const setInviteStatuses = useOnboardingStore((state) => state.setInviteStatuses);
  const setInviteColors = useOnboardingStore((state) => state.setInviteColors);
  const [selectedTab, setSelectedTab] = useState(0);
  const [fontsLoaded, fontError] = useFonts({
    CaveatRegular: require("../../../assets/fonts/Caveat-Regular.ttf"),
  });

  const slots: Slot[] = [
    {
      key: "subscriber",
      isSubscriber: true,
      inviteIndex: null,
      name: subscriberName.trim() || "You",
      phone: null,
      color: subscriberColor,
      status: "accepted",
    },
    ...names.map((name, index) => ({
      key: `invite-${index}`,
      isSubscriber: false,
      inviteIndex: index,
      name: name.trim() || `Person ${index + 2}`,
      phone: phones[index],
      color: colors[index],
      status: statuses[index],
    })),
  ];

  const showTabs = statuses.includes("accepted");

  const setStatusAt = (index: number, status: InviteStatus) => {
    const next = [...statuses];
    next[index] = status;
    setInviteStatuses(next);
  };

  const sendInvite = (index: number) => setStatusAt(index, "pending");

  const cancelInvite = (index: number) => setStatusAt(index, "not_sent");

  const acceptInvite = (index: number) => {
    const used = new Set(
      [subscriberColor, ...colors].filter((c): c is string => c !== null),
    );
    const nextColor =
      CIRCLE_COLORS.find((c) => !used.has(c.hex))?.hex ?? CIRCLE_COLORS[0].hex;
    const nextColors = [...colors];
    nextColors[index] = nextColor;
    setInviteColors(nextColors);
    setStatusAt(index, "accepted");
    setSelectedTab(index + 1);
  };

  const simulateAccept = (index: number, name: string) => {
    Alert.alert(
      "Simulate acceptance",
      `There's no real invite flow yet, so this is a stand-in for testing. Mark ${
        name || "this person"
      } as having joined and pick their color?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Mark joined", onPress: () => acceptInvite(index) },
      ],
    );
  };

  return (
    <View
      className="flex-1 bg-country"
      style={{
        paddingTop: insets.top + (Platform.OS === "web" ? 28 : 44),
        paddingBottom: insets.bottom,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to your circle"
        onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/create-circle");
        }}
        className="absolute items-center justify-center active:opacity-70"
        style={{ top: insets.top + 8, left: 16, width: 48, height: 48, zIndex: 1 }}
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
          className="text-[#241E38] text-center"
          style={{
            fontFamily: fontsLoaded ? "CaveatRegular" : undefined,
            fontSize: 36,
            lineHeight: 48,
            paddingVertical: 4,
          }}
        >
          Your circle.
        </Text>
      )}
      {showTabs ? (
        <TabAddressBook
          slots={slots}
          selectedTab={selectedTab}
          onSelectTab={setSelectedTab}
          onSendInvite={sendInvite}
          onCancelInvite={cancelInvite}
          onSimulateAccept={simulateAccept}
        />
      ) : (
        <CardStack
          slots={slots}
          onSendInvite={sendInvite}
          onCancelInvite={cancelInvite}
          onSimulateAccept={simulateAccept}
        />
      )}
    </View>
  );
}

function CardStack({
  slots,
  onSendInvite,
  onCancelInvite,
  onSimulateAccept,
}: {
  slots: Slot[];
  onSendInvite: (index: number) => void;
  onCancelInvite: (index: number) => void;
  onSimulateAccept: (index: number, name: string) => void;
}) {
  return (
    <View className="flex-1 px-6 pt-4 pb-6" style={{ gap: 10 }}>
      {slots.map((slot) => (
        <View
          key={slot.key}
          className="flex-1 flex-row items-center rounded-2xl px-4"
          style={{
            backgroundColor: slot.isSubscriber
              ? lighten(slot.color ?? GRAY_AVATAR, 0.75)
              : GRAY_BG,
          }}
        >
          <MemberIdentifier color={slot.color ?? GRAY_AVATAR} size={44} />
          <View className="flex-1 ml-3">
            <Text className="text-graphite text-base font-bold" numberOfLines={1}>
              {slot.name}
            </Text>
            {slot.isSubscriber ? (
              <Text className="text-graphite/60 text-xs">You · circle organizer</Text>
            ) : (
              <Text className="text-graphite/60 text-xs" numberOfLines={1}>
                {slot.phone?.trim() || "No number yet"}
              </Text>
            )}
          </View>
          {!slot.isSubscriber && (
            <InviteAction
              status={slot.status}
              onSend={() => onSendInvite(slot.inviteIndex!)}
              onCancel={() => onCancelInvite(slot.inviteIndex!)}
              onSimulateAccept={() => onSimulateAccept(slot.inviteIndex!, slot.name)}
            />
          )}
        </View>
      ))}
    </View>
  );
}

function InviteAction({
  status,
  onSend,
  onCancel,
  onSimulateAccept,
}: {
  status: InviteStatus;
  onSend: () => void;
  onCancel: () => void;
  onSimulateAccept: () => void;
}) {
  if (status === "pending") {
    return (
      <View className="items-end">
        <Pressable
          accessibilityRole="button"
          onPress={onSimulateAccept}
          className="active:opacity-70"
        >
          <Text className="text-graphite/70 text-xs font-semibold underline">
            Pending
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          className="mt-1 active:opacity-70"
        >
          <Text className="text-graphite/50 text-[11px] underline">Cancel invite</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onSend}
      className="rounded-lg bg-ink px-3 py-2 active:opacity-80"
    >
      <Text className="text-white text-xs font-semibold">Send Invite</Text>
    </Pressable>
  );
}

function TabAddressBook({
  slots,
  selectedTab,
  onSelectTab,
  onSendInvite,
  onCancelInvite,
  onSimulateAccept,
}: {
  slots: Slot[];
  selectedTab: number;
  onSelectTab: (index: number) => void;
  onSendInvite: (index: number) => void;
  onCancelInvite: (index: number) => void;
  onSimulateAccept: (index: number, name: string) => void;
}) {
  const active = slots[selectedTab];
  const pageColor = active.color ?? GRAY_BG;
  const pageBg = active.color ? lighten(active.color, 0.82) : GRAY_BG;

  return (
    <View className="flex-1 flex-row px-4 pt-2 pb-6" style={{ gap: 0 }}>
      <View style={{ width: 56, gap: 6 }}>
        {slots.map((slot, index) => {
          const selected = index === selectedTab;
          return (
            <Pressable
              key={slot.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={slot.name}
              onPress={() => onSelectTab(index)}
              className="flex-1 items-center justify-center active:opacity-80"
              style={{
                backgroundColor: slot.color ?? GRAY_BG,
                borderTopLeftRadius: 10,
                borderBottomLeftRadius: 10,
                marginRight: selected ? -1 : 10,
                elevation: selected ? 2 : 0,
              }}
            >
              <Text
                className="font-bold text-base"
                style={{ color: slot.color ? "#FFFFFF" : "#6B7280" }}
              >
                {slot.name.trim().charAt(0).toUpperCase() || "?"}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View
        className="flex-1 rounded-2xl p-5"
        style={{ backgroundColor: pageBg }}
      >
        <View className="flex-row items-center">
          <MemberIdentifier color={pageColor} size={56} />
          <View className="ml-3 flex-1">
            <Text className="text-graphite text-lg font-bold" numberOfLines={1}>
              {active.name}
            </Text>
            <Text className="text-graphite/60 text-xs">
              {active.isSubscriber ? "You · circle organizer" : "Circle member"}
            </Text>
          </View>
        </View>
        {active.phone && (
          <Text className="text-graphite text-sm mt-4">{active.phone}</Text>
        )}
        {active.status === "accepted" ? (
          <View className="mt-6" style={{ gap: 16 }}>
            <View>
              <Text className="text-graphite text-sm font-bold mb-1">
                Recent contacts
              </Text>
              <Text className="text-graphite/50 text-xs">No contact history yet.</Text>
            </View>
            <View>
              <Text className="text-graphite text-sm font-bold mb-1">Upcoming</Text>
              <Text className="text-graphite/50 text-xs">Nothing scheduled yet.</Text>
            </View>
          </View>
        ) : (
          <View className="mt-6">
            <Text className="text-graphite/60 text-xs mb-3">
              {active.status === "pending"
                ? "Invite sent — waiting for them to join."
                : "No invite sent yet."}
            </Text>
            <InviteAction
              status={active.status}
              onSend={() => onSendInvite(active.inviteIndex!)}
              onCancel={() => onCancelInvite(active.inviteIndex!)}
              onSimulateAccept={() =>
                onSimulateAccept(active.inviteIndex!, active.name)
              }
            />
          </View>
        )}
      </View>
    </View>
  );
}
