import { View, Text } from "react-native";
import { WEEKDAY_SHORT } from "@/utils/calendarUtils";

export const WEEKDAY_HEADER_HEIGHT = 42;

export default function WeekdayHeader({ weekStart = "sunday" }: { weekStart?: "sunday" | "monday" }) {
  const labels = weekStart === "monday" ? [...WEEKDAY_SHORT.slice(1), WEEKDAY_SHORT[0]] : WEEKDAY_SHORT;
  return (
    <View style={{ height: WEEKDAY_HEADER_HEIGHT, paddingBottom: 8, zIndex: 1 }}>
      <View
        className="flex-1 flex-row items-center rounded-lg bg-white"
        style={{
          boxShadow: "0px 6px 12px rgba(65, 65, 65, 0.24), 0px 2px 3px rgba(65, 65, 65, 0.16)",
        }}
      >
      {labels.map((label, i) => (
        <Text key={i} className="flex-1 text-center text-base font-bold text-graphite">{label}</Text>
      ))}
      </View>
    </View>
  );
}
