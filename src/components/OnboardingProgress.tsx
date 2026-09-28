import { ReactNode } from "react";
import { Text, View } from "react-native";
import {
  SafeAreaInsetsContext,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import {
  ONBOARDING_PROGRESS_ENABLED,
  ONBOARDING_STEPS,
} from "@/constants/onboarding-steps";

const INK = "#29486E";
const CARD = "#F8F5FD";
const ACTIVE_FILL = "#D6E3F3"; // light blue inside the current step's circle
const CIRCLE = 24;
const LINE_TOP = CIRCLE / 2 - 1; // the circle's vertical middle

function ProgressBar({ current }: { current: number }) {
  const count = ONBOARDING_STEPS.length;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current + 1} of ${count}: ${ONBOARDING_STEPS[current].label.replace("\n", " ")}`}
      className="mx-4 mt-2 mb-1 rounded-2xl px-2 pt-2 pb-3"
      style={{
        backgroundColor: CARD,
        boxShadow: "0px 2px 6px rgba(41, 72, 110, 0.15)",
      }}
    >
      <View className="flex-row">
        {ONBOARDING_STEPS.map((step, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <View key={step.label} className="flex-1 items-center">
              {index < count - 1 && (
                <View
                  className="absolute"
                  style={{
                    left: "50%",
                    width: "100%",
                    top: LINE_TOP,
                    height: 2,
                    backgroundColor: done ? INK : "rgba(36, 36, 40, 0.15)",
                  }}
                />
              )}
              <View
                className="items-center justify-center rounded-full"
                style={{
                  width: CIRCLE,
                  height: CIRCLE,
                  // Done: solid with a check. Current: light blue inside with a
                  // dark outline. Upcoming: hollow with a faint outline.
                  backgroundColor: done ? INK : active ? ACTIVE_FILL : CARD,
                  borderWidth: done ? 0 : active ? 2.5 : 1.5,
                  borderColor: active ? INK : "rgba(36, 36, 40, 0.4)",
                }}
              >
                {done ? (
                  <Svg width={12} height={12} viewBox="0 0 24 24" accessible={false}>
                    <Path
                      d="M5 13l4 4L19 7"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth={3.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                ) : (
                  <Text
                    className="text-[11px] font-bold"
                    style={{ color: active ? INK : "rgba(36, 36, 40, 0.6)" }}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                numberOfLines={2}
                className="text-[10px] font-semibold mt-1 text-center"
                style={{
                  minHeight: 24,
                  lineHeight: 12,
                  color: active
                    ? "#242428"
                    : done
                      ? "rgba(36, 36, 40, 0.7)"
                      : "rgba(36, 36, 40, 0.55)",
                }}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// Wraps the onboarding screens with a progress bar on top. Screens keep using
// useSafeAreaInsets() as before: inside the shell the top inset is reported as 0,
// because the bar already sits below the status bar.
// To remove the bar: render {children} directly in the layout instead.
export function OnboardingProgressShell({ children, pathname }: { children: ReactNode; pathname: string }) {
  const insets = useSafeAreaInsets();
  if (!ONBOARDING_PROGRESS_ENABLED) return <>{children}</>;

  const current = ONBOARDING_STEPS.findIndex((step) =>
    step.routes.includes(pathname),
  );
  // Keep each screen's layout stable while it slides, including the outgoing one.
  if (current < 0) return <>{children}</>;
  return (
    <View className="flex-1 bg-country" style={{ paddingTop: insets.top }}>
      <ProgressBar current={current} />
      <SafeAreaInsetsContext.Provider value={{ ...insets, top: 0 }}>
        <View className="flex-1">{children}</View>
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}
