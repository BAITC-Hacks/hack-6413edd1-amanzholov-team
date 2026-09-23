import type { Activity, CareerDataset, Employee, Event, Grade, Recommendation, RoleProfile, Skill } from '../types/career'

type JsonFile<T> = { meta?: { as_of_date?: string }; employees?: T[]; events?: T[]; skills?: T[]; role_profiles?: T[] }
const gradeOrder = ['Junior', 'Middle', 'Senior', 'Lead']

export function formatRussianCount(count: number, forms: [string, string, string]) {
  const remainder100 = count % 100
  const remainder10 = count % 10
  const form = remainder100 >= 11 && remainder100 <= 14 ? forms[2] : remainder10 === 1 ? forms[0] : remainder10 >= 2 && remainder10 <= 4 ? forms[1] : forms[2]
  return `${count} ${form}`
}

export function parseCsv(text: string): Activity[] {
  const lines = text.trim().split(/\r?\n/)
  const headers = lines.shift()?.split(',') ?? []
  return lines.filter(Boolean).map((line) => {
    const values = line.split(',')
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
    return { ...row, completion_pct: Number(row.completion_pct), score: row.score ? Number(row.score) : null, feedback_rating: row.feedback_rating ? Number(row.feedback_rating) : null } as Activity
  })
}

export async function loadDataset(): Promise<CareerDataset> {
  const [employeesResponse, eventsResponse, skillsResponse, historyResponse] = await Promise.all([
    fetch('/data/employees.json'), fetch('/data/events.json'), fetch('/data/skills.json'), fetch('/data/activity_history.csv'),
  ])
  if (![employeesResponse, eventsResponse, skillsResponse, historyResponse].every((response) => response.ok)) throw new Error('Не удалось загрузить локальный набор данных.')
  const [employeesFile, eventsFile, skillsFile, historyCsv] = await Promise.all([
    employeesResponse.json() as Promise<JsonFile<Employee>>, eventsResponse.json() as Promise<JsonFile<Event>>,
    skillsResponse.json() as Promise<JsonFile<Skill> & { role_profiles?: RoleProfile[] }>, historyResponse.text(),
  ])
  return {
    employees: employeesFile.employees ?? [], events: eventsFile.events ?? [], skills: skillsFile.skills ?? [],
    roleProfiles: skillsFile.role_profiles ?? [], activities: parseCsv(historyCsv),
    asOfDate: employeesFile.meta?.as_of_date ?? '2026-10-01',
  }
}

export function nextGrade(grade: string): Grade | null {
  const index = gradeOrder.indexOf(grade)
  return index >= 0 && index < gradeOrder.length - 1 ? gradeOrder[index + 1] as Grade : null
}

