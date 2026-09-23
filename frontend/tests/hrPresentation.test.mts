import assert from 'node:assert/strict'
import test from 'node:test'
import { createCatalog, formatDate, formatNumber, gapKey, goalName, peopleCount, percent, skillName, supportReason } from '../src/services/hrPresentation.ts'

const ids = {
  role: '58a38e81-a5df-57d3-a3d7-c6d42b389ba6',
  skill: '4bf729cf-7a66-5b85-a494-6acf360ff822',
  vacancy: '00000000-0000-4000-8000-000000000001',
}
const catalog = createCatalog(
  [{ id: ids.skill, name: 'Анализ данных' }],
  {
    items: [{ id: 'track', name: 'Аналитик' }], total: 1, offset: 0, limit: 100,
    role_levels: [{ id: ids.role, track_id: 'track', grade_id: 'grade' }],
    grades: [{ id: 'grade', name: 'Senior' }],
  },
  [{ id: ids.vacancy, title: 'Ведущий аналитик' }],
)

test('HR sees skill and career names instead of report identifiers', () => {
  assert.equal(skillName(ids.skill, catalog), 'Анализ данных')
  assert.equal(goalName({ role_level_id: ids.role, vacancy_id: null }, catalog), 'Аналитик · Senior')
  assert.equal(goalName({ role_level_id: ids.role, vacancy_id: ids.vacancy }, catalog), 'Ведущий аналитик')
})

test('missing catalogs never fall back to raw identifiers', () => {
  const empty = createCatalog()
  const visible = [skillName(ids.skill, empty), goalName({ role_level_id: ids.role, vacancy_id: null }, empty), goalName({ role_level_id: ids.role, vacancy_id: ids.vacancy }, empty)]
  for (const label of visible) {
    assert.ok(label.includes('недоступно') || label.includes('недоступна'))
    for (const id of Object.values(ids)) assert.ok(!label.includes(id))
  }
})

test('same skill for vacancy and career level stays in separate groups', () => {
  const base = { role_level_id: ids.role, skill_id: ids.skill, employees_with_gap: 4, vacancy_id: null }
  const vacancy = { ...base, vacancy_id: ids.vacancy }
  assert.notEqual(gapKey(base), gapKey(vacancy))
  assert.equal(new Set([gapKey(base), gapKey(vacancy)]).size, 2)
})

test('zero enrollments show no invented progress, multiple enrollments use enrollment denominator', () => {
  assert.equal(percent(0, 0), 0)
  assert.equal(percent(3, 8), 38)
  assert.equal(percent(8, 8), 100)
  assert.equal(formatNumber(undefined), '—')
  assert.equal(formatNumber(0), '0')
})

test('support reasons produce meaningful Russian explanations without machine codes', () => {
  for (const code of ['no_goal', 'requirements_not_configured', 'no_eligible_activity', 'stale_recommendation', 'new_backend_reason']) {
    const reason = supportReason(code)
    assert.ok(reason.title.length > 10)
    assert.ok(reason.action.length > 30)
    assert.ok(!reason.title.includes(code))
    assert.ok(!reason.action.includes(code))
  }
})

test('business date stays on its calendar day and staff counts are readable', () => {
  assert.equal(formatDate('2026-10-01'), '1 октября 2026 г.')
  assert.equal(formatDate('not-a-date'), 'Дата не указана')
  assert.equal(peopleCount(1), '1 сотрудник')
  assert.equal(peopleCount(4), '4 сотрудника')
  assert.equal(peopleCount(11), '11 сотрудников')
  assert.equal(peopleCount(21), '21 сотрудник')
})

test('absence of training does not imply missing skills when promotion may be considered', () => {
  const reason = supportReason('no_eligible_activity', { ready_for_review: true, vacancy_status: null })
  assert.equal(reason.title, 'Требования по навыкам выполнены')
  assert.ok(reason.action.includes('рассмотрения повышения'))
})

test('closed target vacancy takes priority over complete skill requirements', () => {
  const reason = supportReason('no_eligible_activity', { ready_for_review: true, vacancy_status: 'closed' })
  assert.equal(reason.title, 'Целевая вакансия закрыта')
  assert.ok(!reason.action.includes('повышения'))
})
