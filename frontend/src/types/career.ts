export type Grade = 'Junior' | 'Middle' | 'Senior' | 'Lead'
export type SkillLevel = 0 | 1 | 2 | 3 | 4 | 5
export type Employee = {
  employee_id: string; full_name: string; department: string; role: string; grade: Grade
  manager_id: string | null; hire_date: string; tenure_months: number; work_format: string
  preferred_language: string; career_goal: { target_role: string; target_grade: Grade } | null
  skills: Record<string, number>; last_review_date: string
}
export type Skill = { skill_id: string; name: string; type: 'hard' | 'soft'; category: string; description: string }
export type RoleProfile = { role: string; grade: Grade; required_skills: Record<string, number>; critical_skills: string[] }
export type Event = {
  event_id: string; title: string; description: string
  type: 'compliance' | 'onboarding' | 'course' | 'workshop' | 'mentoring' | 'certification' | 'meetup'
  format: 'online' | 'offline' | 'self_paced'; duration_hours: number; mandatory: boolean
  target_roles: string[]; target_grades: Grade[]
  develops_skills: Array<{ skill_id: string; gain: number; max_level: number }>
  prerequisites: Record<string, number>; upcoming_sessions: string[]
}
export type Activity = {
  record_id: string; employee_id: string; event_id: string; date: string; due_date: string
  status: 'completed' | 'in_progress' | 'dropped' | 'no_show' | 'declined' | 'overdue'
  completion_pct: number; score: number | null; feedback_rating: number | null; assigned_by: string
}
export type CareerDataset = { employees: Employee[]; events: Event[]; skills: Skill[]; roleProfiles: RoleProfile[]; activities: Activity[]; asOfDate: string }
export type RecommendationReason = { label: string; detail: string; icon: string }
export type Recommendation = { event: Event; score: number; impacts: Array<{ skill: Skill; current: number; after: number; required: number }>; reasons: RecommendationReason[] }
