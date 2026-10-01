// Exercises the actual Edge Function with in-memory Supabase/Expo substitutes.
// No network calls, database changes, or real notifications.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../supabase/functions/check-ins-alert/index.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
}}).outputText;
const done = (event_date, created_at = `${event_date}T12:00:00Z`) => ({ circle_id: 'test', status: 'done', event_date, created_at });
function fixture({ now = '2026-10-03T12:00:00Z', events = [], alerted = null, created = '2026-09-20T12:00:00Z' } = {}) {
  let clock = now;
  let handler;
  const circle = { id: 'test', loved_one_name: 'Test Grandma', created_at: created, last_alert_sent_at: alerted };
  const sends = [];
  const queries = [];
  const supabase = { from(table) {
    const filters = [], orders = [];
    let limit = Infinity, single = false, update;
    const query = {
      select(columns) { queries.push([table, columns]); return this; },
      eq(key, value) { filters.push(row => row[key] === value); return this; },
      not(key, _op, value) { filters.push(row => row[key] !== value); return this; },
      order(key, { ascending }) { orders.push({ key, ascending }); return this; },
      limit(value) { limit = value; return this; },
      maybeSingle() { single = true; return this; },
      update(value) { update = value; return this; },
      then(resolve, reject) {
        let rows = table === 'circles' ? [circle] : table === 'events' ? events : [
          { circle_id: 'test', push_token: 'test-token-A' }, { circle_id: 'test', push_token: 'test-token-B' },
        ];
        rows = rows.filter(row => filters.every(filter => filter(row)));
        if (update) rows.forEach(row => Object.assign(row, update));
        rows.sort((a, b) => {
          for (const { key, ascending } of orders) {
            const cmp = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
            if (cmp) return ascending ? cmp : -cmp;
          }
          return 0;
        });
        rows = rows.slice(0, limit);
        return Promise.resolve({ data: single ? rows[0] ?? null : rows, error: null }).then(resolve, reject);
      },
    }; return query;
  }};
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [clock])); }
    static now() { return new Date(clock).getTime(); }
  }
  const module = { exports: {} };
  vm.runInNewContext(code, {
    exports: module.exports, module, Date: ClockDate, Response,
    require: name => { assert.equal(name, 'https://esm.sh/@supabase/supabase-js@2'); return { createClient: () => supabase }; },
    Deno: { env: { get: key => key === 'SUPABASE_SECRET_KEYS' ? '{"default":"test-only"}' : 'test-only' }, serve: fn => { handler = fn; } },
    fetch: async (_url, options) => { sends.push(JSON.parse(options.body)); return { ok: true }; },
  });
  return { circle, sends, events, queries, setNow: value => { clock = value; },
    run: async () => (await (await handler()).json()).results.test };
}
test('recent completed contact: no alert before three days', async () => {
  const f = fixture({ now: '2026-10-02T23:59:59Z', events: [done('2026-09-30')] });
  assert.equal(await f.run(), 'not due'); assert.equal(f.sends.length, 0);
});
test('first overdue period alerts at exactly three days, with original wording and two recipients', async () => {
  const f = fixture({ now: '2026-10-03T00:00:00Z', events: [done('2026-09-30')] });
  assert.equal(await f.run(), 'alerted 2 device(s)');
  assert.equal(f.sends[0].length, 2);
  assert.equal(f.sends[0][0].body, 'No one has checked in with Test Grandma in a few days.');
});
test('repeat invocation in the same overdue period does not send twice', async () => {
  const f = fixture({ events: [done('2026-09-29')] });
  await f.run(); assert.equal(await f.run(), 'already alerted'); assert.equal(f.sends.length, 1);
});
test('completed contact on a later date re-arms the next overdue cycle', async () => {
  const f = fixture({ now: '2026-09-30T09:00:00Z', events: [done('2026-09-25')] });
  await f.run();
  f.events.push(done('2026-10-01', '2026-10-01T12:00:00Z'));
  f.setNow('2026-10-01T12:00:01Z'); assert.equal(await f.run(), 'not due');
  f.setNow('2026-10-04T00:00:00Z'); assert.equal(await f.run(), 'alerted 2 device(s)');
  assert.equal(await f.run(), 'already alerted'); assert.equal(f.sends.length, 2);
});
test('Wednesday contact entered after Wednesday 09:00 alert re-arms, then deduplicates', async () => {
  const f = fixture({ now: '2026-09-30T09:00:00Z', events: [done('2026-09-25')] });
  await f.run();
  f.events.push(done('2026-09-30', '2026-09-30T14:00:00Z'));
  f.setNow('2026-09-30T14:00:01Z'); assert.equal(await f.run(), 'not due');
  f.setNow('2026-10-03T00:00:00Z'); assert.equal(await f.run(), 'alerted 2 device(s)');
  assert.equal(await f.run(), 'already alerted'); assert.equal(f.sends.length, 2);
});
test('planned future event neither delays first alert nor re-arms a sent alert', async () => {
  const f = fixture({ events: [done('2026-09-25'), { ...done('2026-10-10'), status: 'planned' }] });
  assert.equal(await f.run(), 'alerted 2 device(s)');
  f.events.push({ ...done('2026-10-12', '2026-10-03T13:00:00Z'), status: 'planned' });
  f.setNow('2026-10-03T14:00:00Z'); assert.equal(await f.run(), 'already alerted');
});
test('backdated old contact entered today remains overdue, not a fresh three-day timer', async () => {
  const f = fixture({ events: [done('2026-09-29', '2026-10-03T11:00:00Z')] });
  assert.equal(await f.run(), 'alerted 2 device(s)');
});
test('backdated contact from before the last alert day does not re-arm that silence period', async () => {
  const f = fixture({ alerted: '2026-09-30T09:00:00Z', events: [done('2026-09-29', '2026-10-03T11:00:00Z')] });
  assert.equal(await f.run(), 'already alerted'); assert.equal(f.sends.length, 0);
});
test('late entry dated after last alert day allows a new alert without waiting from entry time', async () => {
  const f = fixture({ now: '2026-10-05T12:00:00Z', alerted: '2026-09-30T09:00:00Z', events: [done('2026-10-01', '2026-10-05T11:00:00Z')] });
  assert.equal(await f.run(), 'alerted 2 device(s)');
  assert.equal(await f.run(), 'already alerted');
});
test('no completed events: old circle gets its first alert', async () => {
  const f = fixture(); assert.equal(await f.run(), 'alerted 2 device(s)');
});
test('no completed events and already alerted: no duplicate', async () => {
  const f = fixture({ alerted: '2026-10-01T09:00:00Z' });
  assert.equal(await f.run(), 'already alerted'); assert.equal(f.sends.length, 0);
});
test('same contact date chooses latest entry timestamp regardless of row order', async () => {
  const f = fixture({ alerted: '2026-09-30T09:00:00Z', events: [done('2026-09-30', '2026-09-30T08:00:00Z'), done('2026-09-30', '2026-09-30T14:00:00Z')] });
  assert.equal(await f.run(), 'alerted 2 device(s)');
});
test('same-day entry before or exactly at alert does not re-arm', async () => {
  for (const time of ['08:00:00', '09:00:00']) {
    const f = fixture({ alerted: '2026-09-30T09:00:00Z', events: [done('2026-09-30', `2026-09-30T${time}Z`)] });
    assert.equal(await f.run(), 'already alerted');
  }
});
