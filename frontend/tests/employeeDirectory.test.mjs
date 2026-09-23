import assert from 'node:assert/strict'
import test from 'node:test'
import { buildEmployeeDirectory, filterEmployeeDirectory } from '../src/services/employeeDirectory.ts'

const filters = { query: '', department: '', role: '', grade: '', segment: 'all', sort: 'name' }
function fixture() {
  const person = (id, name, goal, skills, target = true) => ({
    employee_id: id, external_id: `EMP-${id}`, full_name: name, department: 'Разработка',
    role: 'Backend', grade: 'Junior', tenure_months: 12, skills,
    career_goal: goal ? { target_role: 'Backend', target_grade: 'Middle' } : null,
    target_profile: target ? { role: 'Backend', grade: 'Middle', required_skills: { sql: 4 }, critical_skills: ['sql'] } : null,
  })
  return {
    employees: [person('1', 'Алия Жумабаева', false, { sql: 4 }), person('2', 'Борис Иванов', true, { sql: 2 }), person('3', 'Виктор Петров', false, {}, false)],
    activities: [], skills: [{ skill_id: 'sql', name: 'SQL' }], asOfDate: '2026-09-23',
  }
}

test('an inferred next grade is not an explicit career goal', () => {
  const entries = buildEmployeeDirectory(fixture())
  assert.equal(entries[0].progress.percentage, 100)
  assert.deepEqual(filterEmployeeDirectory(entries, { ...filters, segment: 'with-goal' }).map((entry) => entry.employee.employee_id), ['2'])
  assert.deepEqual(filterEmployeeDirectory(entries, { ...filters, segment: 'without-goal' }).map((entry) => entry.employee.employee_id), ['1', '3'])
})

test('learning counts exclude pending, completed, negative and future participation', () => {
  const data = fixture()
  data.activities = ['enrolled', 'in_progress', 'completion_pending', 'completed', 'overdue', 'declined'].map((status) => ({ employee_id: '1', date: '2026-09-22', status }))
  data.activities.push({ employee_id: '2', date: '2026-09-24', status: 'enrolled' }, { employee_id: '3', date: '2026-09-22', status: 'completion_pending' })
  const entries = buildEmployeeDirectory(data)
  assert.deepEqual(entries[0].learning, { active: 2, pending: 1 })
  assert.deepEqual(filterEmployeeDirectory(entries, { ...filters, segment: 'learning' }).map((entry) => entry.employee.employee_id), ['1'])
})

test('search combines words across name, role, department and external ID with other filters', () => {
  const entries = buildEmployeeDirectory(fixture())
  assert.equal(filterEmployeeDirectory(entries, { ...filters, query: '  АЛИЯ backend ', department: 'Разработка', grade: 'Junior' }).length, 1)
  assert.equal(filterEmployeeDirectory(entries, { ...filters, query: 'EMP-2', role: 'Backend' })[0].employee.full_name, 'Борис Иванов')
  assert.equal(filterEmployeeDirectory(entries, { ...filters, query: 'Алия', department: 'Продажи' }).length, 0)
})

test('progress sorting puts missing targets last and preserves the original order', () => {
  const entries = buildEmployeeDirectory(fixture()).reverse()
  const sorted = filterEmployeeDirectory(entries, { ...filters, sort: 'progress' })
  assert.deepEqual(sorted.map((entry) => entry.progress.percentage), [100, 50, null])
  assert.equal(entries[0].employee.employee_id, '3')
})

test('closed vacancies do not rank ahead of available career targets', () => {
  const data = fixture()
  data.employees[0].vacancy_status = 'closed'
  const sorted = filterEmployeeDirectory(buildEmployeeDirectory(data), { ...filters, sort: 'progress' })
  assert.equal(sorted[0].employee.employee_id, '2')
})
