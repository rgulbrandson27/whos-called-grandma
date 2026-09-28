import { useEffect } from "react";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { configurePurchases } from "@/utils/purchases";
import "../../global.css";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    configurePurchases();
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", animationTypeForReplace: "push" }} />
    </ThemeProvider>
  );
}
