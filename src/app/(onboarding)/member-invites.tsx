import { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { router } from "expo-router";
import { ActivityIndicator, Alert, Pressable, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MemberIdentifier from "@/components/MemberIdentifier";
import type { Member } from "@/data/fakeData";
import { getMembers } from "@/data/members";
import { useOnboardingStore } from "@/store/onboarding-store";
import { getInviteUrl } from "@/utils/invite-link";
import { possessive } from "@/utils/text";

const GRAY_AVATAR = "#9AA5B1";

export default function MemberInvitesScreen() {
  const insets = useSafeAreaInsets();
  const circleId = useOnboardingStore((state) => state.circleId);
  const lovedOneName = useOnboardingStore((state) => state.lovedOneName).trim();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fontsLoaded, fontError] = useFonts({
    CaveatRegular: require("../../../assets/fonts/Caveat-Regular.ttf"),
  });

  useEffect(() => {
    if (!circleId) {
      setError("No circle found for this device.");
      return;
    }
    let cancelled = false;
    getMembers(circleId)
      .then((rows) => {
        if (!cancelled) setMembers(rows);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Couldn't load your circle.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [circleId]);

  const owner = members?.find((m) => m.role === "owner") ?? null;
  const others = members?.filter((m) => m.role !== "owner") ?? [];

  const handleSendInvite = (member: Member) => {
    const url = getInviteUrl(member.id);
    Share.share({
      message: `You're invited to ${lovedOneName ? possessive(lovedOneName) : "our"} circle on Who's Called Grandma! Tap to join: ${url}`,
      url,
    }).catch(() => {
      Alert.alert("Couldn't open share sheet", "Please try again.");
    });
  };

  return (
    <View
      className="flex-1 bg-country"
      style={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom }}
    >
      {(fontsLoaded || fontError) && (
        <Text
          className="text-[#241E38] text-center px-6"
          style={{
            fontFamily: fontsLoaded ? "CaveatRegular" : undefined,
            fontSize: 36,
            lineHeight: 46,
          }}
        >
          {lovedOneName
            ? `You're all set to look out for ${possessive(lovedOneName)} circle.`
            : "Your circle is set."}
        </Text>
      )}

      {!members && !error && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#29486E" />
        </View>
      )}

      {error && (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-graphite/70 text-center text-sm">{error}</Text>
        </View>
      )}

      {members && (
        <View className="flex-1 px-6 mt-8" style={{ gap: 10 }}>
          {owner && (
            <View className="flex-row items-center rounded-2xl bg-white/60 px-4 py-3">
              <MemberIdentifier color={owner.color ?? GRAY_AVATAR} size={40} />
              <View className="flex-1 ml-4">
                <Text className="text-graphite text-lg font-bold" numberOfLines={1}>
                  {owner.name}
                </Text>
                <Text className="text-graphite/60 text-sm">You · circle organizer</Text>
              </View>
            </View>
          )}
          {others.map((member) => (
            <View
              key={member.id}
              className="flex-row items-center rounded-2xl bg-white/60 px-4 py-3"
            >
              <MemberIdentifier color={member.color ?? GRAY_AVATAR} size={40} />
              <View className="flex-1 ml-4">
                <Text className="text-graphite text-lg font-bold" numberOfLines={1}>
                  {member.name}
                </Text>
                <Text className="text-graphite/60 text-sm" numberOfLines={1}>
                  {member.phone?.trim() || "No number saved"}
                </Text>
              </View>
              {member.inviteStatus === "pending" && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleSendInvite(member)}
                  className="rounded-full bg-ink px-3 py-1.5 active:opacity-80"
                >
                  <Text className="text-white text-xs font-semibold">
                    Send invite
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace("/calendar")}
        className="w-4/5 max-w-xs self-center items-center rounded-lg py-4 mb-8 bg-ink active:opacity-80"
      >
        <Text className="text-xl font-semibold text-white">Go to your calendar</Text>
      </Pressable>
    </View>
  );
}
