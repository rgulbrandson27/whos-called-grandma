import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { CalendarEvent, Member } from "@/data/fakeData";
import { isToday } from "@/utils/calendarUtils";

type Props = {
  date: Date | null;
  events: CalendarEvent[];
  members: Member[];
  onPress: (date: Date) => void;
};

export default function DaySquare({ date, events, members, onPress }: Props) {
  const lastTap = useRef(0);
  const [pressed, setPressed] = useState(false);
  if (!date) return <View className="flex-1 m-1" />;
  const today = isToday(date.getFullYear(), date.getMonth(), date.getDate());
  const contacts = members.filter((member) =>
    events.some((event) => event.memberId === member.id),
  );
  const openDay = () => {
    lastTap.current = 0;
    setPressed(false);
    onPress(date);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${date.toLocaleDateString(undefined, { dateStyle: "full" })}, ${contacts.length} family contacts${today ? ", today" : ""}`}
      accessibilityHint="Long press or double tap to open this day"
      accessibilityActions={[{ name: "activate", label: "Open day" }]}
      onAccessibilityAction={openDay}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      delayLongPress={450}
      onLongPress={openDay}
      onPress={() => {
        const now = Date.now();
        if (lastTap.current && now - lastTap.current < 300) openDay();
        else lastTap.current = now;
      }}
      className={`flex-1 m-1 rounded-md bg-tile border ${today ? "border-ink" : "border-ink/20"}`}
      style={{
        transform: [{ scale: pressed ? 1.2 : 1 }],
        zIndex: pressed ? 1 : 0,
        ...(pressed ? { borderColor: "#29486E" } : {}),
        boxShadow: pressed
          ? "0px 3px 6px rgba(41, 72, 110, 0.28)"
          : "0px 1px 2px rgba(41, 72, 110, 0.16)",
      }}
    >
      <Text className="text-graphite text-[10px] ml-1 mt-0.5">{date.getDate()}</Text>
      <View className="flex-1 flex-row flex-wrap items-center justify-center gap-1 px-1 pb-1">
        {contacts.slice(0, 4).map((member) => (
          <View
            key={member.id}
            style={{
              backgroundColor: member.color,
              width: 7,
              height: 7,
              borderRadius: 4,
            }}
          />
        ))}
        {contacts.length > 4 && (
          <Text className="text-[9px] text-graphite">+{contacts.length - 4}</Text>
        )}
      </View>
    </Pressable>
  );
}
