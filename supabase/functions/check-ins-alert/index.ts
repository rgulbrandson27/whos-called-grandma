// Runs on a schedule (see the cron setup in Supabase's SQL editor — not
// deployed by this file itself). For every circle, finds the most recent
// "done" check-in; if it's been ALERT_THRESHOLD_DAYS or more with no new one
// since the last alert, pushes every stored device token in that circle via
// Expo's push service.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALERT_THRESHOLD_DAYS = 3;

Deno.serve(async () => {
  // Supabase's newer key system auto-injects SUPABASE_SECRET_KEYS (a JSON
  // dictionary) instead of the legacy single SUPABASE_SERVICE_ROLE_KEY
  // string — this project is on the new system, so the legacy var isn't
  // populated with a working key. Falls back to the legacy var just in case.
  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
  const secretKey = secretKeysRaw
    ? JSON.parse(secretKeysRaw).default
    : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, secretKey);

  const { data: circles, error: circlesError } = await supabase
    .from("circles")
    .select("id, created_at, last_alert_sent_at, loved_one_name");
  if (circlesError) {
    return new Response(JSON.stringify({ error: circlesError.message }), {
      status: 500,
    });
  }

  const now = new Date();
  const results: Record<string, string> = {};

  for (const circle of circles ?? []) {
    const { data: lastEvent, error: eventError } = await supabase
      .from("events")
      .select("event_date, created_at")
      .eq("circle_id", circle.id)
      .eq("status", "done")
      .order("event_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (eventError) {
      results[circle.id] = `event lookup error: ${eventError.message}`;
      continue;
    }

    // No check-ins yet: count from when the circle was created instead.
    const lastActivity = lastEvent?.event_date
      ? new Date(`${lastEvent.event_date}T00:00:00Z`)
      : new Date(circle.created_at);

    const daysSince =
      (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < ALERT_THRESHOLD_DAYS) {
      results[circle.id] = "not due";
      continue;
    }

    // Contact dates still drive the three-day clock, not entry timestamps.
    // Since contact time-of-day isn't stored, a same-UTC-day contact entered
    // after an alert counts as new activity. Older backdated contacts don't
    // re-arm an already-alerted period merely because they were entered later.
    const sameDayContactAfterAlert = Boolean(
      lastEvent && circle.last_alert_sent_at &&
      lastEvent.event_date === new Date(circle.last_alert_sent_at).toISOString().slice(0, 10) &&
      new Date(lastEvent.created_at) > new Date(circle.last_alert_sent_at),
    );
    if (
      circle.last_alert_sent_at &&
      new Date(circle.last_alert_sent_at) >= lastActivity &&
      !sameDayContactAfterAlert
    ) {
      results[circle.id] = "already alerted";
      continue;
    }

    const { data: members, error: membersError } = await supabase
      .from("circle_members")
      .select("push_token")
      .eq("circle_id", circle.id)
      .not("push_token", "is", null);
    if (membersError) {
      results[circle.id] = `member lookup error: ${membersError.message}`;
      continue;
    }

    const tokens = (members ?? [])
      .map((m) => m.push_token as string | null)
      .filter((t): t is string => Boolean(t));
    if (tokens.length === 0) {
      results[circle.id] = "no push tokens";
      continue;
    }

    const messages = tokens.map((token) => ({
      to: token,
      sound: "default",
      title: "Who's Called Grandma?",
      body: `No one has checked in with ${circle.loved_one_name} in a few days.`,
    }));

    const pushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!pushResponse.ok) {
      results[circle.id] = `push send failed: ${pushResponse.status}`;
      continue;
    }

    await supabase
      .from("circles")
      .update({ last_alert_sent_at: now.toISOString() })
      .eq("id", circle.id);

    results[circle.id] = `alerted ${tokens.length} device(s)`;
  }

  return new Response(JSON.stringify({ results }), {
    headers: { "Content-Type": "application/json" },
  });
});
