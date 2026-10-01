import { useFonts } from "expo-font";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { confirmDevReset } from "@/utils/dev-reset";

// Your drawing, with its black background swapped for transparency so it
// sits directly on this screen's own dark color instead of showing a black
// box. It's a flattened picture (not real vector paths), so it won't stay
// perfectly crisp if scaled up much larger than shown here.
const ROTARY_IMAGE = require("../../../assets/images/rotary-circle-white.png");
// The source image's own width-to-height ratio, so it never looks stretched.
const ROTARY_ASPECT = 1024 / 1536;

// Just this screen runs dark — the app's usual light lavender background,
// used here as the text and button color instead.
const DARK_BG = "#241E38";
const LIGHT_LAVENDER = "#EDE7F9";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  // Trying Courgette (Google Fonts) for the heading; Nunito Sans for the
  // subtitle (Black/900) and the small caption under the picture (SemiBold/600).
  const [fontsLoaded, fontError] = useFonts({
    CourgetteRegular: require("../../../assets/fonts/Courgette-Regular.ttf"),
    NunitoSansBlack: require("../../../assets/fonts/NunitoSans-Black.ttf"),
    NunitoSansSemiBold: require("../../../assets/fonts/NunitoSans-SemiBold.ttf"),
  });

  return (
    // A plain flex column ran out of room once the picture and margins grew:
    // on a shorter phone the button could get pushed off-screen with no way
    // to reach it. The scroll view keeps the same centered layout when
    // everything fits, and only scrolls on a screen too short for it.
    <ScrollView
      style={{ flex: 1, backgroundColor: DARK_BG }}
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: "center",
        paddingHorizontal: 24,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <View style={{ flex: 1 }} />
      {(fontsLoaded || fontError) && (
        // In development builds only: press and hold the title to wipe saved data.
        // Two explicit lines (rather than numberOfLines + adjustsFontSizeToFit)
        // so it breaks the same way on every platform, including web.
        <Pressable
          onLongPress={__DEV__ ? confirmDevReset : undefined}
          delayLongPress={800}
          style={{ width: "100%" }}
        >
          {["Who's Called", "Grandma?"].map((line) => (
            <Text
              key={line}
              accessibilityRole={line === "Who's Called" ? "header" : undefined}
              className="text-center"
              style={{
                color: LIGHT_LAVENDER,
                fontFamily: fontsLoaded ? "CourgetteRegular" : undefined,
                fontSize: 64,
                lineHeight: 78,
              }}
            >
              {line}
            </Text>
          ))}
        </Pressable>
      )}
      <Text
        className="text-center text-[22px]"
        style={{
          color: LIGHT_LAVENDER,
          opacity: 0.75,
          width: "100%",
          marginTop: 18,
          fontFamily: fontsLoaded ? "NunitoSansBlack" : undefined,
        }}
      >
        A little help staying in touch
      </Text>
      <View
        style={{
          flexGrow: 1.5,
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 16,
        }}
      >
        <Image
          source={ROTARY_IMAGE}
          resizeMode="contain"
          style={{ width: 350 * ROTARY_ASPECT, height: 350 }}
          accessibilityIgnoresInvertColors
        />
      </View>
      <Text
        className="text-center text-base px-10"
        style={{
          color: LIGHT_LAVENDER,
          opacity: 0.65,
          lineHeight: 24,
          marginBottom: 16,
          transform: [{ scale: 1.05 }],
          fontFamily: fontsLoaded ? "NunitoSansSemiBold" : undefined,
        }}
      >
        When no one's checked in for a while...{"\n"}we'll let you know.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/loved-one")}
        className="w-4/5 max-w-xs items-center rounded-lg py-4 mb-12 active:opacity-80"
        style={{ backgroundColor: LIGHT_LAVENDER }}
      >
        <Text className="text-xl font-semibold" style={{ color: "#29486E" }}>
          Let's Get Started
        </Text>
      </Pressable>
    </ScrollView>
  );
}
