import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { WeekStartPicker } from "@/components/WeekStartPicker";
import { getMyPreferences, saveMyPreferences } from "@/data/member-preferences";
import type { WeekStart } from "@/store/onboarding-store";

export default function MemberPreferencesEditor({ visible, onClose, onSaved }: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getMyPreferences>> | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<WeekStart>("sunday");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!visible) return;
    let active = true;
    setProfile(null);
    setError(null);
    getMyPreferences().then((value) => {
      if (!active) return;
      setProfile(value);
      setColor(value.member.color);
      setWeekStart(value.member.weekStart ?? "sunday");
    }).catch(() => {
      if (active) setError("We couldn't identify or load your circle membership. Close this screen and try again.");
    });
    return () => { active = false; };
  }, [visible]);
  const save = async () => {
    if (!color || saving || !profile) return;
    setSaving(true);
    try {
      await saveMyPreferences(color, weekStart, { circleId: profile.circleId, memberId: profile.member.id });
      await onSaved();
      onClose();
    } catch {
      Alert.alert("Couldn't save preferences", "Please check your connection and try again. If that color was just taken, close and reopen preferences to choose another.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => { if (!saving) onClose(); }}>
      <View className="flex-1 bg-country" style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <Text className="text-graphite text-2xl font-bold mb-2">My preferences</Text>
          <Text className="text-graphite/70 text-base mb-6">Your color and calendar view</Text>
          {error && <Text className="text-graphite text-base">{error}</Text>}
          {!profile && !error && <ActivityIndicator color="#29486E" />}
          {profile && (
            <View pointerEvents={saving ? "none" : "auto"}>
              <View className="flex-row flex-wrap" accessibilityRole="radiogroup">
                {profile.colors.map((option) => (
                  <Pressable key={option.hex} accessibilityRole="radio" accessibilityLabel={option.name}
                    accessibilityState={{ selected: color === option.hex }} onPress={() => setColor(option.hex)}
                    style={{ width: "25%", padding: 4, marginBottom: 12, alignItems: "center" }}>
                    <View style={{ width: "100%", maxWidth: 64, aspectRatio: 1, borderRadius: 8,
                      backgroundColor: option.hex, borderWidth: 3, borderColor: color === option.hex ? "#241E38" : "transparent",
                      alignItems: "center", justifyContent: "center" }}>
                      {color === option.hex && <Svg width={26} height={26} viewBox="0 0 24 24">
                        <Path d="M5 12l4 4L19 6" fill="none" stroke="#241E38" strokeWidth={3} />
                      </Svg>}
                    </View>
                    <Text className="text-ink text-xs text-center mt-2">{option.name}</Text>
                  </Pressable>
                ))}
              </View>
              <WeekStartPicker value={weekStart} onChange={setWeekStart} compact />
            </View>
          )}
        </ScrollView>
        <View className="px-6">
          {profile && <Pressable accessibilityRole="button" disabled={!color || saving} onPress={save}
            className="bg-ink rounded-lg items-center py-4">
            {saving ? <ActivityIndicator color="white" /> : <Text className="text-white text-lg font-semibold">Save preferences</Text>}
          </Pressable>}
          <Pressable accessibilityRole="button" disabled={saving} onPress={onClose} className="items-center py-3">
            <Text className="text-ink text-base">Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
