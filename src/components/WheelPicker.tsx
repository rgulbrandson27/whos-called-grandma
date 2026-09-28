import { useEffect, useRef } from "react";
import { Animated, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, ScrollView, Text, View } from "react-native";

export const WHEEL_ITEM_HEIGHT = 56;
// The wheel shows 3 rows (one above and one below the middle one), but the
// scrollable area extends EXTRA_ROWS further above and below, empty, so a drag
// can start in the blank space too — easier for big fingers.
const EXTRA_ROWS = 1;
const TOUCH_ROWS = 3 + EXTRA_ROWS * 2;
const CENTER_TOP = (EXTRA_ROWS + 1) * WHEEL_ITEM_HEIGHT;
// How close to dead-center (in rows) a row must be to show inside the band.
// Smaller = it appears only right at the middle.
const FOCUS_RANGE = 0.25;

type WheelPickerProps = {
  items: string[];
  index: number;
  onChange: (index: number) => void;
  width: number;
  // false = nothing chosen yet; the wheel is shown faded until the user scrolls it.
  active?: boolean;
  accessibilityLabel?: string;
  textColor?: string;
};

// A vertical snap-to-item scroller (iOS-style wheel) built on ScrollView so it
// behaves the same on iOS, Android and web without a native picker dependency.
// The selection follows the scroll position live (whichever row is in the
// middle), and tapping a row scrolls it to the middle.
export function WheelPicker({ items, index, onChange, width, active = true, accessibilityLabel, textColor = "#242428" }: WheelPickerProps) {
  const scrollRef = useRef<ScrollView>(null);
  // The index the scroll position currently represents. Lets us tell a change
  // caused by the user's finger (already on screen) from one the parent made
  // (e.g. the day wheel clamping when the month changes) that needs a scroll.
  const shownIndex = useRef(index);
  // Live scroll offset, used to slide the "in focus" label with the wheel.
  const scrollY = useRef(new Animated.Value(index * WHEEL_ITEM_HEIGHT)).current;
  // Fixed at mount: contentOffset is only meant for the starting position.
  const startOffset = useRef({ x: 0, y: index * WHEEL_ITEM_HEIGHT }).current;

  // Scroll to the starting row once the list has been laid out. Scrolling any
  // earlier is ignored (there's nothing to scroll yet), which left a wheel that
  // opened on a saved date sitting at the top while its rows were faded as if it
  // were somewhere else: the light rows above the middle went missing.
  const positioned = useRef(false);
  const handleContentSizeChange = () => {
    if (positioned.current) return;
    positioned.current = true;
    shownIndex.current = index;
    scrollY.setValue(index * WHEEL_ITEM_HEIGHT);
    scrollRef.current?.scrollTo({ y: index * WHEEL_ITEM_HEIGHT, animated: false });
  };

  useEffect(() => {
    if (index !== shownIndex.current) {
      shownIndex.current = index;
      scrollY.setValue(index * WHEEL_ITEM_HEIGHT);
      scrollRef.current?.scrollTo({ y: index * WHEEL_ITEM_HEIGHT, animated: false });
    }
  }, [index, items.length]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    // On web the animated event mapping doesn't update reliably, so feed the
    // scroll position in by hand there (native uses the event mapping instead).
    if (Platform.OS === "web") scrollY.setValue(e.nativeEvent.contentOffset.y);
    const raw = Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT);
    const next = Math.min(items.length - 1, Math.max(0, raw));
    if (next !== shownIndex.current) {
      shownIndex.current = next;
      onChange(next);
    }
  };

  const selectRow = (i: number) => {
    scrollRef.current?.scrollTo({ y: i * WHEEL_ITEM_HEIGHT, animated: true });
    // Also covers tapping the row that's already centered while the wheel is
    // still faded: no scroll happens, so no scroll event would mark it chosen.
    if (!active) onChange(i);
  };

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
      style={{ width, height: WHEEL_ITEM_HEIGHT * TOUCH_ROWS }}
    >
      <Animated.ScrollView
        ref={scrollRef}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          // The native animation driver doesn't exist on web.
          useNativeDriver: Platform.OS !== "web",
          listener: handleScroll,
        })}
        contentOffset={startOffset}
        onContentSizeChange={handleContentSizeChange}
        contentContainerStyle={{ paddingVertical: CENTER_TOP }}
      >
        {items.map((label, i) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => selectRow(i)}
            style={{ height: WHEEL_ITEM_HEIGHT }}
            className="items-center justify-center"
          >
            <Animated.Text
              style={{
                // NativeWind classes don't apply to Animated components, so the
                // look is set here directly (same as text-graphite text-3xl font-semibold).
                color: textColor,
                fontSize: 30,
                lineHeight: 36,
                fontWeight: "600",
                // Rows more than one row from the middle fade out completely,
                // so the extra touch area above and below stays blank.
                opacity: scrollY.interpolate({
                  inputRange: [
                    (i - 1.5) * WHEEL_ITEM_HEIGHT,
                    (i - 1) * WHEEL_ITEM_HEIGHT,
                    (i + 1) * WHEEL_ITEM_HEIGHT,
                    (i + 1.5) * WHEEL_ITEM_HEIGHT,
                  ],
                  outputRange: [0, active ? 0.4 : 0.3, active ? 0.4 : 0.3, 0],
                  extrapolate: "clamp",
                }),
              }}
            >
              {label}
            </Animated.Text>
          </Pressable>
        ))}
      </Animated.ScrollView>
      {/* The white band is solid and sits on top of the list, so rows sliding
          into it disappear underneath... */}
      <View
        pointerEvents="none"
        className="absolute left-0 right-0 rounded-lg bg-white"
        style={{ top: CENTER_TOP, height: WHEEL_ITEM_HEIGHT }}
      />
      {/* ...and come back into focus as they reach the middle: this copy of the
          nearest row slides with the scroll and fades in as it centers. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          alignItems: "center",
          justifyContent: "center",
          top: CENTER_TOP,
          height: WHEEL_ITEM_HEIGHT,
          opacity: scrollY.interpolate({
            inputRange: [
              (index - FOCUS_RANGE) * WHEEL_ITEM_HEIGHT,
              index * WHEEL_ITEM_HEIGHT,
              (index + FOCUS_RANGE) * WHEEL_ITEM_HEIGHT,
            ],
            outputRange: [0, active ? 1 : 0.35, 0],
            extrapolate: "clamp",
          }),
          transform: [
            {
              translateY: scrollY.interpolate({
                inputRange: [0, 1],
                outputRange: [index * WHEEL_ITEM_HEIGHT, index * WHEEL_ITEM_HEIGHT - 1],
              }),
            },
          ],
        }}
      >
        <Text style={{ color: textColor, fontSize: 30, lineHeight: 36, fontWeight: "600" }}>{items[index]}</Text>
      </Animated.View>
    </View>
  );
}
