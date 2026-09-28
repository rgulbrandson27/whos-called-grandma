import { useRef, useState } from "react";
import { useFonts } from "expo-font";
import { router } from "expo-router";
import {
  Contact,
  ContactField,
  getPermissionsAsync,
  requestPermissionsAsync,
} from "expo-contacts";
import Svg, { Path } from "react-native-svg";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MemberIdentifier from "@/components/MemberIdentifier";
import { CIRCLE_COLORS } from "@/constants/circle-colors";
import { InviteStatus, useOnboardingStore } from "@/store/onboarding-store";
import { lighten } from "@/utils/color";
import { possessive } from "@/utils/text";
import {
  formatContactNumber,
  formatTypedNumber,
  isPhoneComplete,
  isPhoneFull,
  PHONE_PLACEHOLDER,
  samePhone,
} from "@/utils/phone";

type PhoneOption = { label: string; number: string };
type ContactEntry = { name: string; phones: PhoneOption[] };

// iOS can hand back raw labels like "_$!<Mobile>!$_"; tidy them for display.
const labelText = (raw?: string) => {
  const cleaned = (raw ?? "").replace(/_\$!<|>!\$_/g, "").trim();
  if (!cleaned) return "Other";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

// A contact's numbers, formatted, with duplicates (same number listed twice) dropped.
const toPhoneOptions = (
  phones: { label?: string; number?: string }[] | undefined,
): PhoneOption[] => {
  const seen = new Set<string>();
  const options: PhoneOption[] = [];
  for (const phone of phones ?? []) {
    const number = phone.number ? formatContactNumber(phone.number) : "";
    if (!number || seen.has(number)) continue;
    seen.add(number);
    options.push({ label: labelText(phone.label), number });
  }
  return options;
};

// How many people the first plan tier has room for (matches the store's slots).
const INVITE_LIMIT = 5;
const NAME_LIMIT = 16;
const AVATAR_GRAY = "#9AA5B1";
// Every card on this screen (subscriber, added people, blank add card) is this tall.
const CARD_HEIGHT = 64;
const SUGGESTION_ROW_HEIGHT = 60;
const MAX_VISIBLE_SUGGESTIONS = 4;

// Contacts whose name (or any word in it) starts with what's been typed, in
// alphabetical order. `contacts` is already sorted, so filtering keeps the order.
const matchContacts = (
  contacts: ContactEntry[],
  query: string,
  takenPhones: string[],
) => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return contacts
    .filter((c) => ` ${c.name.toLowerCase()}`.includes(` ${q}`))
    .filter(
      (c) =>
        c.phones.length === 0 ||
        c.phones.some((p) => !takenPhones.some((t) => samePhone(t, p.number))),
    )
    .slice(0, 30);
};

