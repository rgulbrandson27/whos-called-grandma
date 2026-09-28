import { useState } from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { CIRCLE_COLORS } from "@/constants/circle-colors";
import { darken, lighten } from "@/utils/color";

// A flower whose petals are the circle colors. One petal per entry in
// CIRCLE_COLORS, so adding or removing a color changes the flower on its own.
// Drawn in a 300 x 300 space, petals pointing up from the center (150, 150).
// Petals are shorter and wider than a "natural" petal on purpose: it keeps
// the gaps between them small and leaves room around the edge for the name
// labels at each tip.
const CENTER = 150;
const PETAL = "M150 150 C 111 137 109 92 150 59 C 191 92 189 137 150 150 Z";
const SHEEN = "M150 141 C 134 128 134 100 150 77 C 166 100 166 128 150 141 Z";
const VEIN = "M150 137 L150 88";
const SUNSHINE = "#F5D779";
// How far out the name labels sit from the center (petal tips end around 90).
const LABEL_RADIUS = 128;

export function ColorFlower({
  value,
  onChange,
  size = 300,
}: {
  value: string | null;
  onChange: (hex: string) => void;
  // Width and height of the flower itself (the color name sits below it).
  size?: number;
}) {
  const count = CIRCLE_COLORS.length;
  const petals = CIRCLE_COLORS.map((color, i) => ({ ...color, i, angle: (360 / count) * i }));
  const selectedIndex = petals.findIndex((p) => p.hex === value);
  // The chosen petal is drawn last so it sits on top of its neighbors.
  const drawOrder = [
    ...petals.filter((p) => p.i !== selectedIndex),
    ...petals.filter((p) => p.i === selectedIndex),
  ];
  const chosen = selectedIndex >= 0 ? petals[selectedIndex] : null;
  // Mouse only — there's no such thing as a finger "hovering". Harmless no-op
  // on touch, but a nice cue that a petal is clickable when tested on the web.
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const rotate = (angle: number) => `rotate(${angle} ${CENTER} ${CENTER})`;
  // Lifts a petal outward a little.
  const lift = (angle: number) =>
    `translate(${CENTER} ${CENTER}) scale(1.1) translate(${-CENTER} ${-CENTER}) ${rotate(angle)}`;

  // Screen readers can't tap individual petals, so the flower acts as a
  // slider: swipe up/down to move through the colors.
  const step = (delta: number) => {
    const next = ((selectedIndex < 0 ? (delta > 0 ? -1 : 0) : selectedIndex) + delta + count) % count;
    onChange(petals[next].hex);
  };

  return (
    <View className="items-center">
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Your color"
        accessibilityValue={{ text: chosen ? chosen.name : "Not chosen yet" }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => step(e.nativeEvent.actionName === "increment" ? 1 : -1)}
        style={{ width: size, height: size }}
      >
        {/* A little wider than the 300 x 300 petals themselves, so the labels
            (now sitting further out) have room without being clipped. */}
        <Svg width="100%" height="100%" viewBox="-15 -15 330 330">
          <Defs>
            <RadialGradient id="glow" cx={CENTER} cy={CENTER} r={150} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.75} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
            <LinearGradient id="sheen" x1="0.5" y1="1" x2="0.5" y2="0">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.45} />
            </LinearGradient>
            <RadialGradient id="center" cx={CENTER} cy={CENTER - 6} r={30} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={lighten(chosen?.hex ?? SUNSHINE, 0.45)} />
              <Stop offset="1" stopColor={chosen?.hex ?? SUNSHINE} />
            </RadialGradient>
            {petals.map((p) => (
              <LinearGradient key={p.i} id={`petal-${p.i}`} x1="0.5" y1="1" x2="0.5" y2="0">
                <Stop offset="0" stopColor={darken(p.hex, 0.2)} />
                <Stop offset="0.55" stopColor={p.hex} />
                <Stop offset="1" stopColor={lighten(p.hex, 0.3)} />
              </LinearGradient>
            ))}
          </Defs>

          {/* soft glow behind the flower */}
          <Circle cx={CENTER} cy={CENTER} r={150} fill="url(#glow)" />

          {/* drop shadows first, so every petal sits above all of them
              (drawn as offset, translucent copies: SVG blur isn't available) */}
          {petals.map((p) => (
            <G key={`shadow-${p.i}`}>
              <G transform="translate(0 9)">
                <Path d={PETAL} fill="rgba(36, 36, 40, 0.07)" transform={rotate(p.angle)} />
              </G>
              <G transform="translate(0 5)">
                <Path d={PETAL} fill="rgba(36, 36, 40, 0.13)" transform={rotate(p.angle)} />
              </G>
            </G>
          ))}

          {drawOrder.map((p) => {
            const selected = p.i === selectedIndex;
            const hovered = p.i === hoveredIndex && !selected;
            const transform = selected ? lift(p.angle) : rotate(p.angle);
            return (
              <G
                key={p.i}
                onPress={() => onChange(p.hex)}
                onMouseEnter={() => setHoveredIndex(p.i)}
                onMouseLeave={() => setHoveredIndex((h) => (h === p.i ? null : h))}
                style={{ cursor: "pointer" }}
              >
                {selected && (
                  <G transform="translate(0 8)">
                    <Path d={PETAL} fill="rgba(36, 36, 40, 0.25)" transform={transform} />
                  </G>
                )}
                <Path
                  d={PETAL}
                  fill={`url(#petal-${p.i})`}
                  stroke={selected ? "#FFFFFF" : "rgba(255, 255, 255, 0.35)"}
                  strokeWidth={selected ? 3 : 1.5}
                  strokeLinejoin="round"
                  transform={transform}
                />
                {hovered && (
                  <Path d={PETAL} fill="rgba(255, 255, 255, 0.3)" transform={transform} pointerEvents="none" />
                )}
                <Path d={SHEEN} fill="url(#sheen)" transform={transform} pointerEvents="none" />
                <Path
                  d={VEIN}
                  stroke="rgba(255, 255, 255, 0.35)"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  transform={transform}
                  pointerEvents="none"
                />
              </G>
            );
          })}

          {/* the chosen petal's name, centered on its tip (the others stay unlabeled) */}
          {chosen && (
            (() => {
              const angleRad = (chosen.angle * Math.PI) / 180;
              const x = CENTER + LABEL_RADIUS * Math.sin(angleRad);
              const y = CENTER - LABEL_RADIUS * Math.cos(angleRad);
              return (
                <SvgText
                  x={x}
                  y={y}
                  dy={4}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight="700"
                  fill="#242428"
                >
                  {chosen.name}
                </SvgText>
              );
            })()
          )}

          {/* the middle: shows the chosen color (yellow until one is picked) */}
          <Circle cx={CENTER} cy={CENTER + 4} r={35} fill="rgba(36, 36, 40, 0.18)" />
          <Circle cx={CENTER} cy={CENTER} r={33} fill="#FFFFFF" />
          <Circle cx={CENTER} cy={CENTER} r={25} fill="url(#center)" />
          <Path
            d="M138 151 L147 160 L163 142"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={4.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={chosen ? 1 : 0}
          />
        </Svg>
      </View>
    </View>
  );
}
