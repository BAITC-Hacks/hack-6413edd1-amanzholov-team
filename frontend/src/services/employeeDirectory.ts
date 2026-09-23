import { getProgress } from './careerData.ts'
import type { CareerDataset } from '../types/career'

export type DirectorySegment = 'all' | 'with-goal' | 'without-goal' | 'learning'
export type DirectorySort = 'name' | 'name-desc' | 'progress' | 'tenure'
export type DirectoryFilters = {
  query: string; department: string; role: string; grade: string
  segment: DirectorySegment; sort: DirectorySort
}

export function buildEmployeeDirectory(dataset: CareerDataset) {
  const learning = new Map<string, { active: number; pending: number }>()
  for (const activity of dataset.activities) {
    if (activity.date > dataset.asOfDate) continue
    const counts = learning.get(activity.employee_id) ?? { active: 0, pending: 0 }
    if (activity.status === 'enrolled' || activity.status === 'in_progress') counts.active++
    if (activity.status === 'completion_pending') counts.pending++
    learning.set(activity.employee_id, counts)
  }
  return dataset.employees.map((employee) => ({
    employee,
    progress: getProgress(dataset, employee),
    learning: learning.get(employee.employee_id) ?? { active: 0, pending: 0 },
  }))
}

export type DirectoryEntry = ReturnType<typeof buildEmployeeDirectory>[number]

export function filterEmployeeDirectory(entries: DirectoryEntry[], filters: DirectoryFilters) {
  const words = filters.query.trim().toLocaleLowerCase('ru').split(/\s+/).filter(Boolean)
  return entries.filter(({ employee, learning }) => {
    const text = [employee.full_name, employee.external_id, employee.employee_id, employee.role, employee.department].join(' ').toLocaleLowerCase('ru')
    return words.every((word) => text.includes(word))
      && (!filters.department || employee.department === filters.department)
      && (!filters.role || employee.role === filters.role)
      && (!filters.grade || employee.grade === filters.grade)
      && (filters.segment !== 'with-goal' || !!employee.career_goal)
      && (filters.segment !== 'without-goal' || !employee.career_goal)
      && (filters.segment !== 'learning' || learning.active > 0)
  }).sort((a, b) => {
    const byName = a.employee.full_name.localeCompare(b.employee.full_name, 'ru')
      || a.employee.employee_id.localeCompare(b.employee.employee_id)
    if (filters.sort === 'progress') {
      const coverage = (entry: DirectoryEntry) => entry.employee.vacancy_status === 'closed' ? -1 : entry.progress.percentage ?? -1
      return coverage(b) - coverage(a) || byName
    }
    if (filters.sort === 'tenure') return b.employee.tenure_months - a.employee.tenure_months || byName
    return filters.sort === 'name-desc' ? -byName : byName
  })
}
