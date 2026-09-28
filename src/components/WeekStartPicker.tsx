import { Pressable, View } from "react-native";
import Svg, { Path, Rect, Text as SvgText } from "react-native-svg";
import type { WeekStart } from "@/store/onboarding-store";

// A plain calendar shape (no dots, no weekday letters) with its own label
// drawn right inside the body, so the text is always dead center under the
// icon regardless of how wide the label is. Drawn on a 100 x 100 grid.
const SIZE = 108;
const GRAY = "rgba(36, 36, 40, 0.45)";
// One color for whichever side is picked — it trades between Sunday and
// Monday as you tap, rather than each side having its own fixed color.
const ACTIVE = "#29486E";
// Shared lavender background for the entire calendar choice container.
const CONTAINER_FILL = "#D9CCEF";

function CalendarBadge({
  lines,
  selected,
  onPress,
  accessibilityLabel,
}: {
  lines: [string, string];
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const color = selected ? ACTIVE : GRAY;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className="items-center justify-center rounded-2xl active:opacity-70"
      style={{
        paddingVertical: 10,
        paddingHorizontal: 6,
      }}
    >
      <Svg width={SIZE} height={SIZE} viewBox="0 0 100 100">
        {/* the two binding tabs */}
        <Path d="M32 8v18M68 8v18" stroke={color} strokeWidth={selected ? 5 : 2.5} strokeLinecap="round" />
        {/* the body */}
        <Rect
          x={8}
          y={20}
          width={84}
          height={72}
          rx={12}
          fill="none"
          stroke={color}
          strokeWidth={selected ? 5 : 2.5}
        />
        {/* the header strip divider */}
        <Path d="M8 38h84" stroke={color} strokeWidth={selected ? 5 : 2.5} />
        {/* the label, centered inside the body */}
        <SvgText x={50} y={62} textAnchor="middle" fontSize={15} fontWeight={selected ? "700" : "500"} fill={color}>
          {lines[0]}
        </SvgText>
        <SvgText x={50} y={80} textAnchor="middle" fontSize={15} fontWeight={selected ? "700" : "500"} fill={color}>
          {lines[1]}
        </SvgText>
      </Svg>
    </Pressable>
  );
}

// Two identical calendar badges side by side, Sunday start (the default) and
// Monday start — whichever is picked gets the one active color.
export function WeekStartPicker({
  value,
  onChange,
}: {
  value: WeekStart;
  onChange: (value: WeekStart) => void;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      className="mt-2 mb-8 rounded-2xl px-4 py-4"
      style={{ backgroundColor: CONTAINER_FILL, borderWidth: 1.5, borderColor: "rgba(36, 36, 40, 0.3)" }}
    >
      <View className="flex-row items-center justify-center" style={{ gap: 24 }}>
        <CalendarBadge
          lines={["Sunday", "Start"]}
          selected={value === "sunday"}
          onPress={() => onChange("sunday")}
          accessibilityLabel="Sunday start"
        />
        <CalendarBadge
          lines={["Monday", "Start"]}
          selected={value === "monday"}
          onPress={() => onChange("monday")}
          accessibilityLabel="Monday start"
        />
      </View>
    </View>
  );
}
