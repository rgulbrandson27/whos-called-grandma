import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import MemberIdentifier from "@/components/MemberIdentifier";
import { CIRCLE_COLORS } from "@/constants/circle-colors";

// How many of the palette's colors show as people on the wheel.
const PEOPLE_COUNT = 6;
const DOT_SIZE = 34;

// The welcome screen's centerpiece: a ring with a colored person on it for
// each member of the circle. On mount they pop in one at a time, then the
// whole wheel — people included — turns slowly, forever, like a little
// carousel: meant to read as "your circle, always checking in."
export function CircleWheel({ size = 220 }: { size?: number }) {
  const radius = (size - DOT_SIZE) / 2;
  const people = CIRCLE_COLORS.slice(0, PEOPLE_COUNT);

  const scales = useRef(people.map(() => new Animated.Value(0))).current;
  const spin = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((enabled) => {
        if (cancelled) return;
        setReduceMotion(enabled);
        if (enabled) {
          scales.forEach((s) => s.setValue(1));
          return;
        }
        // Each person pops in a beat after the last one, then the whole
        // wheel starts its slow, endless turn.
        Animated.stagger(
          160,
          scales.map((s) =>
            Animated.spring(s, { toValue: 1, friction: 5, useNativeDriver: true }),
          ),
        ).start(() => {
          Animated.loop(
            Animated.timing(spin, {
              toValue: 1,
              duration: 26000,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
          ).start();
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View
      accessible
      accessibilityLabel="Your circle, checking in"
      style={{ width: size, height: size }}
    >
      {/* the dashed ring the people sit on */}
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(237, 231, 249, 0.35)"
          strokeWidth={2}
          strokeDasharray="2 10"
          strokeLinecap="round"
        />
      </Svg>
      {/* the people — this whole layer turns together, like a carousel */}
      <Animated.View
        style={{ width: size, height: size, transform: reduceMotion ? undefined : [{ rotate }] }}
      >
        {people.map((person, i) => {
          const angle = (360 / people.length) * i - 90; // start at the top
          const rad = (angle * Math.PI) / 180;
          const x = size / 2 + radius * Math.cos(rad) - DOT_SIZE / 2;
          const y = size / 2 + radius * Math.sin(rad) - DOT_SIZE / 2;
          return (
            <Animated.View
              key={person.hex}
              style={{ position: "absolute", left: x, top: y, transform: [{ scale: scales[i] }] }}
            >
              <MemberIdentifier color={person.hex} size={DOT_SIZE} />
            </Animated.View>
          );
        })}
      </Animated.View>
    </View>
  );
}
