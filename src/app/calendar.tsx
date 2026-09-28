import { useEffect, useMemo, useRef, useState } from "react";
import { useFonts } from "expo-font";
import { ActivityIndicator, FlatList, PanResponder, Platform, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import CalendarGrid from "@/components/Calendar/CalendarGrid";
import MonthLabel from "@/components/Calendar/MonthLabel";
import WeekdayHeader, { WEEKDAY_HEADER_HEIGHT } from "@/components/Calendar/WeekdayHeader";
import type { PlanTier } from "@/constants/plans";
import { getCircleSummary } from "@/data/circles";
import { getEvents } from "@/data/events";
import type { CalendarEvent, Member } from "@/data/fakeData";
import { getMembers } from "@/data/members";
import { useOnboardingStore } from "@/store/onboarding-store";
import { buildMonthCells, formatDateKey } from "@/utils/calendarUtils";
import { possessive } from "@/utils/text";

// Basic can browse a month either side of today; Premium gets a full year.
const monthRangeForTier = (tier: PlanTier) => (tier === "premium" ? 12 : 1);
const VISIBLE_WEEKS = 5;
const DIVIDER_HEIGHT = 48; // Extra breathing room above and below month labels.
const SIDE_MARGIN = 10;

type MonthItem = { key: string; year: number; monthIndex: number; height: number; offset: number };

function CalendarWindow({
  rowHeight,
  pastMonths,
  futureMonths,
  events,
  members,
}: {
  rowHeight: number;
  pastMonths: number;
  futureMonths: number;
  events: CalendarEvent[];
  members: Member[];
}) {
  const list = useRef<FlatList<MonthItem>>(null);
  const [today] = useState(() => new Date());
  const positioned = useRef(false);
  const months = useMemo(() => {
    let offset = 0;
    return Array.from({ length: pastMonths + futureMonths + 1 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() + index - pastMonths, 1);
      const year = date.getFullYear();
      const monthIndex = date.getMonth();
      const height = buildMonthCells(year, monthIndex).length / 7 * rowHeight + DIVIDER_HEIGHT;
      const item = { key: `${year}-${monthIndex}`, year, monthIndex, height, offset };
      offset += height;
      return item;
    });
  }, [rowHeight, today, pastMonths, futureMonths]);
  const viewportHeight = rowHeight * VISIBLE_WEEKS + DIVIDER_HEIGHT;
  const lastMonth = months[months.length - 1];
  const maxOffset = lastMonth.offset + lastMonth.height - viewportHeight;
  const currentMonth = months[pastMonths];
  const todayWeek = Math.floor((new Date(currentMonth.year, currentMonth.monthIndex, 1).getDay() + today.getDate() - 1) / 7);
  // Center the actual row, including the space taken by month dividers.
  const initialOffset = Math.max(0, Math.min(maxOffset,
    currentMonth.offset + DIVIDER_HEIGHT + (todayWeek + 0.5) * rowHeight - viewportHeight / 2,
  ));
  const offset = useRef(initialOffset);
  const dragStart = useRef(0);
  const moveTo = (y: number) => {
    offset.current = Math.max(0, Math.min(maxOffset, y));
    list.current?.scrollToOffset({ offset: offset.current, animated: false });
  };
  // Direct dragging deliberately has no release animation or momentum.
  const pan = PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderGrant: () => { dragStart.current = offset.current; },
    onPanResponderMove: (_, gesture) => moveTo(dragStart.current - gesture.dy),
  });

  return (
    <View style={{ width: rowHeight * 7 }}>
      <WeekdayHeader />
      <View {...pan.panHandlers} style={{ height: viewportHeight, overflow: "hidden" }}>
        <FlatList
          ref={list}
          data={months}
          keyExtractor={(item) => item.key}
          contentOffset={{ x: 0, y: initialOffset }}
          onContentSizeChange={() => {
            if (!positioned.current) {
              positioned.current = true;
              moveTo(initialOffset);
            }
          }}
          getItemLayout={(_, index) => ({ length: months[index].height, offset: months[index].offset, index })}
          initialNumToRender={5}
          windowSize={5}
          scrollEnabled={Platform.OS === "web"}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          scrollEventThrottle={16}
          onScroll={Platform.OS === "web" ? (event) => { offset.current = event.nativeEvent.contentOffset.y; } : undefined}
          accessibilityActions={[{ name: "increment", label: "Later weeks" }, { name: "decrement", label: "Earlier weeks" }]}
          onAccessibilityAction={({ nativeEvent }) => {
            moveTo(offset.current + (nativeEvent.actionName === "increment" ? rowHeight : -rowHeight));
          }}
          renderItem={({ item }) => (
            <View style={{ height: item.height }}>
              <View className="justify-center" style={{ height: DIVIDER_HEIGHT }}>
                <MonthLabel monthIndex={item.monthIndex} year={item.year} />
              </View>
              <CalendarGrid
                  year={item.year} monthIndex={item.monthIndex} rowHeight={rowHeight}
                  events={events} members={members}
                  onDayPress={(date) => router.push({ pathname: "/day/[date]", params: { date: formatDateKey(date.getFullYear(), date.getMonth(), date.getDate()) } })}
              />
            </View>
          )}
        />
        {/* Fixed edge shadows define the window without intercepting touches. */}
        <View pointerEvents="none" style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          backgroundColor: "rgba(41, 72, 110, 0.3)",
          boxShadow: "0px 3px 5px 1px rgba(41, 72, 110, 0.25)",
        }} />
        <View pointerEvents="none" style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
          backgroundColor: "rgba(41, 72, 110, 0.3)",
          boxShadow: "0px -3px 5px 1px rgba(41, 72, 110, 0.25)",
        }} />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const circleId = useOnboardingStore((state) => state.circleId);

  const [members, setMembers] = useState<Member[] | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tier, setTier] = useState<PlanTier>("basic");
  const [lovedOneName, setLovedOneName] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!circleId) {
      setLoadError("No circle found for this device.");
      return;
    }
    Promise.all([getCircleSummary(circleId), getMembers(circleId), getEvents(circleId)])
      .then(([summary, memberRows, eventRows]) => {
        setTier(summary.plan.split("_")[0] as PlanTier);
        setLovedOneName(summary.lovedOneName);
        setMembers(memberRows);
        setEvents(eventRows);
      })
      .catch((e) =>
        setLoadError(e instanceof Error ? e.message : "Couldn't load your circle."),
      );
  }, [circleId]);

  const [fontsLoaded, fontError] = useFonts({
    CaveatRegular: require("../../assets/fonts/Caveat-Regular.ttf"),
  });

  const usableHeight = height - insets.top - insets.bottom;
  // Use the available width for larger squares. On short screens, preserve
  // the header space and at least 100 pixels for the Add Contact area.
  const rowHeight = Math.max(1, Math.min(
    (width - SIDE_MARGIN * 2) / 7,
    (usableHeight * 0.8 - 100 - WEEKDAY_HEADER_HEIGHT - DIVIDER_HEIGHT) / VISIBLE_WEEKS,
  ));
  const monthRange = monthRangeForTier(tier);

  return (
    <View className="flex-1 bg-country" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Settings"
        onPress={() => router.push("/settings")}
        className="absolute items-center justify-center active:opacity-70"
        style={{ top: insets.top + 8, right: 16, width: 44, height: 44, zIndex: 1 }}
      >
        <Svg width={24} height={24} viewBox="0 0 24 24" accessible={false}>
          <Circle cx={12} cy={12} r={3} fill="none" stroke="#29486E" strokeWidth={2} />
          <Path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
            fill="none"
            stroke="#29486E"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>

      {loadError && (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-graphite/70 text-center text-sm">{loadError}</Text>
        </View>
      )}

      {!members && !loadError && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#29486E" />
        </View>
      )}

      {members && (
        <>
          <View style={{ height: usableHeight * 0.12 }} />
          {(fontsLoaded || fontError) && (
            <Text
              className="text-[#241E38] text-center px-8"
              style={{
                fontFamily: fontsLoaded ? "CaveatRegular" : undefined,
                fontSize: 30,
                lineHeight: 38,
              }}
            >
              {lovedOneName
                ? `Keeping ${possessive(lovedOneName)} circle close.`
                : "Keeping your circle close."}
            </Text>
          )}
          <View className="items-center" style={{ marginTop: usableHeight * 0.03 }}>
            <CalendarWindow
              key={`${rowHeight}-${monthRange}`}
              rowHeight={rowHeight}
              pastMonths={monthRange}
              futureMonths={monthRange}
              events={events}
              members={members}
            />
          </View>
          <View className="flex-1 items-center justify-center">
            <Pressable accessibilityRole="button" onPress={() => router.push("/add_event")}
              className="bg-sunshine rounded-lg px-10 py-4 active:opacity-80"
              style={{ boxShadow: "0px 2px 4px rgba(41, 72, 110, 0.18)" }}>
              <Text className="text-graphite text-lg font-semibold">Add Contact</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}
