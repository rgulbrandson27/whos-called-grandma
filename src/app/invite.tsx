import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { getInvitePreview, type InvitePreview } from "@/data/invite";
import { possessive } from "@/utils/text";

const GRAY_DOT = "#9AA5B1";
const SPLIT_AT = 8;

const notify = (title: string, message: string) => {
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    window.alert(`${title}\n\n${message}`);
  } else {
    // RN's Alert.alert isn't reliable on web — this route is meant to be
    // opened in a browser, but stays safe if it's ever hit natively too.
    const { Alert } = require("react-native");
    Alert.alert(title, message);
  }
};

export default function InviteLandingScreen() {
  // A query param (?member=xxx), not a dynamic path segment — Expo Router's
  // static web export can't pre-render a path for every member id that'll
  // ever exist, but a fixed route with a query string works on any plain
  // static host with no special server config.
  const { member: memberId } = useLocalSearchParams<{ member: string }>();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId) return;
    getInvitePreview(memberId)
      .then(setPreview)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "This invite link isn't valid."),
      );
  }, [memberId]);

  const handleOpenApp = () => {
    // Deep link into the app's own mini onboarding for this invite. This
    // only works if the app is already installed — there's no App Store
    // listing yet to fall back to, and detecting "is it installed" from a
    // plain web page needs either a published Universal Link (a file hosted
    // on this domain) or a service like Branch/Firebase Dynamic Links,
    // neither of which exist yet. Revisit once the app is actually live.
    Linking.openURL(`whoscalledgrandma://join/${memberId}`).catch(() => {
      notify(
        "Couldn't open the app",
        "Make sure Who's Called Grandma? is installed, then try this link again.",
      );
    });
  };

  const handleNotYou = () => {
    notify(
      "Not you?",
      `Please let ${preview?.ownerName || "the person who invited you"} know this invite reached the wrong person.`,
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#EDE7F9" }}
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 420,
          backgroundColor: "#EDE7F9",
          borderRadius: 24,
          padding: 28,
        }}
      >
        <Text
          style={{
            color: "#29486E",
            fontSize: 18,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          Who&apos;s Called Grandma?
        </Text>

        {!preview && !error && (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator color="#29486E" />
          </View>
        )}

        {error && (
          <Text
            style={{
              color: "#242428",
              fontSize: 14,
              textAlign: "center",
              marginTop: 40,
            }}
          >
            {error}
          </Text>
        )}

        {preview && (
          <>
            <View
              style={{
                alignSelf: "center",
                marginTop: 28,
                width: 80,
                height: 80,
                borderRadius: 20,
                backgroundColor: "#C9BEEA",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Svg width={34} height={34} viewBox="0 0 24 24" accessible={false}>
                <Path
                  d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"
                  fill="none"
                  stroke="#241E38"
                  strokeWidth={1.6}
                  strokeLinejoin="round"
                />
              </Svg>
            </View>

            <Text
              style={{
                color: "#241E38",
                fontSize: 26,
                fontWeight: "700",
                textAlign: "center",
                marginTop: 20,
              }}
            >
              You&apos;re invited to {possessive(preview.lovedOneName)} circle
            </Text>
            <Text
              style={{
                color: "#29486E",
                fontSize: 15,
                textAlign: "center",
                marginTop: 8,
                lineHeight: 21,
              }}
            >
              {preview.ownerName} started this circle so no one goes too long
              without checking in.
            </Text>

            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                padding: 20,
                marginTop: 24,
              }}
            >
              <Text
                style={{
                  color: "#29486E",
                  fontSize: 13,
                  fontWeight: "700",
                  marginBottom: 10,
                }}
              >
                Already in the circle
              </Text>
              {preview.members.length <= SPLIT_AT ? (
                <MemberList members={preview.members} />
              ) : (
                <View style={{ flexDirection: "row", gap: 20 }}>
                  <MemberList
                    members={preview.members.slice(
                      0,
                      Math.ceil(preview.members.length / 2),
                    )}
                    style={{ flex: 1 }}
                  />
                  <MemberList
                    members={preview.members.slice(
                      Math.ceil(preview.members.length / 2),
                    )}
                    style={{ flex: 1 }}
                  />
                </View>
              )}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={handleOpenApp}
              style={{
                backgroundColor: "#241E38",
                borderRadius: 14,
                paddingVertical: 18,
                marginTop: 24,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700" }}>
                Open the app to join
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleNotYou}
              style={{ alignItems: "center", marginTop: 14 }}
            >
              <Text style={{ color: "#29486E", fontSize: 13 }}>
                Not you? Let {preview.ownerName} know
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function MemberList({
  members,
  style,
}: {
  members: InvitePreview["members"];
  style?: object;
}) {
  return (
    <View style={[{ gap: 10 }, style]}>
      {members.map((member) => (
        <View
          key={member.id}
          style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
        >
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor:
                member.inviteStatus === "accepted"
                  ? (member.color ?? GRAY_DOT)
                  : GRAY_DOT,
            }}
          />
          <Text style={{ color: "#241E38", fontSize: 15 }} numberOfLines={1}>
            {member.name}
          </Text>
        </View>
      ))}
    </View>
  );
}
