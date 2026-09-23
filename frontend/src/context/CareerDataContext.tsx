import { useEffect, useState, type PropsWithChildren } from 'react'
import { loadDataset, parseCsv } from '../services/careerData'
import type { Activity, CareerDataset, Employee } from '../types/career'
import { CareerDataContext } from './careerDataStore'
const storageKey = 'career-quest-local-dataset-v1'

export function CareerDataProvider({ children }: PropsWithChildren) {
  const [dataset, setDataset] = useState<CareerDataset | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    loadDataset().then((loaded) => {
      const saved = localStorage.getItem(storageKey)
      const restored = saved ? JSON.parse(saved) as CareerDataset : loaded
      if (active) { setDataset(restored); setError(null) }
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Не удалось загрузить данные.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const save = (updated: CareerDataset) => {
    setDataset(updated)
    localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  const completeActivity = (employeeId: string, eventId: string) => {
    if (!dataset) return
    const employee = dataset.employees.find((item) => item.employee_id === employeeId)
    const event = dataset.events.find((item) => item.event_id === eventId)
    if (!employee || !event || (eventId !== 'EV_036' && dataset.activities.some((item) => item.employee_id === employeeId && item.event_id === eventId && item.status === 'completed'))) return
    const skills = { ...employee.skills }
    event.develops_skills.forEach(({ skill_id, gain, max_level }) => { skills[skill_id] = Math.min((skills[skill_id] ?? 0) + gain, max_level) })
    const nextActivity: Activity = {
      record_id: `LOCAL_${Date.now()}`, employee_id: employeeId, event_id: eventId, date: dataset.asOfDate,
      due_date: '', status: 'completed', completion_pct: 100, score: null, feedback_rating: null, assigned_by: 'self',
    }
    save({ ...dataset, employees: dataset.employees.map((item) => item.employee_id === employeeId ? { ...item, skills } : item), activities: [...dataset.activities, nextActivity] })
  }

  const importSupplemental = async (employeesFile: File, historyFile: File) => {
    if (!dataset) throw new Error('Локальный набор данных ещё загружается.')
    const parsed = JSON.parse(await employeesFile.text()) as { employees?: Employee[] } | Employee[]
    const incomingEmployees = Array.isArray(parsed) ? parsed : parsed.employees
    const validGrades = new Set(['Junior', 'Middle', 'Senior', 'Lead'])
    const knownSkills = new Set(dataset.skills.map((skill) => skill.skill_id))
    const knownRoleGrades = new Set(dataset.roleProfiles.map((profile) => `${profile.role}|${profile.grade}`))
    if (!Array.isArray(incomingEmployees) || incomingEmployees.length === 0 || incomingEmployees.some((item) =>
      !item.employee_id || !item.full_name || !item.skills || !item.role || !validGrades.has(item.grade) ||
      !knownRoleGrades.has(`${item.role}|${item.grade}`) || Object.keys(item.skills).some((skillId) => !knownSkills.has(skillId)))) {
      throw new Error('В JSON не найден корректный массив сотрудников.')
    }
    const incomingActivities = parseCsv(await historyFile.text())
    const knownEvents = new Set(dataset.events.map((event) => event.event_id))
    if (incomingActivities.some((item) => !knownEvents.has(item.event_id))) throw new Error('История содержит event_id, которого нет в каталоге мероприятий.')
    const employees = new Map(dataset.employees.map((item) => [item.employee_id, item]))
    incomingEmployees.forEach((item) => employees.set(item.employee_id, item))
    const validStatuses = new Set(['completed', 'in_progress', 'dropped', 'no_show', 'declined', 'overdue'])
    if (incomingActivities.some((item) => !item.record_id || !item.employee_id || !item.date || !validStatuses.has(item.status))) throw new Error('CSV содержит некорректную запись истории участия.')
    if (incomingActivities.some((item) => !employees.has(item.employee_id))) throw new Error('История содержит сотрудника, которого нет в загруженном JSON или исходном наборе.')
    const importedIds = new Set(incomingEmployees.map((item) => item.employee_id))
    const activities = dataset.activities.filter((item) => !importedIds.has(item.employee_id))
    const seenRecords = new Set(activities.map((item) => item.record_id))
    incomingActivities.forEach((item) => {
      if (!seenRecords.has(item.record_id)) { activities.push(item); seenRecords.add(item.record_id) }
    })
    save({ ...dataset, employees: [...employees.values()].sort((a, b) => a.employee_id.localeCompare(b.employee_id)), activities })
    return incomingEmployees.length
  }

  const value = { dataset, loading, error, completeActivity, importSupplemental }
  return <CareerDataContext.Provider value={value}>{children}</CareerDataContext.Provider>
}
