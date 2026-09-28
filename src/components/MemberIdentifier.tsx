import { View } from "react-native";
import UserIcon from "react-native-heroicons/solid/UserIcon";

// A circle member's marker: a colored circle with a person icon on top.
// Same everywhere a member shows up — invite cards, the member list, the
// welcome screen's animated wheel — so it only needs updating in one place.
export default function MemberIdentifier({
  color,
  size = 10,
}: {
  color: string;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* the glyph's own visual weight sits a little high in its box; nudge
          it down for better optical centering in the circle */}
      <UserIcon size={size * 0.58} color="#FFFFFF" style={{ transform: [{ translateY: size * 0.03 }] }} />
    </View>
  );
}
