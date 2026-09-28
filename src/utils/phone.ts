import examples from "libphonenumber-js/examples.mobile.json";
import {
  AsYouType,
  getCountryCallingCode,
  getExampleNumber,
  isSupportedCountry,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  type CountryCode,
} from "libphonenumber-js/min";

// Numbers typed without a "+" country code are read as belonging to the
// device's region (falls back to US).
const deviceCountry = (): CountryCode => {
  try {
    const region = new Intl.Locale(
      Intl.DateTimeFormat().resolvedOptions().locale,
    ).region;
    if (region && isSupportedCountry(region)) return region as CountryCode;
  } catch {
    // Intl.Locale unavailable — use the default below.
  }
  return "US";
};

const DEFAULT_COUNTRY = deviceCountry();

// Formats what someone is typing in the phone field, as they type it.
// `previous` is the field's last value: used to spot backspacing, and returned
// unchanged when a keystroke would make the number too long.
export const formatTypedNumber = (raw: string, previous = "") => {
  let text = raw;
  // US numbers: a leading 1 is just the country/trunk code (no US area code
  // starts with 1), so drop it and every number shows the same way.
  if (getCountryCallingCode(DEFAULT_COUNTRY) === "1" && !text.trim().startsWith("+")) {
    text = text.replace(/\D/g, "").replace(/^1/, "");
  }
  const formatted = new AsYouType(DEFAULT_COUNTRY).input(text);
  if (validatePhoneNumberLength(formatted, DEFAULT_COUNTRY) === "TOO_LONG") {
    return previous;
  }
  // While deleting, don't let the formatter re-add a trailing ")" / space / "-"
  // right after the user removed it, or backspace would get stuck.
  return raw.length < previous.length
    ? formatted.replace(/[^\d]+$/, "")
    : formatted;
};

// Formats a number coming out of the address book: national style for the
// user's own country ("(555) 123-4567"), international otherwise ("+44 7700 900123").
export const formatContactNumber = (raw: string) => {
  const parsed = parsePhoneNumberFromString(raw, DEFAULT_COUNTRY);
  if (!parsed) return raw.trim();
  return parsed.countryCallingCode === getCountryCallingCode(DEFAULT_COUNTRY)
    ? parsed.formatNational()
    : parsed.formatInternational();
};

// The standard "+15551234567" form (E.164) — what gets saved to Supabase and
// what SMS services expect. Null if the text isn't a complete valid number.
export const toE164 = (raw: string) => {
  const parsed = parsePhoneNumberFromString(raw, DEFAULT_COUNTRY);
  return parsed?.isValid() ? parsed.number : null;
};

// True when two entries are the same phone number, however they're formatted.
export const samePhone = (a: string, b: string) => {
  const ea = toE164(a);
  const eb = toE164(b);
  if (ea && eb) return ea === eb;
  const da = a.replace(/\D/g, "");
  return da.length > 0 && da === b.replace(/\D/g, "");
};

// Placeholder for the phone field showing the local shape with x's, e.g.
// "(xxx) xxx-xxxx" in the US or "xxxxx xxxxxx" in the UK.
export const PHONE_PLACEHOLDER =
  getExampleNumber(DEFAULT_COUNTRY, examples)?.formatNational().replace(/\d/g, "x") ??
  "(xxx) xxx-xxxx";

// True when no more digits can be added to this number. Used to set the
// field's maxLength so the phone itself refuses another digit; otherwise the
// extra digit flashes on screen for a moment before being taken back out.
export const isPhoneFull = (text: string) =>
  text.length > 0 &&
  validatePhoneNumberLength(`${text}0`, DEFAULT_COUNTRY) === "TOO_LONG";

// True when the text is a full-length phone number for the country: all its
// digits are there (nothing missing, nothing extra). This checks length only,
// not whether the number really exists, so demo numbers like (555) 123-4567
// still count.
export const isPhoneComplete = (text: string) =>
  text.trim().length > 0 &&
  validatePhoneNumberLength(text, DEFAULT_COUNTRY) === undefined;
