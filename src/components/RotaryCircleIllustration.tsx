import { View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import UserIcon from "react-native-heroicons/outline/UserIcon";

// A plain white-line drawing of a phone showing a rotary-dial wheel, one
// person per hole — the pun being the app's name. Static for now (no
// animation yet); built as real shapes rather than an imported picture so a
// later pass can rotate the ring / fade the people in individually.
const VIEW = 200; // width
const VIEW_H = 300; // height
const CENTER_X = VIEW / 2;
const CENTER_Y = 152;
const RING_RADIUS = 64;
const RING_THICKNESS = 13;
const HOLE_RADIUS = 17;
const HUB_RADIUS = 29;
const PEOPLE_COUNT = 7;
// The 8th slot (evenly spaced with the 7 people) is left empty — the
// rotary dial's finger stop goes there instead.
const SLOT_COUNT = PEOPLE_COUNT + 1;
const NOTCH_SLOT = 5; // which slot (0 = top, clockwise) is the notch

// A point at `radius` from the wheel's center, at `slot` out of SLOT_COUNT
// (slot 0 = straight up), going clockwise.
const pointAt = (slot: number, radius: number) => {
  const angle = ((360 / SLOT_COUNT) * slot - 90) * (Math.PI / 180);
  return { x: CENTER_X + radius * Math.cos(angle), y: CENTER_Y + radius * Math.sin(angle) };
};

export function RotaryCircleIllustration({ size = 220 }: { size?: number }) {
  // The ring is one long arc that stops short at the notch, rather than a
  // full circle — leaves an open gap the way a real dial's finger stop does.
  const gapWidth = 0.55; // fraction of a slot's angle left open at the notch
  const notchStart = pointAt(NOTCH_SLOT - 0.5 - gapWidth / 2, RING_RADIUS);
  const notchEnd = pointAt(NOTCH_SLOT - 0.5 + gapWidth / 2, RING_RADIUS);
  const ringPath = `M ${notchEnd.x} ${notchEnd.y} A ${RING_RADIUS} ${RING_RADIUS} 0 1 1 ${notchStart.x} ${notchStart.y}`;
  // The little stop tab jutting out past the ring at the open end.
  const tabInner = pointAt(NOTCH_SLOT - 0.5 - gapWidth / 2, RING_RADIUS - RING_THICKNESS / 2);
  const tabOuter = pointAt(NOTCH_SLOT - 0.5 - gapWidth / 2 - 0.18, RING_RADIUS + RING_THICKNESS * 1.6);

  return (
    <View style={{ width: size, height: (size * VIEW_H) / VIEW }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW} ${VIEW_H}`}>
        {/* the phone */}
        <Rect x={8} y={6} width={VIEW - 16} height={VIEW_H - 12} rx={32} fill="none" stroke="#FFFFFF" strokeWidth={6} />
        <Rect x={CENTER_X - 18} y={24} width={36} height={6} rx={3} fill="#FFFFFF" />
        <Rect x={CENTER_X - 22} y={VIEW_H - 32} width={44} height={8} rx={4} fill="#FFFFFF" />

        {/* the dial */}
        <Path d={ringPath} fill="none" stroke="#FFFFFF" strokeWidth={RING_THICKNESS} strokeLinecap="round" />
        <Path
          d={`M ${tabInner.x} ${tabInner.y} L ${tabOuter.x} ${tabOuter.y}`}
          stroke="#FFFFFF"
          strokeWidth={4}
          strokeLinecap="round"
        />
        <Circle cx={CENTER_X} cy={CENTER_Y} r={HUB_RADIUS} fill="none" stroke="#FFFFFF" strokeWidth={5} />

        {/* one hole per person, skipping the notch's slot */}
        {Array.from({ length: SLOT_COUNT }, (_, slot) => slot)
          .filter((slot) => slot !== NOTCH_SLOT)
          .map((slot) => {
            const { x, y } = pointAt(slot, RING_RADIUS);
            return (
              // fill matches the welcome screen's dark background, so the
              // white ring looks properly punched through at each hole
              <Circle key={slot} cx={x} cy={y} r={HOLE_RADIUS} fill="#241E38" stroke="#FFFFFF" strokeWidth={3.5} />
            );
          })}
      </Svg>
      {/* the person icons: plain RN elements laid on top, positioned in the
          same 0-VIEW coordinate space, scaled to the rendered pixel size */}
      {Array.from({ length: SLOT_COUNT }, (_, slot) => slot)
        .filter((slot) => slot !== NOTCH_SLOT)
        .map((slot) => {
          const { x, y } = pointAt(slot, RING_RADIUS);
          const scale = size / VIEW;
          const iconSize = HOLE_RADIUS * 1.15 * scale;
          return (
            <View
              key={slot}
              style={{
                position: "absolute",
                left: x * scale - iconSize / 2,
                top: y * scale - iconSize / 2,
              }}
            >
              <UserIcon size={iconSize} color="#FFFFFF" strokeWidth={1.8} />
            </View>
          );
        })}
    </View>
  );
}
