import assert from 'node:assert/strict'
import test from 'node:test'
import { getProgress, getRecommendations } from '../src/services/careerData.ts'

function fixture() {
  const employee = {
    employee_id: 'employee', role: 'Backend', grade: 'Junior', skills: { sql: 3 },
    vacancy_status: 'open',
    target_profile: {
      role: 'Backend', grade: 'Middle', required_skills: { sql: 4 }, critical_skills: ['sql'],
    },
  }
  const dataset = {
    asOfDate: '2026-10-01', employees: [employee], activities: [],
    roleProfiles: [{ role: 'Backend', grade: 'Junior', required_skills: { sql: 2 }, critical_skills: [] }],
    skills: [{ skill_id: 'sql', name: 'SQL' }],
    events: [{
      event_id: 'course', target_roles: ['Backend'], target_grades: ['Junior'],
      format: 'self_paced', prerequisites: {},
      develops_skills: [{ skill_id: 'sql', gain: 1, max_level: 4 }],
    }],
  }
  return { employee, dataset }
}

test('closing a vacancy removes its development recommendations', () => {
  const { employee, dataset } = fixture()
  assert.equal(getRecommendations(dataset, employee).length, 1)
  employee.vacancy_status = 'closed'
  assert.deepEqual(getRecommendations(dataset, employee), [])
})

test('an unconfigured target has no coverage percentage or recommendations', () => {
  const { employee, dataset } = fixture()
  employee.target_profile.required_skills = {}
  employee.target_profile.critical_skills = []
  assert.equal(getProgress(dataset, employee).percentage, null)
  assert.deepEqual(getRecommendations(dataset, employee), [])
})

test('a capped skill effect cannot become a recommendation through score bonuses', () => {
  const { employee, dataset } = fixture()
  dataset.events[0].develops_skills[0].max_level = 3
  assert.deepEqual(getRecommendations(dataset, employee), [])
  employee.skills.sql = 4
  employee.target_profile.required_skills.sql = 5
  assert.deepEqual(getRecommendations(dataset, employee), [])
})