export default function MemberInvitesScreen() {
  const insets = useSafeAreaInsets();
  const names = useOnboardingStore((state) => state.inviteNames);
  const phones = useOnboardingStore((state) => state.invitePhones);
  const statuses = useOnboardingStore((state) => state.inviteStatuses);
  const colors = useOnboardingStore((state) => state.inviteColors);
  const lovedOneName = useOnboardingStore((state) => state.lovedOneName);
  const subscriberColor = useOnboardingStore((state) => state.subscriberColor);
  const subscriberName = useOnboardingStore((state) => state.subscriberName);
  const setWantsMorePeople = useOnboardingStore((state) => state.setWantsMorePeople);
  const setInviteNames = useOnboardingStore((state) => state.setInviteNames);
  const setInvitePhones = useOnboardingStore((state) => state.setInvitePhones);
  const setInviteStatuses = useOnboardingStore(
    (state) => state.setInviteStatuses,
  );
  const setInviteColors = useOnboardingStore((state) => state.setInviteColors);

  // The "Add someone" sheet: one person at a time.
  const [sheetOpen, setSheetOpen] = useState(false);
  // True once they've tried Add with something missing — the warning only
  // shows from that point, not just because a field is blank.
  const [attemptedAdd, setAttemptedAdd] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [nameLimitExceeded, setNameLimitExceeded] = useState(false);
  const [draftPhone, setDraftPhone] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [contacts, setContacts] = useState<ContactEntry[] | null>(null);
  const contactsLoad = useRef<Promise<void> | null>(null);
  // Set when the chosen contact has more than one usable number: the sheet
  // switches to a "which number?" view.
  const [numberChoice, setNumberChoice] = useState<{
    name: string;
    options: PhoneOption[];
  } | null>(null);

  const added = names
    .map((name, index) => ({ name: name.trim(), phone: phones[index], index }))
    .filter((person) => person.name.length > 0);
  const takenPhones = phones.filter((phone) => phone.trim().length > 0);

  const handleContinue = (showPremium = false) => {
    setWantsMorePeople(showPremium);
    Keyboard.dismiss();
    // TEMP: skips the adding-members animation and seeds 2 accepted invites
    // so the tab address-book screen can be screenshotted for a demo. Revert
    // to the real hasInvites/adding-members flow once that's no longer needed.
    const demoNames = [...names];
    demoNames[0] = demoNames[0].trim() || "Alex Rivera";
    demoNames[1] = demoNames[1].trim() || "Jordan Lee";
    setInviteNames(demoNames);
    const demoPhones = [...phones];
    demoPhones[0] = demoPhones[0].trim() || "(555) 123-4567";
    demoPhones[1] = demoPhones[1].trim() || "(555) 987-6543";
    setInvitePhones(demoPhones);
    const demoStatuses: InviteStatus[] = [
      "accepted",
      "accepted",
      "not_sent",
      "not_sent",
      "not_sent",
    ];
    setInviteStatuses(demoStatuses);
    const available = CIRCLE_COLORS.filter((c) => c.hex !== subscriberColor);
    setInviteColors([
      available[0]?.hex ?? CIRCLE_COLORS[0].hex,
      available[1]?.hex ?? CIRCLE_COLORS[1].hex,
      null,
      null,
      null,
    ]);
    router.push("/paywall");
  };

  // Loaded once, the first time someone types a name (that's when we ask for
  // contacts permission). If access is denied, suggestions just never appear.
  const loadContacts = () => {
    if (contactsLoad.current) return;
    contactsLoad.current = (async () => {
      try {
        let permission = await getPermissionsAsync();
        if (!permission.granted && permission.canAskAgain) {
          permission = await requestPermissionsAsync();
        }
        if (!permission.granted) return;
        const rows = await Contact.getAllDetails([
          ContactField.FULL_NAME,
          ContactField.PHONES,
        ]);
        const entries: ContactEntry[] = [];
        for (const row of rows) {
          const name = row.fullName?.trim();
          if (!name) continue;
          entries.push({ name, phones: toPhoneOptions(row.phones) });
        }
        entries.sort((a, b) => a.name.localeCompare(b.name));
        setContacts(entries);
      } catch {
        // Suggestions are a convenience; typing a name still works without them.
      }
    })();
  };

  const closeSheet = () => {
    Keyboard.dismiss();
    setSheetOpen(false);
    setSuggestOpen(false);
    setDraftName("");
    setNameLimitExceeded(false);
    setDraftPhone("");
    setAttemptedAdd(false);
  };

  const openSheet = () => {
    // Tell them before they spend time typing someone in, not after.
    if (added.length >= INVITE_LIMIT) {
      setLimitOpen(true);
      return;
    }
    setSheetOpen(true);
  };

  const alreadyAdded = (name: string, phone: string) => {
    const duplicate = added.find(
      (person) => person.phone && samePhone(person.phone, phone),
    );
    if (!duplicate) return false;
    Alert.alert(
      "Already added",
      `${name || "That contact"} is already in your circle as ${duplicate.name}. The same phone number can't be added twice.`,
    );
    return true;
  };

  const addPerson = (name: string, phone: string) => {
    if (name.trim().length > NAME_LIMIT) {
      setDraftName(name);
      setDraftPhone(phone);
      setNameLimitExceeded(true);
      setNumberChoice(null);
      setSuggestOpen(false);
      setSheetOpen(true);
      return;
    }
    const slot = names.findIndex((n) => n.trim().length === 0);
    if (slot === -1) {
      closeSheet();
      setLimitOpen(true);
      return;
    }
    if (phone && !isPhoneComplete(phone)) {
      Alert.alert(
        "Incomplete phone number",
        "Enter the whole phone number, or leave it blank.",
      );
      return;
    }
    if (phone && alreadyAdded(name, phone)) return;
    const nextNames = [...names];
    nextNames[slot] = name.trim();
    setInviteNames(nextNames);
    const nextPhones = [...phones];
    nextPhones[slot] = phone;
    setInvitePhones(nextPhones);
    setNumberChoice(null);
    closeSheet();
  };

  const confirmRemove = (index: number, name: string) => {
    Alert.alert(
      `Remove ${name}?`,
      `Are you sure you want to remove ${name} from the circle?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => removePerson(index) },
      ],
    );
  };

  // Drops one person and closes the gap, keeping every parallel array aligned.
  const removePerson = (index: number) => {
    const keep = names.map((_, i) => i).filter((i) => i !== index);
    const compact = <T,>(list: T[], blank: T) =>
      [
        ...keep.map((i) => list[i]),
        ...Array(names.length - keep.length).fill(blank),
      ] as T[];
    setInviteNames(compact(names, ""));
    setInvitePhones(compact(phones, ""));
    setInviteStatuses(compact(statuses, "not_sent" as InviteStatus));
    setInviteColors(compact(colors, null as string | null));
  };

  // Shared by the suggestion list and the "Scroll Contacts" picker.
  const chooseContact = (name: string, allOptions: PhoneOption[]) => {
    Keyboard.dismiss();
    // A saved number that isn't a full phone number can't be used.
    const options = allOptions.filter((o) => isPhoneComplete(o.number));
    if (allOptions.length > 0 && options.length === 0) {
      Alert.alert(
        "Incomplete phone number",
        `${name || "That contact"} doesn't have a full phone number saved. Type the whole number in instead.`,
      );
      return;
    }
    const available = options.filter(
      (o) => !takenPhones.some((t) => samePhone(t, o.number)),
    );
    if (options.length > 0 && available.length === 0) {
      alreadyAdded(name, options[0].number);
      return;
    }
    if (available.length > 1) {
      setNumberChoice({ name, options: available });
      return;
    }
    addPerson(name || available[0]?.number || "", available[0]?.number ?? "");
  };

  const pickFromContacts = async () => {
    closeSheet();
    // Let the sheet finish closing before the native picker opens (iOS).
    await new Promise((resolve) => setTimeout(resolve, 400));
    try {
      const picked = await Contact.presentPicker();
      if (!picked) return;
      if (Platform.OS === "android") {
        const { granted } = await requestPermissionsAsync();
        if (!granted) {
          Alert.alert(
            "Contacts permission needed",
            "Allow contacts access in your phone's settings to fill this in automatically.",
          );
          return;
        }
      }
      const details = await picked.getDetails([
        ContactField.FULL_NAME,
        ContactField.PHONES,
      ]);
      const name = details.fullName ?? "";
      const options = toPhoneOptions(details.phones);
      if (!name && options.length === 0) {
        Alert.alert(
          "No details found",
          "That contact doesn't have a name or phone number saved.",
        );
        return;
      }
      chooseContact(name, options);
    } catch (err) {
      Alert.alert(
        "Couldn't access contacts",
        err instanceof Error
          ? err.message
          : "Please try again, or type the name in instead.",
      );
    }
  };

  const suggestions =
    suggestOpen && contacts
      ? matchContacts(contacts, draftName, takenPhones)
      : [];
  // Adding someone by hand needs both a name and a complete phone number.
  const nameOk = /\p{L}/u.test(draftName.trim()) && draftName.trim().length <= NAME_LIMIT;
  const phoneStarted = draftPhone.trim().length > 0;
  const phoneOk = phoneStarted && isPhoneComplete(draftPhone);
  const canAdd = nameOk && phoneOk;
  // One line explaining whichever of the two is missing or incomplete. Only
  // shown once they've tried Add with something missing, not while they're
  // still in the middle of filling the fields in.
  const addWarning = nameLimitExceeded || draftName.trim().length > NAME_LIMIT
    ? "Please use a name of 16 characters or fewer."
    : !attemptedAdd
    ? null
    : phoneStarted && !isPhoneComplete(draftPhone)
      ? "Enter all the digits, or clear the number."
      : !nameOk
        ? "Enter a name to continue."
        : !phoneStarted
          ? "Add a phone number to continue."
          : null;
  const lovedOne = lovedOneName.trim();
  const circleTitle = lovedOne
    ? `Add to ${possessive(lovedOne)} circle`
    : "Add to your circle";
  const [fontsLoaded, fontError] = useFonts({
    CaveatRegular: require("../../../assets/fonts/Caveat-Regular.ttf"),
  });

  return (
    <View
      className="flex-1 bg-country px-6"
      style={{
        paddingTop: insets.top + (Platform.OS === "web" ? 12 : 20),
        paddingBottom: insets.bottom,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to your color"
        onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/subscriber-color");
        }}
        className="absolute items-center justify-center active:opacity-70"
        style={{ top: insets.top + 8, left: 16, width: 48, height: 48 }}
      >
        <Svg width={30} height={30} viewBox="0 0 24 24" accessible={false}>
          <Path
            d="M20 12H4M11 5l-7 7 7 7"
            fill="none"
            stroke="#29486E"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>
      {(fontsLoaded || fontError) && (
        <Text
          accessibilityRole="header"
          className="text-[#241E38] text-center mt-14"
          style={{
            fontFamily: fontsLoaded ? "CaveatRegular" : undefined,
            fontSize: 44,
            lineHeight: 60,
            paddingVertical: 0,
          }}
        >
          Create circle.
        </Text>
      )}
      <Text className="text-graphite/80 text-center text-xl mt-2 px-4">
        Who would you like to include?
      </Text>
      <Text className="text-graphite/60 text-center text-sm mt-1"></Text>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingVertical: 20,
          justifyContent: "flex-start",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-md self-center" style={{ gap: 10 }}>
          {/* The subscriber is always the first card, tinted with their color. */}
          <View
            className="flex-row items-center rounded-2xl px-4 py-3"
            style={{
              minHeight: CARD_HEIGHT,
              backgroundColor: lighten(subscriberColor ?? AVATAR_GRAY, 0.75),
            }}
          >
            <MemberIdentifier color={subscriberColor ?? AVATAR_GRAY} size={40} />
            <View className="flex-1 ml-5">
              <Text className="text-ink text-lg font-bold" numberOfLines={1}>
                {subscriberName.trim() || "You"}
              </Text>
              <Text className="text-ink/70 text-sm">Organizer</Text>
            </View>
          </View>
          {added.map((person) => (
            <View
              key={person.index}
              className="flex-row items-center rounded-2xl bg-white/60 px-4 py-3"
              style={{ minHeight: CARD_HEIGHT }}
            >
              <MemberIdentifier color={AVATAR_GRAY} size={40} />
              <View className="flex-1 ml-5">
                <Text
                  className="text-ink text-lg font-bold"
                  numberOfLines={1}
                >
                  {person.name}
                </Text>
                <Text className="text-ink/70 text-sm" numberOfLines={1}>
                  {person.phone?.trim() || "No number yet"}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${person.name}`}
                onPress={() => confirmRemove(person.index, person.name)}
                className="rounded-full bg-graphite/10 px-3 py-1.5 active:opacity-60"
              >
                <Text className="text-graphite/70 text-xs font-semibold">
                  Remove
                </Text>
              </Pressable>
            </View>
          ))}
          {/* Blank card: profile icon on the left, plus sign in the middle. Tap to add. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              added.length === 0 ? "Add someone" : "Add another person"
            }
            onPress={openSheet}
            className="flex-row items-center rounded-2xl bg-white/30 px-4 py-3 active:opacity-70"
            style={{
              minHeight: CARD_HEIGHT,
              borderWidth: 1.5,
              borderStyle: "dashed",
              borderColor: "rgba(36, 36, 40, 0.3)",
            }}
          >
            <MemberIdentifier color="#C9CED6" size={40} />
            <View
              pointerEvents="none"
              className="absolute left-0 right-0 top-0 bottom-0 items-center justify-center"
            >
              <Svg width={28} height={28} viewBox="0 0 24 24" accessible={false}>
                <Path
                  d="M12 5v14M5 12h14"
                  stroke="rgba(36, 36, 40, 0.6)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              </Svg>
            </View>
          </Pressable>
        </View>
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        onPress={() => handleContinue()}
        className="w-4/5 max-w-xs self-center items-center rounded-lg py-4 mb-8 bg-ink active:opacity-80"
      >
        <Text className="text-xl font-semibold text-white">Continue</Text>
      </Pressable>

      <Modal
        visible={sheetOpen || numberChoice !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (numberChoice) setNumberChoice(null);
          else closeSheet();
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 bg-ink/60 px-6"
          style={{ paddingTop: insets.top + 36, paddingBottom: insets.bottom + 16 }}
        >
          <ScrollView
            className="w-full max-w-sm self-center rounded-lg bg-tile"
            style={{ flexGrow: 0, flexShrink: 1 }}
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 48, paddingBottom: 28 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {numberChoice ? (
              <>
                <Text className="text-graphite text-2xl font-semibold text-center"
                  style={{ lineHeight: 32 }}>
                  Which number should we use for{" "}
                  {numberChoice.name || "this contact"}?
                </Text>
                <View className="mt-5" style={{ gap: 10 }}>
                  {numberChoice.options.map((option) => (
                    <Pressable
                      key={option.number}
                      accessibilityRole="button"
                      accessibilityLabel={`${option.label} ${option.number}`}
                      onPress={() =>
                        addPerson(
                          numberChoice.name || option.number,
                          option.number,
                        )
                      }
                      className="rounded-lg bg-white px-4 py-3 active:opacity-70"
                    >
                      <Text className="text-graphite/60 text-sm font-semibold">
                        {option.label}
                      </Text>
                      <Text className="text-graphite text-xl font-semibold">
                        {option.number}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setNumberChoice(null)}
                  className="mt-6 items-center active:opacity-70"
                >
                  <Text className="text-graphite/70 text-lg">Cancel</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text className="text-graphite text-2xl font-semibold text-center"
                  style={{ lineHeight: 32 }}>
                  {circleTitle}
                </Text>
                <TextInput
                  accessibilityLabel="Name"
                  accessibilityHint="Up to 16 characters"
                  value={draftName}
                  onChangeText={(value) => {
                    setNameLimitExceeded(value.length > NAME_LIMIT);
                    setDraftName(value.slice(0, NAME_LIMIT));
                    if (value.trim().length > 0) {
                      loadContacts();
                      setSuggestOpen(true);
                    } else {
                      setSuggestOpen(false);
                    }
                  }}
                  placeholder="Name"
                  placeholderTextColor="rgba(36, 36, 40, 0.4)"
                  autoCapitalize="words"
                  autoFocus
                  returnKeyType="next"
                  underlineColorAndroid="transparent"
                  selectionColor="#F5D779"
                  className="mt-8 w-full rounded-lg bg-white px-4 py-4 text-xl font-semibold text-graphite web:outline-none"
                />
                {suggestions.length > 0 && (
                  <View
                    className="mt-2 rounded-lg bg-white overflow-hidden"
                    style={{
                      maxHeight:
                        SUGGESTION_ROW_HEIGHT * MAX_VISIBLE_SUGGESTIONS,
                    }}
                  >
                    <ScrollView
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                    >
                      {suggestions.map((entry) => (
                        <Pressable
                          key={`${entry.name}-${entry.phones[0]?.number}`}
                          accessibilityRole="button"
                          accessibilityLabel={`Use contact ${entry.name}`}
                          onPress={() =>
                            chooseContact(entry.name, entry.phones)
                          }
                          className="justify-center px-4 active:bg-ink/10"
                          style={{ height: SUGGESTION_ROW_HEIGHT }}
                        >
                          <Text
                            className="text-graphite text-lg font-semibold"
                            numberOfLines={1}
                          >
                            {entry.name}
                          </Text>
                          <Text
                            className="text-graphite/60 text-sm"
                            numberOfLines={1}
                          >
                            {entry.phones.length === 0
                              ? "No number saved"
                              : entry.phones.length === 1
                                ? entry.phones[0].number
                                : `${entry.phones[0].number} · +${entry.phones.length - 1} more`}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
                <TextInput
                  accessibilityLabel="Phone number"
                  value={draftPhone}
                  onChangeText={(value) =>
                    setDraftPhone(formatTypedNumber(value, draftPhone))
                  }
                  onFocus={() => setSuggestOpen(false)}
                  placeholder={PHONE_PLACEHOLDER}
                  placeholderTextColor="rgba(36, 36, 40, 0.4)"
                  keyboardType="phone-pad"
                  // Once the number is complete, stop accepting digits at the source (no flash).
                  maxLength={isPhoneFull(draftPhone) ? draftPhone.length : 20}
                  underlineColorAndroid="transparent"
                  selectionColor="#F5D779"
                  className="mt-6 w-full rounded-lg bg-white px-4 py-4 text-xl text-graphite web:outline-none"
                />
                <View style={{ height: 48, justifyContent: "center" }}>
                  <Text
                    accessibilityLiveRegion="polite"
                    className="text-sm text-center"
                    style={{ color: "#C0392B" }}
                  >
                    {addWarning ?? " "}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  // Stays tappable even when invalid, so tapping it is what
                  // reveals the warning above (rather than disabling the
                  // button and leaving no way to trigger the explanation).
                  onPress={() => {
                    if (!canAdd) {
                      setAttemptedAdd(true);
                      return;
                    }
                    addPerson(draftName, draftPhone);
                  }}
                  className={`w-1/2 self-center items-center rounded-lg py-4 mt-3 ${
                    canAdd ? "bg-ink active:opacity-80" : "bg-white/40 active:opacity-70"
                  }`}
                >
                  <Text
                    className={`text-lg font-semibold ${canAdd ? "text-white" : "text-graphite/40"}`}
                  >
                    Add
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={pickFromContacts}
                  className="mt-3 py-2 items-center active:opacity-70"
                >
                  <Text className="text-graphite text-lg underline">
                    Scroll Contacts
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={closeSheet}
                  className="mt-1 py-2 items-center active:opacity-70"
                >
                  <Text className="text-graphite/70 text-lg">Cancel</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={limitOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLimitOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-ink/60 px-6">
          <View className="w-full max-w-sm rounded-lg bg-tile p-6">
            <Text className="text-graphite text-xl font-semibold text-center">
              Want to add more people?
            </Text>
            <Text
              className="text-graphite/80 text-lg text-center mt-6"
              style={{ lineHeight: 26 }}
              textBreakStrategy="balanced"
            >
              Your circle allows up to {INVITE_LIMIT + 1} people.{"\n"}
              Premium allows up to 20 people.{"\n"}
              Everyone you&apos;ve added is saved.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setLimitOpen(false);
                handleContinue(true);
              }}
              className="w-full items-center rounded-lg py-3 mt-6 bg-ink active:opacity-80"
            >
              <Text className="text-lg font-semibold text-white">
                See plans
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setLimitOpen(false)}
              className="mt-4 items-center active:opacity-70"
            >
              <Text className="text-graphite/70 text-lg">Return to circle</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
