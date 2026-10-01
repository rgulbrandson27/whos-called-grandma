// Run with: node --test scripts/*.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
function load(file, mocks = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  }}).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { exports: module.exports, module, console,
    require: (name) => name in mocks ? mocks[name] : name.endsWith('.ttf') ? 0 : require(name) });
  return module.exports;
}
const colors = load('src/constants/circle-colors.ts');
const calendar = load('src/utils/calendarUtils.ts');

test('Sunday and Monday calendars retain every correct date, including leap years and month boundaries', () => {
  for (const year of [2024, 2025, 2026, 2027]) {
    for (let month = 0; month < 12; month++) {
      for (const weekStart of ['sunday', 'monday']) {
        const cells = calendar.buildMonthCells(year, month, weekStart);
        assert.equal(cells.length % 7, 0);
        const dated = cells.filter(cell => cell.day !== null);
        assert.equal(dated.length, new Date(year, month + 1, 0).getDate());
        assert.equal(new Set(dated.map(cell => cell.dateKey)).size, dated.length);
        for (const [index, cell] of cells.entries()) {
          if (cell.day === null) continue;
          const date = new Date(year, month, cell.day);
          assert.equal(index % 7, (date.getDay() + (weekStart === 'monday' ? 6 : 0)) % 7);
          assert.equal(cell.dateKey, calendar.formatDateKey(year, month, cell.day));
        }
      }
      assert.equal(JSON.stringify(calendar.buildMonthCells(year, month)),
        JSON.stringify(calendar.buildMonthCells(year, month, 'sunday')));
    }
  }
});

function preferencesFixture({ identity = { circleId: 'circle', myMemberId: 'me' }, rows, changeIdentity } = {}) {
  const me = { id: 'me', circleId: 'circle', color: colors.CIRCLE_COLORS[0].hex, inviteStatus: 'accepted', role: 'member' };
  const writes = [];
  const filters = [];
  const members = rows ?? [me, { ...me, id: 'owner', role: 'owner', color: colors.CIRCLE_COLORS[1].hex }];
  const api = load('src/data/member-preferences.ts', {
    './supabaseClient': { supabase: { from(table) {
      assert.equal(table, 'circle_members');
      return { update(values) { writes.push(values); return this; },
        eq(key, value) { filters.push([key, value]); return this; },
        select() { return this; }, single: async () => ({ data: { id: 'me' }, error: null }) };
    }}},
    './members': { getMembers: async () => { if (changeIdentity) changeIdentity(identity); return members; } },
    '@/constants/circle-colors': colors,
    '@/store/onboarding-store': { useOnboardingStore: { getState: () => identity } },
  });
  return { api, writes, filters, identity };
}
const expected = { circleId: 'circle', memberId: 'me' };
test('ordinary member edits only their own color and week start, not owner/role/status', async () => {
  const { api, writes, filters } = preferencesFixture();
  await api.saveMyPreferences(colors.CIRCLE_COLORS[2].hex, 'monday', expected);
  assert.equal(JSON.stringify(writes), JSON.stringify([{ color: colors.CIRCLE_COLORS[2].hex, week_start_day: 'monday' }]));
  assert.equal(JSON.stringify(filters), JSON.stringify([['id', 'me'], ['circle_id', 'circle'], ['invite_status', 'accepted']]));
});
test('missing, foreign-circle, or pending identities never write preferences', async () => {
  for (const config of [
    { identity: { circleId: 'circle', myMemberId: null } },
    { rows: [{ id: 'me', circleId: 'other', inviteStatus: 'accepted' }] },
    { rows: [{ id: 'me', circleId: 'circle', inviteStatus: 'pending' }] },
  ]) {
    const f = preferencesFixture(config);
    await assert.rejects(f.api.saveMyPreferences(colors.CIRCLE_COLORS[0].hex, 'sunday', expected));
    assert.equal(f.writes.length, 0);
  }
});
test('taken colors and changed device identity are rejected without writing', async () => {
  const taken = preferencesFixture();
  await assert.rejects(taken.api.saveMyPreferences(colors.CIRCLE_COLORS[1].hex, 'sunday', expected), /no longer available/);
  assert.equal(taken.writes.length, 0);
  const changed = preferencesFixture({ changeIdentity: identity => { identity.myMemberId = 'owner'; } });
  await assert.rejects(changed.api.saveMyPreferences(colors.CIRCLE_COLORS[0].hex, 'sunday', expected), /circle changed/);
  assert.equal(changed.writes.length, 0);
  const stale = preferencesFixture();
  await assert.rejects(stale.api.saveMyPreferences(colors.CIRCLE_COLORS[0].hex, 'sunday', { ...expected, memberId: 'owner' }), /circle changed/);
  assert.equal(stale.writes.length, 0);
});

