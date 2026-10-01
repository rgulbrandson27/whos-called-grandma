import { useFonts } from "expo-font";
import { Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable } from "react-native";
import CalendarGrid from "@/components/Calendar/CalendarGrid";
import MonthLabel from "@/components/Calendar/MonthLabel";
import WeekdayHeader, { WEEKDAY_HEADER_HEIGHT } from "@/components/Calendar/WeekdayHeader";
import type { CalendarEvent, Member } from "@/data/fakeData";
import { formatDateKey } from "@/utils/calendarUtils";

// TEMP: for screenshots only. Four fake people, a handful of check-ins
// scattered across the current month. Safe to delete any time.
const SIDE_MARGIN = 10;
const VISIBLE_ROWS = 6;
const DIVIDER_HEIGHT = 48;

const today = new Date();
const YEAR = today.getFullYear();
const MONTH = today.getMonth();
const day = (d: number) => formatDateKey(YEAR, MONTH, d);

const FAKE_MEMBERS: Member[] = [
  { id: "s1", circleId: "sample", userId: null, name: "Raina", phone: null, color: "#FF6B6B", shape: "circle", role: "owner", inviteStatus: "accepted", invitedAt: "", acceptedAt: "" },
  { id: "s2", circleId: "sample", userId: null, name: "Mom", phone: null, color: "#5B9BD5", shape: "circle", role: "member", inviteStatus: "accepted", invitedAt: "", acceptedAt: "" },
  { id: "s3", circleId: "sample", userId: null, name: "Uncle Bob", phone: null, color: "#6BAA75", shape: "circle", role: "member", inviteStatus: "accepted", invitedAt: "", acceptedAt: "" },
  { id: "s4", circleId: "sample", userId: null, name: "Jess", phone: null, color: "#9B72AA", shape: "circle", role: "member", inviteStatus: "accepted", invitedAt: "", acceptedAt: "" },
];

const FAKE_EVENTS: CalendarEvent[] = [
  { id: "se1", circleId: "sample", memberId: "s1", date: day(2), status: "done", kind: "Visit", notePreset: null, noteCustom: "Brought lunch and did a puzzle" },
  { id: "se2", circleId: "sample", memberId: "s2", date: day(5), status: "done", kind: "Call", notePreset: null, noteCustom: null },
  { id: "se3", circleId: "sample", memberId: "s3", date: day(5), status: "done", kind: "Call", notePreset: null, noteCustom: null },
  { id: "se4", circleId: "sample", memberId: "s4", date: day(8), status: "planned", kind: null, notePreset: null, noteCustom: null },
  { id: "se5", circleId: "sample", memberId: "s1", date: day(11), status: "done", kind: "Visit", notePreset: null, noteCustom: null },
  { id: "se6", circleId: "sample", memberId: "s2", date: day(11), status: "done", kind: "Call", notePreset: null, noteCustom: null },
  { id: "se7", circleId: "sample", memberId: "s3", date: day(11), status: "planned", kind: null, notePreset: null, noteCustom: null },
  { id: "se8", circleId: "sample", memberId: "s4", date: day(11), status: "done", kind: "Other", notePreset: null, noteCustom: "Sent flowers" },
  { id: "se9", circleId: "sample", memberId: "s1", date: day(15), status: "planned", kind: null, notePreset: null, noteCustom: null },
  { id: "se10", circleId: "sample", memberId: "s2", date: day(18), status: "done", kind: "Visit", notePreset: null, noteCustom: "Took her to the doctor" },
  { id: "se11", circleId: "sample", memberId: "s3", date: day(21), status: "done", kind: "Call", notePreset: null, noteCustom: null },
  { id: "se12", circleId: "sample", memberId: "s4", date: day(21), status: "planned", kind: null, notePreset: null, noteCustom: null },
  { id: "se13", circleId: "sample", memberId: "s1", date: day(24), status: "done", kind: "Visit", notePreset: null, noteCustom: null },
  { id: "se14", circleId: "sample", memberId: "s2", date: day(27), status: "planned", kind: null, notePreset: null, noteCustom: null },
];

export default function SampleCalendarScreen() {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const usableHeight = height - insets.top - insets.bottom;

  const rowHeight = Math.max(1, Math.min(
    (width - SIDE_MARGIN * 2) / 7,
    (usableHeight * 0.8 - 100 - WEEKDAY_HEADER_HEIGHT - DIVIDER_HEIGHT) / VISIBLE_ROWS,
  ));

  const [fontsLoaded, fontError] = useFonts({
    CaveatRegular: require("../../assets/fonts/Caveat-Regular.ttf"),
  });

  return (
    <View className="flex-1 bg-country" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={{ height: usableHeight * 0.12 }} />
      {(fontsLoaded || fontError) && (
        <Text
          className="text-[#241E38] text-center px-8"
          style={{ fontFamily: fontsLoaded ? "CaveatRegular" : undefined, fontSize: 30, lineHeight: 38 }}
        >
          Keeping Grandma&apos;s circle close.
        </Text>
      )}
      <View className="items-center" style={{ marginTop: usableHeight * 0.03 }}>
        <View style={{ width: rowHeight * 7 }}>
          <WeekdayHeader />
          <View className="justify-center" style={{ height: DIVIDER_HEIGHT }}>
            <MonthLabel monthIndex={MONTH} year={YEAR} />
          </View>
          <CalendarGrid
            year={YEAR}
            monthIndex={MONTH}
            rowHeight={rowHeight}
            events={FAKE_EVENTS}
            members={FAKE_MEMBERS}
            onDayPress={() => {}}
          />
        </View>
      </View>
      <View className="flex-1 items-center justify-center">
        <Pressable
          accessibilityRole="button"
          onPress={() => {}}
          className="bg-sunshine rounded-lg px-10 py-4 active:opacity-80"
          style={{ boxShadow: "0px 2px 4px rgba(41, 72, 110, 0.18)" }}
        >
          <Text className="text-graphite text-lg font-semibold">Add Contact</Text>
        </Pressable>
      </View>
    </View>
  );
}
