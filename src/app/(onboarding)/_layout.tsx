import { Stack } from "expo-router";
import { OnboardingProgressShell } from "@/components/OnboardingProgress";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        animationTypeForReplace: "push",
        contentStyle: { backgroundColor: "#EDE7F9" },
      }}
      screenLayout={({ children, route }) => (
        <OnboardingProgressShell pathname={`/${route.name}`}>
          {children}
        </OnboardingProgressShell>
      )}
    />
  );
}
