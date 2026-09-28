import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import MemberIdentifier from "@/components/MemberIdentifier";
import type { CalendarEvent, Member } from "@/data/fakeData";
import { isToday } from "@/utils/calendarUtils";

type Props = {
  date: Date | null;
  rowHeight: number;
  events: CalendarEvent[];
  members: Member[];
  onPress: (date: Date) => void;
};

// How many overlapping avatars a cell shows before switching to a "+N" badge.
const MAX_AVATARS = 3;

export default function DaySquare({ date, rowHeight, events, members, onPress }: Props) {
  const lastTap = useRef(0);
  const [pressed, setPressed] = useState(false);
  if (!date) return <View className="flex-1 m-1" />;
  const today = isToday(date.getFullYear(), date.getMonth(), date.getDate());

  // One entry per member who has an event that day — "done" wins over
  // "planned" if someone somehow has both logged for the same day.
  const contacts = members
    .map((member) => {
      const memberEvents = events.filter((event) => event.memberId === member.id);
      if (memberEvents.length === 0) return null;
      const done = memberEvents.some((event) => event.status === "done");
      return { member, done };
    })
    .filter((c): c is { member: Member; done: boolean } => c !== null);
  const hasNote = events.some((event) => event.noteCustom || event.notePreset);

  const openDay = () => {
    lastTap.current = 0;
    setPressed(false);
    onPress(date);
  };

  const avatarSize = Math.max(10, rowHeight * 0.42);
  const overlap = avatarSize * 0.6;
  const visible = contacts.slice(0, MAX_AVATARS);
  const extra = contacts.length - visible.length;
  const stackWidth = visible.length > 0 ? avatarSize + (visible.length - 1) * overlap : 0;

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
      <View className="flex-row items-start justify-between px-1 pt-0.5">
        <Text className="text-graphite text-[10px]">{date.getDate()}</Text>
        {hasNote && (
          <View
            style={{ width: 5, height: 5, borderRadius: 3 }}
            className="bg-sunshine mt-0.5"
          />
        )}
      </View>
      <View className="flex-1 items-center justify-center pb-1">
        {visible.length > 0 && (
          <View style={{ width: stackWidth, height: avatarSize }}>
            {visible.map((contact, i) => (
              <View
                key={contact.member.id}
                style={{
                  position: "absolute",
                  left: i * overlap,
                  opacity: contact.done ? 1 : 0.5,
                }}
              >
                <MemberIdentifier color={contact.member.color} size={avatarSize} />
              </View>
            ))}
          </View>
        )}
        {extra > 0 && (
          <Text className="text-[9px] text-graphite mt-0.5">+{extra}</Text>
        )}
      </View>
    </Pressable>
  );
}
