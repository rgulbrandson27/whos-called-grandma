import { useEffect, useRef, useState } from "react";
import { useFonts } from "expo-font";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MemberIdentifier from "@/components/MemberIdentifier";
import type { PlanTier } from "@/constants/plans";
import { getCircleSummary } from "@/data/circles";
import { logCheckIn } from "@/data/events";
import type { EventStatus, Member } from "@/data/fakeData";
import { getMembers } from "@/data/members";
import { useOnboardingStore } from "@/store/onboarding-store";

const GRAY_AVATAR = "#9AA5B1";
const NOTE_LIMIT = 100;
// Keep the same horizontal chips, with a month available in either direction.
const DAYS_BACK = 30;
const DAYS_FORWARD = 30;
const KIND_OPTIONS = ["Call", "Visit", "Other"];

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export default function AddEventScreen() {
  const insets = useSafeAreaInsets();
  const circleId = useOnboardingStore((state) => state.circleId);
  const myMemberId = useOnboardingStore((state) => state.myMemberId);

  const [members, setMembers] = useState<Member[] | null>(null);
  const [tier, setTier] = useState<PlanTier>("basic");
  const [lovedOneName, setLovedOneName] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateScroll = useRef<ScrollView>(null);
  const datePositioned = useRef(false);
  const [kind, setKind] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!circleId) {
      setLoadError("No circle found for this device.");
      return;
    }
    Promise.all([getCircleSummary(circleId), getMembers(circleId)])
      .then(([summary, rows]) => {
        setTier(summary.plan.split("_")[0] as PlanTier);
        setLovedOneName(summary.lovedOneName);
        setMembers(rows);
        setSelectedMemberId((prev) =>
          prev ?? (myMemberId && rows.some((m) => m.id === myMemberId)
            ? myMemberId
            : (rows[0]?.id ?? null)),
        );
      })
      .catch((e) =>
        setLoadError(e instanceof Error ? e.message : "Couldn't load your circle."),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleId]);

  const [fontsLoaded, fontError] = useFonts({
    CaveatRegular: require("../../assets/fonts/Caveat-Regular.ttf"),
  });

  const isPremium = tier === "premium";
  const today = new Date();
  const days = Array.from(
    { length: DAYS_BACK + DAYS_FORWARD + 1 },
    (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - DAYS_BACK + i),
  );
  const isPast = selectedDate <= today || sameDay(selectedDate, today);
  const status: EventStatus = isPast ? "done" : "planned";
  const selectedPerson = members?.find((m) => m.id === selectedMemberId) ?? null;

  const friendlyDate = sameDay(selectedDate, today)
    ? "today"
    : `on ${selectedDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`;

  const confirmationText = selectedPerson
    ? isPast
      ? `${selectedPerson.name} checked in with ${lovedOneName || "your loved one"} ${friendlyDate}.`
      : `Scheduling ${selectedPerson.name}'s check-in with ${lovedOneName || "your loved one"} ${friendlyDate}.`
    : "";

  const handleConfirm = async () => {
    if (!circleId || !selectedMemberId) return;
    setSaving(true);
    try {
      await logCheckIn({
        circleId,
        memberId: selectedMemberId,
        date: dateKey(selectedDate),
        status,
        kind: isPremium ? kind : null,
        noteCustom: isPremium && noteText.trim() ? noteText.trim() : null,
      });
      router.replace("/calendar");
    } catch (e) {
      setSaving(false);
      Alert.alert(
        "Couldn't save that",
        e instanceof Error ? e.message : "Please try again.",
      );
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
          disabled={saving}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/calendar"))}
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
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/calendar"))}
          className="ml-auto px-4 py-3 active:opacity-70"
        >
          <Text className="text-ink text-base font-semibold">Cancel</Text>
        </Pressable>
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
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {(fontsLoaded || fontError) && (
            <Text
              className="text-[#241E38] text-center px-6"
              style={{
                fontFamily: fontsLoaded ? "CaveatRegular" : undefined,
                fontSize: 38,
                lineHeight: 48,
              }}
            >
              Log a check-in
            </Text>
          )}

          {/* Who */}
          <Text className="text-graphite/70 text-xs font-bold uppercase px-6 mt-6 mb-2">
            Who checked in
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
          >
            {members.map((member) => {
              const selected = member.id === selectedMemberId;
              return (
                <Pressable
                  key={member.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={member.name}
                  onPress={() => setSelectedMemberId(member.id)}
                  className="items-center active:opacity-80"
                  style={{ width: 60 }}
                >
                  <View
                    style={{
                      padding: selected ? 3 : 0,
                      borderRadius: 999,
                      borderWidth: selected ? 2 : 0,
                      borderColor: "#241E38",
                    }}
                  >
                    <MemberIdentifier color={member.color ?? GRAY_AVATAR} size={44} />
                  </View>
                  <Text
                    numberOfLines={1}
                    className={`text-xs mt-1 text-center ${selected ? "text-graphite font-bold" : "text-graphite/60"}`}
                  >
                    {member.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* When */}
          <Text className="text-graphite/70 text-xs font-bold uppercase px-6 mt-6 mb-2">
            When
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            ref={dateScroll}
            onContentSizeChange={() => {
              if (datePositioned.current) return;
              datePositioned.current = true;
              // Start with yesterday and today visible, while allowing scrolling back.
              dateScroll.current?.scrollTo({ x: (DAYS_BACK - 1) * 60, animated: false });
            }}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          >
            {days.map((day) => {
              const selected = sameDay(day, selectedDate);
              const todayChip = sameDay(day, today);
              return (
                <Pressable
                  key={dateKey(day)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  onPress={() => setSelectedDate(day)}
                  className={`items-center justify-center rounded-xl px-3 py-2 active:opacity-80 ${
                    selected ? "bg-ink" : "bg-white/50"
                  }`}
                  style={{ width: 52 }}
                >
                  <Text
                    className={`text-[10px] font-semibold ${selected ? "text-white/80" : "text-graphite/60"}`}
                  >
                    {todayChip
                      ? "Today"
                      : day.toLocaleDateString(undefined, { weekday: "short" })}
                  </Text>
                  <Text
                    className={`text-lg font-bold ${selected ? "text-white" : "text-graphite"}`}
                  >
                    {day.getDate()}
                  </Text>
                  <Text className={`text-[10px] ${selected ? "text-white/80" : "text-graphite/60"}`}>
                    {day.toLocaleDateString(undefined, { month: "short" })}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {isPremium && (
            <>
              <Text className="text-graphite/70 text-xs font-bold uppercase px-6 mt-6 mb-2">
                How (optional)
              </Text>
              <View className="flex-row px-6" style={{ gap: 10 }}>
                {KIND_OPTIONS.map((option) => {
                  const selected = kind === option;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setKind(selected ? null : option)}
                      className={`rounded-full px-4 py-2 active:opacity-80 ${
                        selected ? "bg-sunshine" : "bg-white/50"
                      }`}
                    >
                      <Text
                        className={`text-sm ${selected ? "text-graphite font-bold" : "text-graphite/70"}`}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View className="px-6 mt-4">
                {!notesOpen ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setNotesOpen(true)}
                    className="self-start active:opacity-70"
                  >
                    <Text className="text-ink text-sm font-semibold underline">
                      + Add a note
                    </Text>
                  </Pressable>
                ) : (
                  <View>
                    <TextInput
                      accessibilityLabel="Note"
                      value={noteText}
                      onChangeText={(t) => setNoteText(t.slice(0, NOTE_LIMIT))}
                      placeholder="A quick note (optional)"
                      placeholderTextColor="rgba(36, 36, 40, 0.4)"
                      multiline
                      autoFocus
                      className="w-full rounded-lg bg-white/70 px-4 py-3 text-sm text-graphite web:outline-none"
                      style={{ minHeight: 56 }}
                    />
                    <Text className="text-graphite/40 text-[11px] text-right mt-1">
                      {noteText.length}/{NOTE_LIMIT}
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Confirmation */}
          <View className="mx-6 mt-6 rounded-2xl bg-white/60 px-5 py-4">
            <Text className="text-graphite text-base text-center" style={{ lineHeight: 22 }}>
              {confirmationText}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={saving || !selectedPerson}
            onPress={handleConfirm}
            className="w-4/5 max-w-xs self-center items-center rounded-lg py-4 mt-6 bg-ink active:opacity-80"
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-lg font-semibold text-white">Confirm</Text>
            )}
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}
