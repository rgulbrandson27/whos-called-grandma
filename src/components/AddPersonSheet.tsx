import { useRef, useState } from "react";
import {
  Contact,
  ContactField,
  getPermissionsAsync,
  requestPermissionsAsync,
} from "expo-contacts";
import { presentContactPickerAsync } from "expo-contacts/legacy";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
export type TakenPerson = { name: string; phone: string };

const NAME_LIMIT = 16;
const SUGGESTION_ROW_HEIGHT = 60;
const MAX_VISIBLE_SUGGESTIONS = 4;

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

// Shared "add a person" sheet: manual entry with live contact suggestions as
// you type, or the full native contact picker. Used both by create-circle.tsx
// (onboarding, writes to the local draft) and members.tsx (post-onboarding,
// writes straight to Supabase) — `onSubmit` is where those two diverge.
export default function AddPersonSheet({
  visible,
  onClose,
  onSubmit,
  title,
  taken,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, phone: string) => void | Promise<void>;
  title: string;
  taken: TakenPerson[];
}) {
  const insets = useSafeAreaInsets();
  const [attemptedAdd, setAttemptedAdd] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [nameLimitExceeded, setNameLimitExceeded] = useState(false);
  const [draftPhone, setDraftPhone] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [contacts, setContacts] = useState<ContactEntry[] | null>(null);
  const contactsLoad = useRef<Promise<void> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Set when the chosen contact has more than one usable number: the sheet
  // switches to a "which number?" view.
  const [numberChoice, setNumberChoice] = useState<{
    name: string;
    options: PhoneOption[];
  } | null>(null);

  // "Scroll Contacts" closes the sheet before the native picker opens. If the
  // picked contact then needs fixing by hand (name over the limit), this
  // brings the sheet back with the details filled in — the parent's `visible`
  // is already false by then.
  const [reopened, setReopened] = useState(false);

  const takenPhones = taken.map((t) => t.phone).filter((p) => p.trim().length > 0);

  const askedOnTyping = useRef(false);
  const limitedAccess = useRef(false);
  const [limitedHint, setLimitedHint] = useState(false);

  // Loaded once access exists. Typing a name asks for contacts permission the
  // first time only (`canAsk`); after that this just re-checks, so access
  // granted later (via "Scroll Contacts" or Settings) still turns suggestions
  // on. Without access, suggestions just never appear.
  const loadContacts = (canAsk: boolean) => {
    if (contactsLoad.current) return;
    contactsLoad.current = (async () => {
      try {
        let permission = await getPermissionsAsync();
        if (!permission.granted && canAsk && permission.canAskAgain) {
          permission = await requestPermissionsAsync();
        }
        if (!permission.granted) {
          contactsLoad.current = null;
          return;
        }
        // iOS "limited access": only the handful of contacts the user chose
        // to share come back, so most names won't be suggested.
        const limited = permission.accessPrivileges === "limited";
        limitedAccess.current = limited;
        setLimitedHint(limited);
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
        contactsLoad.current = null;
      }
    })();
  };

  const reset = () => {
    setSuggestOpen(false);
    setDraftName("");
    setNameLimitExceeded(false);
    setDraftPhone("");
    setAttemptedAdd(false);
    setNumberChoice(null);
    setReopened(false);
    // With limited access, re-read contacts next time the sheet is used, so
    // switching to full access in Settings takes effect without a restart.
    if (limitedAccess.current) contactsLoad.current = null;
  };

  const close = () => {
    Keyboard.dismiss();
    reset();
    onClose();
  };

  const alreadyAdded = (name: string, phone: string) => {
    const duplicate = taken.find((p) => p.phone && samePhone(p.phone, phone));
    if (!duplicate) return false;
    Alert.alert(
      "Already added",
      `${name || "That contact"} is already in your circle as ${duplicate.name}. The same phone number can't be added twice.`,
    );
    return true;
  };

  const submit = async (name: string, phone: string) => {
    if (name.trim().length > NAME_LIMIT) {
      setDraftName(name);
      setDraftPhone(phone);
      setNameLimitExceeded(true);
      setNumberChoice(null);
      setSuggestOpen(false);
      setReopened(true);
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
    setSubmitting(true);
    try {
      await onSubmit(name.trim(), phone);
      close();
    } catch (e) {
      Alert.alert(
        "Couldn't add person",
        e instanceof Error ? e.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
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
    submit(name || available[0]?.number || "", available[0]?.number ?? "");
  };

  const pickFromContacts = async () => {
    close();
    // Let the sheet finish closing before the native picker opens (iOS).
    await new Promise((resolve) => setTimeout(resolve, 400));
    try {
      // Tapping "Scroll Contacts" is what asks for contacts access. Android
      // can't read the picked contact without it; iOS can (the picker hands
      // the contact over itself), so there a "no" only means the name
      // suggestions stay off.
      let permission = await getPermissionsAsync();
      if (!permission.granted && permission.canAskAgain) {
        permission = await requestPermissionsAsync();
      }
      if (permission.granted) {
        // Name suggestions now work for the next person too.
        loadContacts(false);
      } else if (Platform.OS === "android") {
        Alert.alert(
          "Contacts permission needed",
          "Allow contacts access in your phone's settings to fill this in automatically.",
          [
            { text: "Not now", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
      // The legacy picker, not Contact.presentPicker(): that one returns only
      // an id, and looking the id back up (getDetails) fails with "contact
      // not found" on iOS. This one returns the name and numbers directly.
      const details = await presentContactPickerAsync();
      if (!details) return;
      // Let the picker finish sliding away first — iOS silently drops a
      // sheet or alert that tries to open while another screen is closing,
      // which left the "which number?" step never appearing.
      await new Promise((resolve) => setTimeout(resolve, 600));
      const name = details.name?.trim() ?? "";
      const options = toPhoneOptions(details.phoneNumbers);
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
    suggestOpen && contacts ? matchContacts(contacts, draftName, takenPhones) : [];
  const nameOk =
    /\p{L}/u.test(draftName.trim()) && draftName.trim().length <= NAME_LIMIT;
  const phoneStarted = draftPhone.trim().length > 0;
  const phoneOk = phoneStarted && isPhoneComplete(draftPhone);
  const canAdd = nameOk && phoneOk;
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

  return (
    <Modal
      visible={visible || numberChoice !== null || reopened}
      transparent
      animationType="fade"
      onRequestClose={() => (numberChoice ? setNumberChoice(null) : close())}
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
                      submit(numberChoice.name || option.number, option.number)
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
                {title}
              </Text>
              <TextInput
                accessibilityLabel="Name"
                accessibilityHint="Up to 16 characters"
                value={draftName}
                onChangeText={(value) => {
                  setNameLimitExceeded(value.length > NAME_LIMIT);
                  setDraftName(value.slice(0, NAME_LIMIT));
                  if (value.trim().length > 0) {
                    loadContacts(!askedOnTyping.current);
                    askedOnTyping.current = true;
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
                    maxHeight: SUGGESTION_ROW_HEIGHT * MAX_VISIBLE_SUGGESTIONS,
                  }}
                >
                  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {suggestions.map((entry) => (
                      <Pressable
                        key={`${entry.name}-${entry.phones[0]?.number}`}
                        accessibilityRole="button"
                        accessibilityLabel={`Use contact ${entry.name}`}
                        onPress={() => chooseContact(entry.name, entry.phones)}
                        className="justify-center px-4 active:bg-ink/10"
                        style={{ height: SUGGESTION_ROW_HEIGHT }}
                      >
                        <Text
                          className="text-graphite text-lg font-semibold"
                          numberOfLines={1}
                        >
                          {entry.name}
                        </Text>
                        <Text className="text-graphite/60 text-sm" numberOfLines={1}>
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
              {limitedHint && suggestOpen && suggestions.length === 0 && (
                <Pressable
                  accessibilityRole="link"
                  onPress={() => Linking.openSettings()}
                  className="mt-2 active:opacity-70"
                >
                  <Text className="text-graphite/70 text-sm text-center">
                    Only some of your contacts are shared with this app.{" "}
                    <Text className="underline">Allow full access</Text> to see
                    name suggestions.
                  </Text>
                </Pressable>
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
                disabled={submitting}
                // Stays tappable even when invalid, so tapping it is what
                // reveals the warning above (rather than disabling the
                // button and leaving no way to trigger the explanation).
                onPress={() => {
                  if (!canAdd) {
                    setAttemptedAdd(true);
                    return;
                  }
                  submit(draftName, draftPhone);
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
                onPress={close}
                className="mt-1 py-2 items-center active:opacity-70"
              >
                <Text className="text-graphite/70 text-lg">Cancel</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
