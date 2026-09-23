import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { api, allPages, ApiError, getSession, setSession, clearSession } from '../src/services/api.ts';
import { loadWorkspace, normalizeWorkspace } from '../src/services/workspace.ts';

const source = () => ({
  me: { user: { id: 'user', login: 'employee', role: 'employee', ui_mode: 'classic', locale: 'ru', reduced_motion: false },
    employee: { id: 'employee', full_name: 'Тест Сотрудник', role_level_id: 'current' } },
  employeeSkills: [{ skill_id: 'sql', verified_level: 1, claimed_level: 5, provenance: 'imported_assessment', assessed_on: null }],
  catalogSkills: [{ id: 'sql', name: 'SQL', category: 'data' }, { id: 'python', name: 'Python', category: 'technical' }],
  careerMap: { official_role: 'Аналитик', official_grade: 'M2', target_role_level_id: 'target', coverage: 25,
    ready_for_review: false, reason_code: 'gaps',
    requirements: [{ skill_id: 'sql', verified_level: 1, required_level: 4, satisfied: false, critical: true }],
    gaps: [{ skill_id: 'sql', current_level: 1, required_level: 4, critical: true }] },
  tracks: { items: [{ id: 'analytics', name: 'Аналитик' }], total: 1, offset: 0, limit: 100,
    grades: [{ id: 'm2', name: 'M2' }, { id: 'm3', name: 'M3' }],
    role_levels: [{ id: 'target', track_id: 'analytics', grade_id: 'm3' }, { id: 'current', track_id: 'analytics', grade_id: 'm2' }],
    transitions: [{ from_level_id: 'current', to_level_id: 'target', kind: 'promotion' }],
    requirements: [{ role_level_id: 'target', skill_id: 'sql', required_level: 4, critical: true }] },
  claims: [{ skill_id: 'sql', claimed_level: 5, status: 'submitted' }, { skill_id: 'python', claimed_level: 3, status: 'in_review' }],
  enrollments: [{ id: 'history', activity_id: 'activity', status: 'completed', session_id: 'old-session' }],
  vacancies: [],
  recommendations: { is_current: true, items: [{ activity_id: 'activity', position: 0,
    explanation: { next_session: '2026-10-10', coverage_gain: 25,
      develops_skills: [{ skill_id: 'sql', current_level: 1, expected_level: 2, required_level: 4 }],
      messages: ['Сокращает разрыв до выбранной цели'] } }] },
  activities: [{ id: 'activity', title: 'SQL Practice', description: 'Практический курс', kind: 'workshop',
    format: 'online', duration_hours: 4, grants_verified: true,
    sessions: [{ id: 'next-session', starts_on: '2026-10-10' }], prerequisites: { sql: 1 },
    effects: [{ skill_id: 'sql', gain: 1, max_level: 5 }] }],
  completionRequests: [{ id: 'completion', enrollment_id: 'history', status: 'confirmed' }],
});

beforeEach(() => {
  const stored = new Map();
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key),
  } });
});
afterEach(() => mock.restoreAll());

test('claims never replace verified skills or official grades; server recommendation supplies effect and session', () => {
  const workspace = normalizeWorkspace(source());
  assert.equal(workspace.skills[0].currentLevel, 1);
  assert.equal(workspace.skills[0].claimedLevel, 5);
  assert.equal(workspace.skills[0].pendingReview, true);
  assert.equal(workspace.skills[1].currentLevel, 0);
  assert.equal(workspace.skills[1].claimedLevel, 3);
  assert.equal(workspace.user.name, 'Тест Сотрудник');
  assert.equal(workspace.user.tier, 'M2');
  assert.equal(workspace.user.targetGrade, 'M3');
  assert.equal(workspace.user.progressToSenior, 25);
  assert.equal(workspace.user.gems, 0);
  assert.equal(workspace.user.currentXp, 0);
  assert.deepEqual(workspace.ladder.map(node => [node.id, node.status]), [['current', 'current'], ['target', 'next']]);
  assert.equal(workspace.quests[0].id, 'activity');
  assert.equal(workspace.quests[0].sessionId, 'next-session');
  assert.equal(workspace.quests[0].skillBonus, 1);
  assert.equal(workspace.quests[0].isCompleted, false, 'eligible repeatable activity remains available after earlier completion');
  assert.equal(workspace.user.completedQuestsCount, 1);
});

test('enrollments persist in the plan when regenerated recommendations omit the activity', () => {
  const input = source();
  input.recommendations.items = [];
  input.enrollments = [{ id: 'enrollment', activity_id: 'activity', status: 'enrolled', session_id: 'next-session' }];
  input.completionRequests = [{ id: 'request', enrollment_id: 'enrollment', status: 'submitted' }];
  const workspace = normalizeWorkspace(input);
  assert.equal(workspace.quests.length, 1);
  assert.equal(workspace.quests[0].isAccepted, true);
  assert.equal(workspace.quests[0].isRecommended, false);
  assert.equal(workspace.quests[0].sessionId, 'next-session');
  assert.deepEqual(workspace.acceptedQuestIds, ['activity']);
  assert.equal(workspace.enrollments[0].title, 'SQL Practice');
  assert.equal(workspace.completionRequests[0].status, 'submitted');
});

