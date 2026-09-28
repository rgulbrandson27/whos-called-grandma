import { useEffect, useState } from "react";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AddPersonSheet from "@/components/AddPersonSheet";
import MemberIdentifier from "@/components/MemberIdentifier";
import { CIRCLE_COLORS } from "@/constants/circle-colors";
import type { PlanTier } from "@/constants/plans";
import { getCircleSummary } from "@/data/circles";
import { getEvents } from "@/data/events";
import type { CalendarEvent, Member } from "@/data/fakeData";
import { acceptMember, addMember, getMembers, removeMember } from "@/data/members";
import { useOnboardingStore } from "@/store/onboarding-store";
import { getInviteUrl } from "@/utils/invite-link";
import { possessive } from "@/utils/text";

const GRAY_BG = "#D7DBE1";
const GRAY_AVATAR = "#9AA5B1";
const CARD_HEIGHT = 60;
const TAB_WIDTH = 64;
const TAB_HEIGHT = 72;
const TAB_GAP = 6;
const PENDING_MAX_HEIGHT = 240;

const limitForTier = (tier: PlanTier) => (tier === "premium" ? 20 : 6);

const formatEventDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function MembersScreen() {
  const insets = useSafeAreaInsets();
  const circleId = useOnboardingStore((state) => state.circleId);
  const setWantsMorePeople = useOnboardingStore((state) => state.setWantsMorePeople);

  const [members, setMembers] = useState<Member[] | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tier, setTier] = useState<PlanTier>("basic");
  const [lovedOneName, setLovedOneName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = async () => {
    if (!circleId) {
      setLoadError("No circle found for this device.");
      return;
    }
    try {
      const [summary, rows, eventRows] = await Promise.all([
        getCircleSummary(circleId),
        getMembers(circleId),
        getEvents(circleId),
      ]);
      setTier(summary.plan.split("_")[0] as PlanTier);
      setLovedOneName(summary.lovedOneName);
      setMembers(rows);
      setEvents(eventRows);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn't load your circle.");
    }
  };

  const handleSendInvite = (member: Member) => {
    const url = getInviteUrl(member.id);
    Share.share({
      message: `You're invited to ${possessive(lovedOneName || "our")} circle on Who's Called Grandma! Tap to join: ${url}`,
      url,
    }).catch(() => {
      Alert.alert("Couldn't open share sheet", "Please try again.");
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleId]);

  // Owner is always a tab, from the very start. Everyone else moves from a
  // pending card to a tab the moment they accept — both lists stay live
  // side by side for as long as anyone is still pending.
  const tabMembers = (members ?? [])
    .filter((m) => m.role === "owner" || m.inviteStatus === "accepted")
    .sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : 0));
  const pending = (members ?? []).filter(
    (m) => m.role !== "owner" && m.inviteStatus === "pending",
  );
  // Left column fills up to however many tabs actually fit on screen; once
  // there are more accepted people than that, the rest spill into a second
  // column on the right instead of making the left side scroll.
  const [tabAreaHeight, setTabAreaHeight] = useState(0);
  const tabCapacity = Math.max(
    1,
    Math.floor((tabAreaHeight + TAB_GAP) / (TAB_HEIGHT + TAB_GAP)),
  );
  const leftTabs = tabMembers.slice(0, tabCapacity);
  const rightTabs = tabMembers.slice(tabCapacity);

  useEffect(() => {
    if (selectedId && tabMembers.some((m) => m.id === selectedId)) return;
    setSelectedId(tabMembers[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members]);

  const limit = limitForTier(tier);
  const selected = tabMembers.find((m) => m.id === selectedId) ?? null;
  const selectedEvents = events.filter((e) => e.memberId === selectedId);
  const today = new Date().toISOString().slice(0, 10);
  const past = selectedEvents
    .filter((e) => e.date < today)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5);
  const upcoming = selectedEvents
    .filter((e) => e.date >= today)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(0, 5);

  const openSheet = () => {
    if (!members) return;
    if (members.length >= limit) {
      if (tier === "basic") {
        Alert.alert(
          "Circle is full",
          `Basic allows up to ${limit} people. Upgrade to Premium for up to 20.`,
          [
            { text: "Not now", style: "cancel" },
            {
              text: "See plans",
              onPress: () => {
                setWantsMorePeople(true);
                router.push("/paywall");
              },
            },
          ],
        );
      } else {
        Alert.alert("Circle is full", "Premium allows up to 20 people.");
      }
      return;
    }
    setSheetOpen(true);
  };

  const handleAddPerson = async (name: string, phone: string) => {
    if (!circleId || !members) return;
    const used = new Set(members.map((m) => m.color).filter(Boolean));
    const color =
      CIRCLE_COLORS.find((c) => !used.has(c.hex))?.hex ?? CIRCLE_COLORS[0].hex;
    await addMember(circleId, name, phone, color);
    await load();
  };

  const handleRemove = (member: Member) => {
    Alert.alert(
      `Remove ${member.name}?`,
      `Are you sure you want to remove ${member.name} from the circle?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeMember(member.id);
              await load();
            } catch (e) {
              Alert.alert(
                "Couldn't remove",
                e instanceof Error ? e.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const handleSimulateAccept = (member: Member) => {
    Alert.alert(
      "Simulate acceptance",
      `There's no real invite flow yet — that needs actually sending ${member.name} a text and a screen for them to open on their own phone, where they'd pick their own color and calendar view. This just marks them accepted for testing, keeping the color already reserved for them.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark accepted",
          onPress: async () => {
            try {
              await acceptMember(member.id);
              await load();
              setSelectedId(member.id);
            } catch (e) {
              Alert.alert(
                "Couldn't update",
                e instanceof Error ? e.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  return (
    <View
      className="flex-1 bg-country"
      style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom }}
    >
      <View className="flex-row items-center px-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/settings")
          }
          className="items-center justify-center active:opacity-70"
          style={{ width: 44, height: 44 }}
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
        <Text className="text-graphite text-xl font-bold ml-2">Your circle</Text>
      </View>

      {!members && !loadError && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#29486E" />
        </View>
      )}

      {loadError && (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-graphite/70 text-center text-sm">{loadError}</Text>
        </View>
      )}

      {members && (
        <View className="flex-1 px-4 pt-4">
          {/* Pending: still cards, not tabs, until each one accepts. */}
          <ScrollView
            style={{ maxHeight: PENDING_MAX_HEIGHT }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {pending.map((member) => (
              <View
                key={member.id}
                className="flex-row items-center rounded-2xl bg-white/60 px-4 py-3"
                style={{ minHeight: CARD_HEIGHT }}
              >
                <MemberIdentifier color={GRAY_AVATAR} size={36} />
                <View className="flex-1 ml-4">
                  <Text className="text-graphite text-base font-bold" numberOfLines={1}>
                    {member.name}
                  </Text>
                  <Text className="text-graphite/60 text-xs" numberOfLines={1}>
                    {member.phone?.trim() || "No number saved"}
                  </Text>
                </View>
                <View className="items-end">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleSendInvite(member)}
                    className="rounded-full bg-ink px-3 py-1.5 active:opacity-80"
                  >
                    <Text className="text-white text-xs font-semibold">
                      Send invite
                    </Text>
                  </Pressable>
                  <View className="flex-row mt-1.5" style={{ gap: 8 }}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleSimulateAccept(member)}
                      className="active:opacity-70"
                    >
                      <Text className="text-graphite/50 text-[11px] underline">
                        Pending
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleRemove(member)}
                      className="active:opacity-70"
                    >
                      <Text className="text-graphite/50 text-[11px] underline">Remove</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={pending.length === 0 ? "Add someone" : "Add another person"}
              onPress={openSheet}
              className="flex-row items-center justify-center rounded-2xl bg-white/30 px-4 py-3 active:opacity-70"
              style={{
                minHeight: CARD_HEIGHT,
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: "rgba(36, 36, 40, 0.3)",
              }}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" accessible={false}>
                <Path
                  d="M12 5v14M5 12h14"
                  stroke="rgba(36, 36, 40, 0.6)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              </Svg>
            </Pressable>
          </ScrollView>

          {/* Accepted: tabs, growing one at a time as pending cards accept.
              Left column fills to whatever fits on screen (measured below);
              anyone past that spills into a second column on the right. */}
          <View
            className="flex-1 flex-row mt-4"
            onLayout={(e) => setTabAreaHeight(e.nativeEvent.layout.height)}
          >
            <ScrollView
              style={{ width: TAB_WIDTH }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: TAB_GAP, paddingBottom: 12 }}
            >
              {leftTabs.map((member) => (
                <TabButton
                  key={member.id}
                  member={member}
                  side="left"
                  selected={member.id === selectedId}
                  onPress={() => setSelectedId(member.id)}
                />
              ))}
            </ScrollView>

            {selected && (
              <ScrollView
                className="flex-1 rounded-2xl"
                style={{
                  backgroundColor: selected.color
                    ? `${selected.color}22`
                    : GRAY_BG,
                }}
                contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
              >
                <View className="flex-row items-center">
                  <MemberIdentifier color={selected.color ?? GRAY_AVATAR} size={56} />
                  <View className="ml-3 flex-1">
                    <Text className="text-graphite text-lg font-bold" numberOfLines={1}>
                      {selected.name}
                    </Text>
                    <Text className="text-graphite/60 text-xs">
                      {selected.role === "owner" ? "You · circle organizer" : "Circle member"}
                    </Text>
                  </View>
                </View>
                {selected.phone && (
                  <Text className="text-graphite text-sm mt-4">{selected.phone}</Text>
                )}
                {selected.role !== "owner" && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleRemove(selected)}
                    className="self-start mt-3 rounded-full bg-graphite/10 px-3 py-1.5 active:opacity-60"
                  >
                    <Text className="text-graphite/70 text-xs font-semibold">
                      Remove from circle
                    </Text>
                  </Pressable>
                )}

                <View className="mt-6" style={{ gap: 16 }}>
                  <View>
                    <Text className="text-graphite text-sm font-bold mb-1">
                      Recent check-ins
                    </Text>
                    {past.length === 0 ? (
                      <Text className="text-graphite/50 text-xs">
                        No check-ins logged yet.
                      </Text>
                    ) : (
                      past.map((event) => (
                        <Text key={event.id} className="text-graphite/70 text-xs mb-1">
                          {formatEventDate(event.date)}
                          {event.noteCustom || event.notePreset
                            ? ` — ${event.noteCustom ?? event.notePreset}`
                            : ""}
                        </Text>
                      ))
                    )}
                  </View>
                  <View>
                    <Text className="text-graphite text-sm font-bold mb-1">Upcoming</Text>
                    {upcoming.length === 0 ? (
                      <Text className="text-graphite/50 text-xs">
                        Nothing scheduled yet.
                      </Text>
                    ) : (
                      upcoming.map((event) => (
                        <Text key={event.id} className="text-graphite/70 text-xs mb-1">
                          {formatEventDate(event.date)}
                        </Text>
                      ))
                    )}
                  </View>
                </View>
              </ScrollView>
            )}

            {rightTabs.length > 0 && (
              <ScrollView
                style={{ width: TAB_WIDTH }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: TAB_GAP, paddingBottom: 12 }}
              >
                {rightTabs.map((member) => (
                  <TabButton
                    key={member.id}
                    member={member}
                    side="right"
                    selected={member.id === selectedId}
                    onPress={() => setSelectedId(member.id)}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      )}

      <AddPersonSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSubmit={handleAddPerson}
        title="Add to your circle"
        taken={(members ?? []).map((m) => ({ name: m.name, phone: m.phone ?? "" }))}
      />
    </View>
  );
}

// A left-column tab connects into the page on its right edge; a right-column
// tab connects on its left edge instead — everything else is identical.
function TabButton({
  member,
  side,
  selected,
  onPress,
}: {
  member: Member;
  side: "left" | "right";
  selected: boolean;
  onPress: () => void;
}) {
  const rounded =
    side === "left"
      ? { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }
      : { borderTopRightRadius: 10, borderBottomRightRadius: 10 };
  const connect =
    side === "left"
      ? { marginRight: selected ? -1 : 10 }
      : { marginLeft: selected ? -1 : 10 };
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={member.name}
      onPress={onPress}
      className="items-center justify-center active:opacity-80"
      style={{
        height: TAB_HEIGHT,
        backgroundColor: member.color ?? GRAY_BG,
        ...rounded,
        ...connect,
        elevation: selected ? 2 : 0,
        paddingHorizontal: 4,
      }}
    >
      <MemberIdentifier color={member.color ?? GRAY_AVATAR} size={24} />
      <Text
        numberOfLines={1}
        className="font-bold"
        style={{
          fontSize: 9,
          marginTop: 3,
          maxWidth: TAB_WIDTH - 10,
          color: member.color ? "#FFFFFF" : "#6B7280",
        }}
      >
        {member.name}
      </Text>
    </Pressable>
  );
}
