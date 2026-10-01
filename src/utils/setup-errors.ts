// QA diagnostics deliberately exclude raw backend messages/details and row data.
export class SetupError extends Error {}

export function setupError(step: string, error: unknown): SetupError {
  if (error instanceof SetupError) return error;
  const record = typeof error === "object" && error !== null
    ? error as { code?: unknown; message?: unknown } : {};
  const code = typeof record.code === "number" ||
    (typeof record.code === "string" && /^(?:[A-Z0-9]{5}|PGRST\d{3}|\d{1,3})$/.test(record.code))
    ? String(record.code) : "unknown";
  const descriptions: Record<string, string> = {
    "23514": "A database check constraint rejected this operation.",
    "23502": "A required database value is missing.",
    "23503": "A referenced database record is missing.",
    "23505": "A database record already exists.",
    "42501": "Database access was denied.",
    PGRST116: "The database did not return exactly one record.",
  };
  // Only reveal known schema constraint labels, never arbitrary server text.
  const message = typeof record.message === "string" ? record.message : "";
  const constraint = ["circle_members_invite_status_check", "circle_members_contact_required",
    "circle_members_role_check", "circle_members_week_start_day_check"]
    .find((name) => message.includes(name));
  const reason = descriptions[code] ?? (/network|fetch|offline/i.test(message)
    ? "Network request failed." : "No safe diagnostic message is available.");
  const result = new SetupError(`${step} failed [${code}]. ${reason}${constraint ? ` Constraint: ${constraint}.` : ""}`);
  console.error(`[onboarding] ${result.message}`);
  return result;
}

export async function setupStep<T>(step: string, action: () => PromiseLike<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw setupError(step, error);
  }
}
