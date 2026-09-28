import { View, Text } from "react-native";

type Props = { monthIndex: number; year: number };

export default function MonthLabel({ monthIndex, year }: Props) {
  const label = new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  return (
    <View className="flex-row items-center px-1 gap-3" accessible accessibilityLabel={label}>
      <View className="flex-1 bg-ink/30" style={{ height: 1 }} />
      <Text className="text-graphite text-sm font-semibold">{label}</Text>
      <View className="flex-1 bg-ink/30" style={{ height: 1 }} />
    </View>
  );
}
