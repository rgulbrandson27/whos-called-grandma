// Run with: node --test scripts/release-blocker.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
function load(file, mocks = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
  }}).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { exports: module.exports, module, console: { error() {} },
    require: (name) => name in mocks ? mocks[name] : require(name) });
  return module.exports;
}
const errors = load('src/utils/setup-errors.ts');
function purchaseFixture(info, failure) {
  let calls = 0;
  const sdk = {
    invalidateCustomerInfoCache: async () => {},
    getCustomerInfo: async () => { if (failure === 'lookup') throw new Error('offline'); return info; },
    getOfferings: async () => ({ current: { availablePackages: [{ product: { identifier: 'wcg_basic_annual' } }] } }),
    purchasePackage: async () => {
      calls++;
      if (failure === 'cancel') throw { userCancelled: true };
      if (failure === 'purchase') throw { code: 2, message: 'private payload' };
      info.activeSubscriptions.push('wcg_basic_annual');
    },
  };
  const api = load('src/utils/purchases.ts', {
    '@/utils/setup-errors': errors, 'react-native': { Platform: { OS: 'ios' } },
    'react-native-purchases': sdk,
  });
  return { ...api, count: () => calls, sdk };
}
const empty = () => ({ entitlements: { active: {} }, activeSubscriptions: [] });
test('active exact-product entitlement skips package purchase', async () => {
  const info = empty();
  info.entitlements.active.anyConfiguredName = { isActive: true, productIdentifier: 'wcg_basic_annual' };
  const f = purchaseFixture(info);
  assert.equal((await f.purchasePlan('basic_annual')).success, true);
  assert.equal(f.count(), 0);
});
test('successful purchase is reused on retry and with a new module instance (restart)', async () => {
  const info = empty();
  const f = purchaseFixture(info);
  await f.purchasePlan('basic_annual');
  await f.purchasePlan('basic_annual');
  assert.equal(f.count(), 1);
  const restarted = purchaseFixture(info);
  await restarted.purchasePlan('basic_annual');
  assert.equal(restarted.count(), 0);
});
test('wrong product does not authorize selection; lookup failure never initiates purchase', async () => {
  const info = empty(); info.activeSubscriptions.push('wcg_basic_monthly');
  const f = purchaseFixture(info);
  await f.purchasePlan('basic_annual'); assert.equal(f.count(), 1);
  const broken = purchaseFixture(empty(), 'lookup');
  await assert.rejects(broken.purchasePlan('basic_annual'), /RevenueCat entitlement lookup failed/);
  assert.equal(broken.count(), 0);
});
test('cancellation and purchase errors remain distinct', async () => {
  assert.equal((await purchaseFixture(empty(), 'cancel').purchasePlan('basic_annual')).cancelled, true);
  await assert.rejects(purchaseFixture(empty(), 'purchase').purchasePlan('basic_annual'), /RevenueCat purchase failed \[2\]/);
});
function dbFixture(results) {
  const writes = [];
  const supabase = { from(table) {
    const builder = {
      insert(rows) { writes.push({ table, rows }); return builder; },
      delete() { return builder; }, update() { return builder; },
      eq() { return builder; }, neq() { return builder; }, select() { return builder; },
      single() { return builder; },
      then(resolve, reject) { return Promise.resolve(results.shift() ?? { error: null }).then(resolve, reject); },
    }; return builder;
  }};
  const mocks = { './supabaseClient': { supabase }, '@/utils/setup-errors': errors,
    '@/utils/phone': { toE164: (phone) => phone } };
  return { writes, invites: load('src/data/invites.ts', mocks), circles: load('src/data/circles.ts', mocks) };
}
const draft = { inviteNames: ['A', 'B', 'C'], invitePhones: ['1', '2', '3'],
  inviteStatuses: ['not_sent', 'pending', 'accepted'], inviteColors: [null, null, '#123456'] };
