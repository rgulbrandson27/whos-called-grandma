import { View } from "react-native";
import DaySquare from "./DaySquare";
import { buildMonthCells, chunkIntoWeeks } from "@/utils/calendarUtils";
import type { CalendarEvent, Member } from "@/data/fakeData";

type Props = {
  year: number;
  monthIndex: number;
  rowHeight: number;
  events: CalendarEvent[];
  members: Member[];
  onDayPress: (date: Date) => void;
};

export default function CalendarGrid({ year, monthIndex, rowHeight, events, members, onDayPress }: Props) {
  return (
    <View>
      {chunkIntoWeeks(buildMonthCells(year, monthIndex)).map((week, index) => (
        <View className="flex-row" style={{ height: rowHeight }} key={index}>
          {week.map((cell, column) => (
            <DaySquare
              key={cell.dateKey ?? `blank-${column}`}
              date={cell.day === null ? null : new Date(year, monthIndex, cell.day)}
              rowHeight={rowHeight}
              events={cell.dateKey ? events.filter((event) => event.date === cell.dateKey) : []}
              members={members}
              onPress={onDayPress}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
