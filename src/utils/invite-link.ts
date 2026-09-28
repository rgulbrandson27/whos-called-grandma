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