export function getRecommendations(dataset: CareerDataset, employee: Employee): Recommendation[] {
  const targetGrade = nextGrade(employee.grade)
  if (!targetGrade) return []
  const target = dataset.roleProfiles.find((profile) => profile.role === employee.role && profile.grade === targetGrade)
  const currentProfile = dataset.roleProfiles.find((profile) => profile.role === employee.role && profile.grade === employee.grade)
  if (!target || !currentProfile) return []
  const skillById = new Map(dataset.skills.map((skill) => [skill.skill_id, skill]))
  const history = dataset.activities.filter((activity) => activity.employee_id === employee.employee_id)
  const completedIds = new Set(history.filter((activity) => activity.status === 'completed' && activity.event_id !== 'EV_036').map((activity) => activity.event_id))
  const gaps = Object.entries(target.required_skills).filter(([id, level]) => (employee.skills[id] ?? 0) < level)
  const criticalIds = new Set(target.critical_skills)

  return dataset.events.filter((event) => {
    if (event.mandatory || completedIds.has(event.event_id) || !event.target_roles.includes(employee.role)) return false
    if (!event.target_grades.includes(employee.grade) && !event.target_grades.includes(targetGrade)) return false
    return event.develops_skills.some(({ skill_id }) => gaps.some(([gapId]) => gapId === skill_id))
  }).map((event) => {
    const impacts = event.develops_skills.flatMap((gain) => {
      const skill = skillById.get(gain.skill_id)
      const current = employee.skills[gain.skill_id] ?? 0
      const required = target.required_skills[gain.skill_id] ?? 0
      return skill && required > current ? [{ skill, current, after: Math.min(current + gain.gain, gain.max_level), required }] : []
    })
    const relevantIds = new Set(impacts.map(({ skill }) => skill.skill_id))
    const improvesCritical = impacts.some(({ skill }) => criticalIds.has(skill.skill_id))
    const eligibleHistory = history.filter((activity) => {
      const pastEvent = dataset.events.find((candidate) => candidate.event_id === activity.event_id)
      return pastEvent && pastEvent.develops_skills.some(({ skill_id }) => relevantIds.has(skill_id))
    })
    const negativeHistory = eligibleHistory.filter((activity) => ['no_show', 'declined', 'dropped', 'overdue'].includes(activity.status))
    const completedHistory = eligibleHistory.filter((activity) => activity.status === 'completed')
    const meetsPrerequisites = Object.entries(event.prerequisites).every(([id, level]) => (employee.skills[id] ?? 0) >= level)
    const usefulGain = impacts.reduce((sum, impact) => sum + Math.max(0, Math.min(impact.after, impact.required) - impact.current), 0)
    const score = usefulGain * 10 + (improvesCritical ? 18 : 0) + (completedHistory.length ? 5 : 0) + (meetsPrerequisites ? 4 : -100) - negativeHistory.length * 12
    const mainImpact = impacts[0]
    const historyReason = negativeHistory.length
      ? { label: 'История участия', detail: `Есть ${formatRussianCount(negativeHistory.length, ['факт пропуска или отказа', 'факта пропуска или отказа', 'фактов пропусков или отказов'])} в похожих активностях; это снизило приоритет шага.`, icon: '↘' }
      : completedHistory.length
        ? { label: 'История участия', detail: `Есть ${completedHistory.length} успешно завершённых похожих активностей.`, icon: '✓' }
        : { label: 'История участия', detail: 'В истории нет похожих отказов или пропусков; дополнительный штраф не применён.', icon: '↗' }
    const reasons = [
      { label: `Карьерный переход: ${employee.grade} → ${targetGrade}`, detail: `Активность предназначена для роли ${employee.role} и согласуется с целью следующего грейда.`, icon: '↗' },
      ...(mainImpact ? [{ label: `Разрыв: ${mainImpact.skill.name} ${mainImpact.current}/${mainImpact.required}`, detail: `Завершение поднимет навык примерно до ${mainImpact.after} по правилу gain/max_level.`, icon: '◎' }] : []),
      ...(mainImpact ? [{ label: criticalIds.has(mainImpact.skill.skill_id) ? 'Критичное требование роли' : 'Требование следующего грейда', detail: `${mainImpact.skill.name}: целевой уровень ${mainImpact.required}${criticalIds.has(mainImpact.skill.skill_id) ? ', навык отмечен критичным для повышения' : ' по профилю роли'}.`, icon: criticalIds.has(mainImpact.skill.skill_id) ? '✦' : '◎' }] : []),
      historyReason,
      ...(!meetsPrerequisites ? [{ label: 'Не выполнены prerequisites', detail: 'Необходимо сначала закрыть предварительные требования активности.', icon: '!' }] : []),
    ]
    return { event, score, impacts, reasons }
  }).filter((recommendation) => recommendation.score > 0)
    .sort((a, b) => b.score - a.score || a.event.event_id.localeCompare(b.event.event_id)).slice(0, 3)
}

export function getProgress(dataset: CareerDataset, employee: Employee) {
  const grade = nextGrade(employee.grade)
  if (!grade) return { grade: null, percentage: 100, gaps: [], criticalGaps: 0 }
  const profile = dataset.roleProfiles.find((item) => item.role === employee.role && item.grade === grade)
  if (!profile) return { grade, percentage: 0, gaps: [], criticalGaps: 0 }
  const gaps = Object.entries(profile.required_skills).map(([id, required]) => ({ id, required, current: employee.skills[id] ?? 0, skill: dataset.skills.find((skill) => skill.skill_id === id), critical: profile.critical_skills.includes(id) })).filter((item) => item.current < item.required)
  const pairs = Object.entries(profile.required_skills)
  const percentage = pairs.length ? Math.round(pairs.reduce((sum, [id, required]) => sum + Math.min(employee.skills[id] ?? 0, required) / required, 0) / pairs.length * 100) : 100
  return { grade, percentage, gaps: gaps.sort((a, b) => Number(b.critical) - Number(a.critical) || (a.current / a.required) - (b.current / b.required)), criticalGaps: gaps.filter((item) => item.critical).length }
}