test('no target or requirements remains unconfigured; closed vacancies never appear', () => {
  const input = source();
  input.careerMap = { ...input.careerMap, target_role_level_id: null, coverage: null, requirements: [], gaps: [], reason_code: 'no_next_level' };
  input.recommendations.items = [];
  input.employeeSkills = [];
  input.claims = [];
  input.enrollments = [];
  input.vacancies = [
    { id: 'open', title: 'Новая роль', role_level_id: 'target', status: 'open', match: input.careerMap },
    { id: 'closed', title: 'Закрытая роль', role_level_id: 'target', status: 'closed', match: input.careerMap },
  ];
  const workspace = normalizeWorkspace(input);
  assert.equal(workspace.targetRoleLevelId, null);
  assert.equal(workspace.user.targetGrade, null);
  assert.equal(workspace.user.coverageConfigured, false);
  assert.equal(workspace.ladder.some(node => node.status === 'next'), false);
  assert.deepEqual(workspace.skills, []);
  assert.deepEqual(workspace.quests, []);
  assert.equal(workspace.roles.length, 1);
  assert.equal(workspace.roles[0].coverageConfigured, false);
  assert.equal(workspace.roles[0].readinessPercentage, 0);
});

test('employee session is isolated and mutations carry bearer auth and idempotency keys', async () => {
  sessionStorage.setItem('career-quest-hr-session', 'hr-token');
  setSession('employee-token');
  const calls = [];
  mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return Response.json({ saved: true });
  });
  await api('/me/skill-claims', { method: 'POST', body: '{}' });
  await api('/me/preferences', { method: 'PATCH', body: '{}', headers: { 'Idempotency-Key': 'retry-key' } });
  await api('/auth/login', { method: 'POST', body: '{}' });
  await api('/recommendations', { method: 'POST', body: '{}' });
  assert.equal(calls[0].url, '/api/v1/me/skill-claims');
  assert.equal(calls[0].options.headers.get('Authorization'), 'Bearer employee-token');
  assert.equal(calls[0].options.headers.get('Accept-Language'), 'ru');
  assert.match(calls[0].options.headers.get('Idempotency-Key'), /^[\da-f-]{36}$/);
  assert.equal(calls[1].options.headers.get('Idempotency-Key'), 'retry-key');
  assert.equal(calls[2].options.headers.has('Idempotency-Key'), false);
  assert.equal(calls[3].options.headers.has('Idempotency-Key'), false);
  clearSession();
  assert.equal(getSession(), null);
  assert.equal(sessionStorage.getItem('career-quest-hr-session'), 'hr-token');
});

test('paginated collections retain every row and first-page metadata; auth errors retain status', async () => {
  const rows = Array.from({ length: 205 }, (_, index) => ({ id: `${index}` }));
  const urls = [];
  mock.method(globalThis, 'fetch', async url => {
    urls.push(url);
    if (url.includes('/me')) return Response.json({ code: 'invalid_token', message: 'Войдите в систему' }, { status: 401 });
    const parsed = new URL(url, 'http://localhost');
    const offset = Number(parsed.searchParams.get('offset'));
    assert.equal(parsed.searchParams.get('status'), 'open');
    return Response.json({ items: rows.slice(offset, offset + 100), total: rows.length, limit: 100, offset, grades: ['M2'] });
  });
  const result = await allPages('/vacancies?status=open');
  assert.equal(result.items.length, 205);
  assert.deepEqual(result.grades, ['M2']);
  assert.equal(urls.length, 3);
  await assert.rejects(api('/me'), error => error instanceof ApiError && error.status === 401 && error.code === 'invalid_token');
});

test('workspace regenerates stale server recommendations and reads completion requests', async () => {
  const input = source();
  const list = items => ({ items, total: items.length, offset: 0, limit: 100 });
  const pages = {
    '/me': input.me, '/me/skills': list(input.employeeSkills), '/skills': list(input.catalogSkills),
    '/me/career-map': input.careerMap, '/career-tracks': input.tracks,
    '/me/skill-claims': list(input.claims), '/me/enrollments': list(input.enrollments),
    '/vacancies': list([]), '/activities': list(input.activities),
    '/me/completion-requests': list(input.completionRequests), '/activities/activity': input.activities[0],
  };
  let generated = 0;
  mock.method(globalThis, 'fetch', async (url, options) => {
    const path = new URL(url, 'http://localhost').pathname.replace('/api/v1', '');
    if (path === '/recommendations/current') return Response.json({ code: 'stale_recommendation', message: 'Расчёт устарел' }, { status: 409 });
    if (path === '/recommendations') {
      assert.equal(options.method, 'POST');
      generated++;
      return Response.json(input.recommendations);
    }
    assert.ok(path in pages, `unexpected endpoint ${path}`);
    return Response.json(pages[path]);
  });
  const workspace = await loadWorkspace();
  assert.equal(generated, 1);
  assert.equal(workspace.quests[0].title, 'SQL Practice');
  assert.equal(workspace.completionRequests[0].id, 'completion');
});
