import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AddPersonSheet from "@/components/AddPersonSheet";
import MemberPreferencesEditor from "@/components/MemberPreferencesEditor";
import MemberIdentifier from "@/components/MemberIdentifier";
import { CIRCLE_COLORS } from "@/constants/circle-colors";
import type { PlanTier } from "@/constants/plans";
import { getCircleSummary } from "@/data/circles";
import { getEvents } from "@/data/events";
import type { CalendarEvent, Member } from "@/data/fakeData";
import { addMember, getMembers, removeMember } from "@/data/members";
import { useOnboardingStore } from "@/store/onboarding-store";
import { sendInvite } from "@/utils/invite-link";

const GRAY_BG = "#D7DBE1";
const GRAY_AVATAR = "#9AA5B1";
const CARD_HEIGHT = 60;


const limitForTier = (tier: PlanTier) => (tier === "premium" ? 20 : 6);

const formatEventDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function MembersScreen() {
  const insets = useSafeAreaInsets();
  const tabScroll = useRef<ScrollView>(null);
  const tabPositions = useRef<Record<string, number>>({});
  const myMemberId = useOnboardingStore((state) => state.myMemberId);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const circleId = useOnboardingStore((state) => state.circleId);
  const sentInviteIds = useOnboardingStore((state) => state.sentInviteIds) ?? [];
  const markInviteSent = useOnboardingStore((state) => state.markInviteSent);
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
    sendInvite(member, lovedOneName)
      .then((sent) => {
        if (sent) markInviteSent(member.id);
      })
      .catch(() => {
        Alert.alert("Couldn't send the invite", "Please try again.");
      });
  };

  const handleResendInvite = (member: Member) => {
    Alert.alert(
      "Invite pending",
      `${member.name} hasn't joined yet. Send the invite again?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Send again", onPress: () => handleSendInvite(member) },
      ],
    );
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
  useEffect(() => {
    if (selectedId && tabMembers.some((m) => m.id === selectedId)) return;
    setSelectedId(tabMembers.find((member) => member.id === myMemberId)?.id ?? tabMembers[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, myMemberId]);

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

  return (
    <View
      className="flex-1 bg-country"
      style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}
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
        <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Pending: still cards, not tabs, until each one accepts. */}
          <View style={{ gap: 8 }}>
            {pending.map((member) => (
              <View
                key={member.id}
                className="justify-center rounded-2xl bg-white/60 px-4 py-3"
                style={{ minHeight: CARD_HEIGHT }}
              >
                <View className="flex-row items-center" style={{ gap: 12 }}>
                  <MemberIdentifier color={GRAY_AVATAR} size={36} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text className="text-graphite text-base font-bold" numberOfLines={1}>
                      {member.name}
                    </Text>
                    <Text className="text-graphite/60 text-xs" numberOfLines={1}>
                      {member.phone?.trim() || "No number saved"}
                    </Text>
                  </View>
                  {sentInviteIds.includes(member.id) ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Invite pending for ${member.name}. Send again`}
                      onPress={() => handleResendInvite(member)}
                      className="rounded-full bg-graphite/10 px-3 py-1.5 active:opacity-60"
                    >
                      <Text className="text-graphite/70 text-xs font-semibold">
                        Pending
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleSendInvite(member)}
                      className="rounded-full bg-ink px-3 py-1.5 active:opacity-80"
                    >
                      <Text className="text-white text-xs font-semibold">
                        Send invite
                      </Text>
                    </Pressable>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${member.name}`}
                    onPress={() => handleRemove(member)}
                    hitSlop={8}
                    className="ml-2 active:opacity-60"
                  >
                    <Text className="text-graphite/50 text-xs underline">Remove</Text>
                  </Pressable>
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
          </View>

          {/* Colored member tabs stay together above a full-width detail page. */}
          <View className="mt-4" style={{ minWidth: 0 }}>
            <ScrollView
              horizontal
              ref={tabScroll}
              showsHorizontalScrollIndicator
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ gap: 8, paddingBottom: 10 }}
            >
              {tabMembers.map((member) => (
                <TabButton
                  key={member.id}
                  member={member}
                  selected={member.id === selectedId}
                  onLayout={(x) => { tabPositions.current[member.id] = x; }}
                  onPress={() => {
                    setSelectedId(member.id);
                    tabScroll.current?.scrollTo({ x: tabPositions.current[member.id] ?? 0, animated: true });
                  }}
                />
              ))}
            </ScrollView>

            {selected && (
              <View
                className="rounded-2xl"
                style={{
                  padding: 16,
                  minWidth: 0,
                  backgroundColor: selected.color
                    ? `${selected.color}22`
                    : GRAY_BG,
                }}
              >
                <View className="flex-row items-center">
                  <MemberIdentifier color={selected.color ?? GRAY_AVATAR} size={56} />
                  <View className="ml-3 flex-1" style={{ minWidth: 0 }}>
                    <Text className="text-graphite text-lg font-bold">
                      {selected.name}
                    </Text>
                    <Text className="text-graphite/60 text-xs">
                      {`${selected.id === myMemberId ? "You · " : ""}${selected.role === "owner" ? "Circle organizer" : "Circle member"}`}
                    </Text>
                  </View>
                </View>
                {selected.id === myMemberId && selected.inviteStatus === "accepted" && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPreferencesOpen(true)}
                    className="self-start mt-4 rounded-lg bg-ink px-4 py-3 active:opacity-80"
                  >
                    <Text className="text-white font-semibold">Edit my preferences</Text>
                  </Pressable>
                )}
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
              </View>
            )}
          </View>
        </ScrollView>
      )}

      <MemberPreferencesEditor
        visible={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
        onSaved={load}
      />

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

// Keep the colored-tab concept, but let each name size its own scrollable tab.
function TabButton({ member, selected, onPress, onLayout }: {
  member: Member;
  selected: boolean;
  onPress: () => void;
  onLayout: (x: number) => void;
}) {
  return (
    <Pressable
      onLayout={(event) => onLayout(event.nativeEvent.layout.x)}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={member.name}
      onPress={onPress}
      className="items-center justify-center rounded-xl active:opacity-80"
      style={{
        minHeight: 76,
        maxWidth: 180,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: member.color ? `${member.color}44` : GRAY_BG,
        borderWidth: 2,
        borderColor: selected ? "#29486E" : "transparent",
      }}
    >
      <MemberIdentifier color={member.color ?? GRAY_AVATAR} size={24} />
      <Text className="font-bold text-graphite text-sm text-center" style={{ marginTop: 4 }}>
        {member.name}
      </Text>
    </Pressable>
  );
}
