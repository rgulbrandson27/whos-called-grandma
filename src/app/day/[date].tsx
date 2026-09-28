import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MemberIdentifier from "@/components/MemberIdentifier";
import { getEvents } from "@/data/events";
import type { CalendarEvent, Member } from "@/data/fakeData";
import { getMembers } from "@/data/members";
import { useOnboardingStore } from "@/store/onboarding-store";

const GRAY_AVATAR = "#9AA5B1";

export default function DayDetailScreen() {
  const insets = useSafeAreaInsets();
  const { date } = useLocalSearchParams<{ date: string }>();
  const circleId = useOnboardingStore((state) => state.circleId);

  const [members, setMembers] = useState<Member[] | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!circleId) {
      setLoadError("No circle found for this device.");
      return;
    }
    Promise.all([getMembers(circleId), getEvents(circleId)])
      .then(([memberRows, eventRows]) => {
        setMembers(memberRows);
        setEvents(eventRows);
      })
      .catch((e) =>
        setLoadError(e instanceof Error ? e.message : "Couldn't load this day."),
      );
  }, [circleId]);

  const dayEvents = events.filter((e) => e.date === date);
  const friendlyDate = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <View
      className="flex-1 bg-country"
      style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom }}
    >
      <View className="flex-row items-center px-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
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
        <Text className="text-graphite text-lg font-bold ml-2" numberOfLines={1}>
          {friendlyDate}
        </Text>
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
          contentContainerStyle={{ padding: 20, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {dayEvents.length === 0 && (
            <Text className="text-graphite/60 text-sm text-center mt-10">
              No check-ins logged for this day yet.
            </Text>
          )}
          {dayEvents.map((event) => {
            const member = members.find((m) => m.id === event.memberId);
            const note = event.noteCustom || event.notePreset;
            return (
              <View
                key={event.id}
                className="rounded-2xl bg-white/60 px-4 py-3"
              >
                <View className="flex-row items-center">
                  <MemberIdentifier color={member?.color ?? GRAY_AVATAR} size={40} />
                  <View className="flex-1 ml-3">
                    <Text className="text-graphite text-base font-bold" numberOfLines={1}>
                      {member?.name ?? "Someone"}
                    </Text>
                    <Text className="text-graphite/60 text-xs">
                      {event.status === "planned" ? "Planned" : "Checked in"}
                      {event.kind ? ` · ${event.kind}` : ""}
                    </Text>
                  </View>
                </View>
                {note && (
                  <Text className="text-graphite/80 text-sm mt-3" style={{ lineHeight: 20 }}>
                    {note}
                  </Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
