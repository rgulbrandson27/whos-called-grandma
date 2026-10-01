import { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Keyboard, KeyboardAvoidingView, ScrollView, Platform, Pressable, Text, TextInput, TouchableWithoutFeedback, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOnboardingStore } from "@/store/onboarding-store";

export default function LovedOneScreen() {
  const insets = useSafeAreaInsets();
  const savedName = useOnboardingStore((state) => state.lovedOneName);
  const setLovedOneName = useOnboardingStore((state) => state.setLovedOneName);
  // Start from what was already entered (e.g. after coming back with the back arrow).
  const [name, setName] = useState(savedName);
  const canContinue = /\p{L}/u.test(name.trim());
  const handleContinue = () => {
    if (!canContinue) return;
    Keyboard.dismiss();
    setLovedOneName(name.trim());
    router.push("/loved-one-birthday");
  };
  const [limitExceeded, setLimitExceeded] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(Keyboard.isVisible());
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const handleNameChange = (text: string) => {
    setName(text);
    setLimitExceeded(text.length >= 16);
  };
  const [fontsLoaded, fontError] = useFonts({
    CaveatRegular: require("../../../assets/fonts/Caveat-Regular.ttf"),
  });

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined}
      className="flex-1 bg-country px-6"
      style={{ paddingTop: insets.top + (Platform.OS === "web" ? 28 : 44), paddingBottom: insets.bottom }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to welcome"
        onPress={() => {
          Keyboard.dismiss();
          if (router.canGoBack()) router.back();
          else router.replace("/welcome");
        }}
        className="absolute items-center justify-center active:opacity-70"
        style={{ top: insets.top + 8, left: 16, width: 48, height: 48, zIndex: 1 }}
      >
        <Svg width={30} height={30} viewBox="0 0 24 24" accessible={false}>
          <Path d="M20 12H4M11 5l-7 7 7 7" fill="none" stroke="#29486E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
      {(fontsLoaded || fontError) && (
        // Two separate lines so "loved one" always stays together on the second
        // line, whatever the screen width.
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel="Tell us about your loved one."
          className="mt-10"
          style={{ paddingVertical: 12 }}
        >
          {["Tell us about your", "loved one."].map((line) => (
            <Text
              key={line}
              className="text-center"
              style={{
                color: "#241E38",
                fontFamily: fontsLoaded ? "CaveatRegular" : undefined,
                fontSize: 48,
                lineHeight: 64,
              }}
            >
              {line}
            </Text>
          ))}
        </View>
      )}
      <TextInput
        accessibilityLabel="Loved one's first name or nickname"
        accessibilityHint="Up to 16 characters"
        value={name}
        onChangeText={handleNameChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={isFocused ? undefined : "First name (or nickname)"}
        placeholderTextColor="rgba(36, 36, 40, 0.4)"
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={16}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={handleContinue}
        underlineColorAndroid="transparent"
        selectionColor="#F5D779"
        className="w-full max-w-md self-center mt-14 border-b-[1.5px] border-ink/50 text-ink text-center web:outline-none"
        style={{ fontSize: name || isFocused ? 52 : 28, height: 68, paddingTop: 10, paddingBottom: 2, includeFontPadding: false, textAlignVertical: "center" }}
      />
      {limitExceeded && (
        <Text accessibilityLiveRegion="polite" className="text-cocoa text-center text-sm mt-2">
          Limit 16 characters
        </Text>
      )}
      {keyboardVisible && <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue"
        disabled={!canContinue}
        accessibilityState={{ disabled: !canContinue }}
        onPress={handleContinue}
        className={`self-center items-center rounded-lg py-3 mt-6 ${canContinue ? "bg-ink active:opacity-80" : "bg-tile"}`}
        style={{ width: 96 }}
      >
        <Svg width={28} height={28} viewBox="0 0 24 24" accessible={false}>
          <Path d="M4 12h16M13 5l7 7-7 7" fill="none" stroke={canContinue ? "#FFFFFF" : "rgba(41, 72, 110, 0.5)"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>}
      </ScrollView>
      {!keyboardVisible && <Pressable
        accessibilityRole="button"
        disabled={!canContinue}
        accessibilityState={{ disabled: !canContinue }}
        onPress={handleContinue}
        className={`w-4/5 max-w-xs self-center items-center rounded-lg py-4 mb-12 ${canContinue ? "bg-ink active:opacity-80" : "bg-tile"}`}
      >
        <Text className={`text-xl font-semibold ${canContinue ? "text-white" : "text-graphite/50"}`}>Continue</Text>
      </Pressable>}
    </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
