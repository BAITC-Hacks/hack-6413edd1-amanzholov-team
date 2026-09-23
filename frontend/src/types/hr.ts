export type Page<T> = { items: T[]; total: number; offset: number; limit: number }

export type ReportInfo = { as_of_date: string; employee_count: number; since: string | null }
export type OverviewReport = ReportInfo & {
  participations: number
  completed: number
  with_explicit_goal: number
}
export type SkillGap = {
  role_level_id: string
  vacancy_id: string | null
  skill_id: string
  employees_with_gap: number
}
export type SupportEmployee = { employee_id: string; reason_code: string }
export type SkillGapReport = ReportInfo & Page<SkillGap>
export type SupportReport = ReportInfo & Page<SupportEmployee>

export type NamedItem = { id: string; name: string }
export type CareerCatalog = Page<NamedItem> & {
  role_levels: { id: string; track_id: string; grade_id: string }[]
  grades: NamedItem[]
}
export type Vacancy = { id: string; title: string }
export type HrCatalog = {
  skills: Map<string, string>
  roles: Map<string, string>
  vacancies: Map<string, string>
}

export type EmployeeDetail = {
  employee: { id: string; full_name: string; last_review_date: string; hire_date: string }
  career_map: {
    official_role: string
    official_grade: string
    target_role_level_id: string | null
    coverage: number | null
    ready_for_review: boolean
    goal_reason: string
    reason_code: string
    vacancy_status: string | null
    gaps: { skill_id: string; current_level: number; required_level: number; critical: boolean }[]
  }
}