function walk(node) {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!node || typeof node !== 'object') return [];
  return [node, ...walk(node.props?.children)];
}
function textOf(node) {
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return node && typeof node === 'object' ? textOf(node.props?.children) : '';
}
function screenMocks(store, states = []) {
  let index = 0;
  const routes = [];
  const alerts = [];
  return { routes, alerts, mocks: {
    react: { useState: (initial) => [index < states.length ? states[index++] : typeof initial === 'function' ? initial() : initial, () => {}],
      useEffect: () => {}, useRef: (current) => ({ current }) },
    'expo-font': { useFonts: () => [true, null] },
    'expo-router': { router: { canGoBack: () => true, back: () => routes.push('back'), push: route => routes.push(route), replace: route => routes.push(route) } },
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', TextInput: 'TextInput',
      Modal: 'Modal', ActivityIndicator: 'ActivityIndicator', Platform: { OS: 'ios' },
      Alert: { alert: (...args) => alerts.push(args) }, Keyboard: { dismiss() {} } },
    'react-native-svg': { __esModule: true, default: 'Svg', Path: 'Path' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }) },
    '@/store/onboarding-store': { useOnboardingStore: selector => selector(store) },
    '@/components/MemberIdentifier': 'MemberIdentifier', '@/components/AddPersonSheet': 'AddPersonSheet',
    '@/utils/color': { lighten: value => value }, '@/utils/text': { possessive: name => name + "'s" },
  }};
}
test('remaining onboarding slots count invitees plus organizer, with singular/plural and a working Continue', () => {
  for (const [count, remaining] of [[0, 5], [3, 2], [4, 1], [5, 0]]) {
    const store = { inviteNames: Array.from({ length: 5 }, (_, i) => i < count ? 'Person' : ''),
      invitePhones: [], inviteStatuses: [], inviteColors: [], lovedOneName: 'Grandma',
      subscriberName: 'Me', setWantsMorePeople: () => {} };
    const f = screenMocks(store);
    const screen = load('src/app/(onboarding)/create-circle.tsx', f.mocks).default();
    const button = walk(screen).find(node => node.type === 'Pressable' && textOf(node) === 'Continue');
    button.props.onPress();
    if (remaining) {
      assert.equal(f.routes.length, 0);
      assert.equal(f.alerts[0][1], `You still have room for ${remaining} more ${remaining === 1 ? 'person' : 'people'}. You can add them later from your Circle settings.`);
      f.alerts[0][2][0].onPress();
    } else assert.equal(f.alerts.length, 0);
    assert.equal(f.routes[0], '/paywall');
  }
});
test('Add Contact cancellation never saves, and horizontal date choices extend beyond two weeks', () => {
  let writes = 0;
  const f = screenMocks({ circleId: 'circle', myMemberId: 'me' }, [[], 'basic', 'Grandma', null]);
  const screen = load('src/app/add_event.tsx', { ...f.mocks,
    '@/data/circles': {}, '@/data/events': { logCheckIn: () => { writes++; } }, '@/data/members': {},
  }).default();
  const nodes = walk(screen);
  nodes.find(node => node.type === 'Pressable' && textOf(node) === 'Cancel').props.onPress();
  assert.equal(f.routes[0], 'back');
  assert.equal(writes, 0);
  const dates = nodes.filter(node => node.type === 'Pressable' && node.props.accessibilityRole === 'radio');
  assert.equal(dates.length, 61);
  const labels = dates.map(node => node.props.accessibilityLabel);
  assert.equal(new Set(labels).size, 61);
  assert.ok(nodes.some(node => node.type === 'ScrollView' && node.props.horizontal));
});
test('member preference control appears only on the current accepted member, never another tab', () => {
  const rows = [
    { id: 'owner', circleId: 'circle', name: 'Organizer with a long name', role: 'owner', inviteStatus: 'accepted', color: null },
    { id: 'me', circleId: 'circle', name: 'My long member name', role: 'member', inviteStatus: 'accepted', color: null },
  ];
  for (const [myMemberId, selectedId, allowed] of [['me', 'owner', false], ['me', 'me', true], [null, 'owner', false]]) {
    const f = screenMocks({ circleId: 'circle', myMemberId }, [false, rows, [], 'basic', 'Grandma', selectedId, null, false]);
    const screen = load('src/app/members.tsx', { ...f.mocks,
      '@/components/MemberPreferencesEditor': 'MemberPreferencesEditor',
      '@/constants/circle-colors': colors,
      '@/data/circles': {}, '@/data/events': {}, '@/data/members': {}, '@/utils/invite-link': {},
    }).default();
    const edit = walk(screen).find(node => node.type === 'Pressable' && textOf(node) === 'Edit my preferences');
    assert.equal(Boolean(edit), allowed);
    const tabNodes = walk(screen).filter(node => typeof node.type === 'function' && node.props.member);
    for (const tab of tabNodes) {
      const rendered = tab.type(tab.props);
      assert.ok(rendered.props.style.maxWidth <= 180);
      assert.equal(textOf(rendered).includes(tab.props.member.name), true);
    }
  }
});
test('weekday headers agree with Sunday and Monday grid ordering', () => {
  const f = screenMocks({});
  const Header = load('src/components/Calendar/WeekdayHeader.tsx', {
    ...f.mocks, '@/utils/calendarUtils': calendar,
  }).default;
  assert.equal(textOf(Header({ weekStart: 'sunday' })), 'SMTWTFS');
  assert.equal(textOf(Header({ weekStart: 'monday' })), 'MTWTFSS');
});
