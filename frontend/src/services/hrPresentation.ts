import type { CareerCatalog, HrCatalog, NamedItem, SkillGap, Vacancy } from '../types/hr.ts'

const numberFormat = new Intl.NumberFormat('ru-RU')
const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

export function formatNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? numberFormat.format(value) : '—'
}

export function formatDate(value: string | null | undefined) {
  if (!value) return 'Дата не указана'
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? 'Дата не указана' : dateFormat.format(date)
}

export function peopleCount(count: number) {
  const hundred = count % 100
  const ten = count % 10
  const ending = hundred >= 11 && hundred <= 14 ? 'сотрудников' : ten === 1 ? 'сотрудник' : ten >= 2 && ten <= 4 ? 'сотрудника' : 'сотрудников'
  return `${formatNumber(count)} ${ending}`
}

export function percent(part: number, total: number) {
  return total > 0 ? Math.max(0, Math.min(100, Math.round(part / total * 100))) : 0
}

export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('ru-RU') || '—'
}

export function createCatalog(skills: NamedItem[] = [], careers?: CareerCatalog, vacancies: Vacancy[] = []): HrCatalog {
  const tracks = new Map(careers?.items.map((track) => [track.id, track.name]))
  const grades = new Map(careers?.grades.map((grade) => [grade.id, grade.name]))
  return {
    skills: new Map(skills.map((skill) => [skill.id, skill.name])),
    roles: new Map(careers?.role_levels.map((role) => [
      role.id,
      [tracks.get(role.track_id), grades.get(role.grade_id)].filter(Boolean).join(' · ') || 'Название должности недоступно',
    ])),
    vacancies: new Map(vacancies.map((vacancy) => [vacancy.id, vacancy.title])),
  }
}

export function skillName(id: string, catalog: HrCatalog) {
  return catalog.skills.get(id) || 'Название навыка недоступно'
}

export function goalName(gap: Pick<SkillGap, 'role_level_id' | 'vacancy_id'>, catalog: HrCatalog) {
  if (gap.vacancy_id) return catalog.vacancies.get(gap.vacancy_id) || 'Название вакансии недоступно'
  return catalog.roles.get(gap.role_level_id) || 'Название должности недоступно'
}

// A vacancy and a career level can have different requirements for the same skill.
export function gapKey(gap: SkillGap) {
  return JSON.stringify([gap.role_level_id, gap.vacancy_id, gap.skill_id])
}

const supportReasons: Record<string, { title: string; action: string }> = {
  no_goal: { title: 'Не выбрана цель развития', action: 'Обсудите с сотрудником и руководителем желаемую должность. Сотрудник сможет выбрать цель в мобильном приложении.' },
  requirements_not_configured: { title: 'Нужно уточнить требования', action: 'Согласуйте с руководителем, какие навыки нужны для целевой должности, и передайте их ответственному за карьерные профили.' },
  no_eligible_activity: { title: 'Не подобран следующий шаг', action: 'Уточните текущую цель и доступные программы. Если требования по навыкам уже выполнены, обсудите следующий карьерный шаг.' },
  stale_recommendation: { title: 'План развития требует обновления', action: 'Предложите сотруднику обновить рекомендации в мобильном приложении с учётом актуальной цели и навыков.' },
}

export function supportReason(code: string, career?: { vacancy_status: string | null; ready_for_review: boolean }) {
  if (career?.vacancy_status === 'closed') return { title: 'Целевая вакансия закрыта', action: 'Обсудите с сотрудником другую вакансию или карьерную цель и помогите выбрать новое направление развития.' }
  if (code === 'no_eligible_activity' && career?.ready_for_review) return { title: 'Требования по навыкам выполнены', action: 'Обсудите с руководителем следующий карьерный шаг и возможность рассмотрения повышения. Решение принимается отдельно.' }
  if (code === 'no_eligible_activity' && career) return { title: 'Нет подходящего обучения', action: 'Подберите программу по недостающим навыкам или обсудите индивидуальное обучение с руководителем.' }
  return supportReasons[code] ?? { title: 'Нужна помощь с планом развития', action: 'Обсудите с сотрудником и руководителем следующий шаг в развитии.' }
}
