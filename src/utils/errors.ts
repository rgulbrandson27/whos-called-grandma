// Supabase query errors ({ error } from a query) and RevenueCat errors are
// plain objects with a `message`, not Error instances — read it from either.
export function errorMessage(e: unknown, fallback = "Please try again."): string {
  if (
    typeof e === "object" &&
    e !== null &&
    "message" in e &&
    typeof e.message === "string" &&
    e.message
  ) {
    return e.message;
  }
  return fallback;
}