test('legacy normalization preserves pending/accepted and null colors', async () => {
  const f = dbFixture([]); await f.invites.saveInviteMembers('circle', draft);
  const rows = f.writes[0].rows;
  assert.equal(rows.map(r => r.invite_status).join(','), 'pending,pending,accepted');
  assert.equal(rows[0].color, null); assert.equal(rows[1].color, null);
  assert.equal(rows[2].color, '#123456'); assert.ok(rows[2].accepted_at);
});
test('each database failure identifies its own operation', async () => {
  const fail = { error: { code: '23514', message: 'circle_members_contact_required private row data' } };
  const ok = { data: { id: 'circle' }, error: null };
  const cases = [
    ['Circle creation', [fail], f => f.circles.createCircle({})],
    ['Owner member creation', [ok, fail], f => f.circles.createCircle({})],
    ['Circle plan update', [fail], f => f.circles.updateCirclePlan('circle', 'basic_annual')],
    ['Invite deletion', [fail], f => f.invites.saveInviteMembers('circle', draft)],
    ['Invite insertion', [ok, fail], f => f.invites.saveInviteMembers('circle', draft)],
  ];
  for (const [step, results, run] of cases) {
    await assert.rejects(run(dbFixture([...results])), e => {
      assert.ok(e.message.startsWith(step + ' failed [23514]'));
      assert.ok(!e.message.includes('private row data')); return true;
    });
  }
});
test('unknown thrown values still identify step without leaking payload', () => {
  assert.match(errors.setupError('Routing to /member-invites', 'secret').message,
    /^Routing to \/member-invites failed \[unknown\]/);
  assert.ok(!errors.setupError('Local onboarding state update', { message: 'secret token' }).message.includes('secret token'));
});
test('pending setup plan and circle ID survive hydration; completion and reset clear marker', async () => {
  let saved = null;
  const storage = { getItem: async () => saved,
    setItem: async (_key, value) => { saved = value; }, removeItem: async () => { saved = null; } };
  const makeStore = () => load('src/store/onboarding-store.ts', {
    '@react-native-async-storage/async-storage': storage,
  }).useOnboardingStore;
  const first = makeStore(); await first.persist.rehydrate();
  await first.getState().setPendingSetupPlan('basic_annual');
  await first.getState().setCircleId('partial-circle');
  const restarted = makeStore(); await restarted.persist.rehydrate();
  assert.equal(restarted.getState().pendingSetupPlan, 'basic_annual');
  assert.equal(restarted.getState().circleId, 'partial-circle');
  await restarted.getState().setPendingSetupPlan(null);
  assert.equal(JSON.parse(saved).state.pendingSetupPlan, null);
  await restarted.getState().setPendingSetupPlan('premium_annual');
  restarted.getState().resetOnboardingDraft();
  assert.equal(restarted.getState().pendingSetupPlan, null);
});

const phone = load('src/utils/phone.ts');
function typePhone(input) {
  let value = '';
  for (const character of input) {
    // Mirror the input's maxLength guard as well as its formatter.
    assert.ok(!phone.isPhoneFull(value), `Input blocked before ${character} in ${input}`);
    assert.ok(value.length < 20);
    value = phone.formatTypedNumber(value + character, value);
  }
  return value;
}
test('phone typing preserves leading 1 and accepts equivalent US forms', () => {
  assert.equal(phone.formatTypedNumber('1'), '1');
  for (const input of ['2025550123', '12025550123', '+12025550123']) {
    const value = typePhone(input);
    assert.equal(phone.toE164(value), '+12025550123');
    assert.equal(phone.isPhoneComplete(value), true);
    assert.equal(phone.isPhoneFull(value), true);
    assert.equal(phone.formatTypedNumber(value + '9', value), value);
  }
});
test('international plus prefixes remain visible and +44 still formats', () => {
  for (const prefix of ['+', '+1', '+44']) {
    assert.equal(typePhone(prefix), prefix);
  }
  const value = typePhone('+447400123456');
  assert.equal(value, '+44 7400 123456');
  assert.equal(phone.toE164(value), '+447400123456');
  assert.equal(phone.isPhoneComplete(value), true);
});
test('pasting and backspacing still work with national and international prefixes', () => {
  for (const input of ['2025550123', '12025550123', '+12025550123', '+447400123456']) {
    let value = phone.formatTypedNumber(input);
    assert.equal(phone.isPhoneComplete(value), true);
    let attempts = 0;
    while (value && attempts++ < 30) {
      const next = phone.formatTypedNumber(value.slice(0, -1), value);
      assert.ok(next.length < value.length, 'Backspace must make progress');
      value = next;
    }
    assert.equal(value, '');
  }
});
