import * as SMS from "expo-sms";
import { Share } from "react-native";
import { toE164 } from "@/utils/phone";
import { possessive } from "@/utils/text";

// Placeholder until the invite landing page (src/app/invite.tsx) is actually
// deployed — see EXPO_PUBLIC_INVITE_BASE_URL in .env.
const FALLBACK_BASE_URL = "https://example.com";

export function getInviteUrl(memberId: string): string {
  const base = (
    process.env.EXPO_PUBLIC_INVITE_BASE_URL ?? FALLBACK_BASE_URL
  ).replace(/\/$/, "");
  // A query param, not a path segment — see src/app/invite.tsx for why.
  return `${base}/invite?member=${encodeURIComponent(memberId)}`;
}

// Opens the text-message composer inside the app, already addressed to this
// person with the invite written out, so all that's left is tapping send.
// (An app can't send a text on its own — iOS and Android both require the
// person to press send, short of paying an SMS service to send from a server.)
// Resolves true only if an invite actually went out: iOS reports sent vs.
// cancelled; Android can't tell ("unknown"), so that counts as sent. Falls
// back to the general share sheet if there's no usable number or the device
// can't text, e.g. a tablet.
export async function sendInvite(
  member: { id: string; phone?: string | null },
  lovedOneName: string,
): Promise<boolean> {
  const url = getInviteUrl(member.id);
  const message = `You're invited to ${lovedOneName ? possessive(lovedOneName) : "our"} circle on Who's Called Grandma! Tap to join: ${url}`;
  const phone = member.phone
    ? (toE164(member.phone) ?? member.phone.replace(/[^\d+]/g, ""))
    : "";
  if (phone && (await SMS.isAvailableAsync())) {
    const { result } = await SMS.sendSMSAsync([phone], message);
    return result !== "cancelled";
  }
  const result = await Share.share({ message, url });
  return result.action !== Share.dismissedAction;
}
