import type { CareerLadderNode, CareerRole, Quest, Skill, UserProfile } from '../types/career.ts';
import { api, ApiError, allPages } from './api.ts';
import type { Page } from './api.ts';

export interface Preferences {
  ui_mode: 'classic' | 'rpg';
  locale: 'ru' | 'kk' | 'en';
  reduced_motion: boolean;
}

interface Me {
  user: Preferences & { id: string; login: string; role: string };
  employee: { id: string; full_name: string; role_level_id: string };
}
interface CatalogSkill { id: string; name: string; category: string; description?: string }
interface EmployeeSkill {
  skill_id: string;
  verified_level: number;
  claimed_level: number;
  provenance: string;
  assessed_on: string | null;
}
interface Claim { skill_id: string | null; claimed_level: number | null; status: string }
export interface Enrollment { id: string; activity_id: string; status: string; session_id?: string | null; title?: string }
export interface CompletionRequest { id: string; enrollment_id: string; status: string }
interface Track { id: string; name: string }
interface Grade { id: string; name: string }
interface RoleLevel { id: string; track_id: string; grade_id: string }
interface Requirement { role_level_id: string; skill_id: string; required_level: number; critical: boolean }
interface Transition { from_level_id: string; to_level_id: string; kind: string }
interface CareerTracks extends Page<Track> {
  grades: Grade[];
  role_levels: RoleLevel[];
  requirements: Requirement[];
  transitions: Transition[];
}
interface CareerMap {
  official_role: string;
  official_grade: string;
  target_role_level_id: string | null;
  coverage: number | null;
  ready_for_review: boolean;
  reason_code: string;
  requirements: Array<{ skill_id: string; verified_level: number; required_level: number; critical: boolean; satisfied: boolean }>;
  gaps: Array<{ skill_id: string; current_level: number; required_level: number; critical: boolean }>;
}
interface Vacancy { id: string; title: string; role_level_id: string; status: string }
interface Activity {
  id: string;
  title: string;
  description: string;
  kind: string;
  format: string;
  duration_hours: number;
  grants_verified: boolean;
  sessions: Array<{ id: string; starts_on: string }>;
  prerequisites: Record<string, number>;
  effects: Array<{ skill_id: string; gain: number; max_level: number }>;
}
interface RecommendationItem {
  activity_id: string;
  position: number;
  explanation: {
    next_session: string | null;
    coverage_gain: number;
    develops_skills: Array<{ skill_id: string; current_level: number; expected_level: number; required_level: number | null }>;
    messages?: string[];
  };
}
interface RecommendationRun { is_current: boolean; items: RecommendationItem[] }

export interface Workspace {
  user: UserProfile;
  skills: Skill[];
  quests: Quest[];
  ladder: CareerLadderNode[];
  roles: CareerRole[];
  catalogSkills: Array<{ id: string; name: string }>;
  acceptedQuestIds: string[];
  targetRoleLevelId: string | null;
  preferences: Preferences;
  enrollments: Enrollment[];
  completionRequests: CompletionRequest[];
}

export interface WorkspaceSource {
  me: Me;
  employeeSkills: EmployeeSkill[];
  catalogSkills: CatalogSkill[];
  careerMap: CareerMap;
  tracks: CareerTracks;
  claims: Claim[];
  enrollments: Enrollment[];
  vacancies: Array<Vacancy & { match: CareerMap }>;
  recommendations: RecommendationRun;
  activities: Activity[];
  activityCatalog?: Array<{ id: string; title: string }>;
  completionRequests?: CompletionRequest[];
}

function skillCategory(category: string): Skill['category'] {
  if (/architect|design|архитект/i.test(category)) return 'architecture';
  if (/devops|cloud|infra|инфра/i.test(category)) return 'devops';
  if (/lead|soft|manage|лидер|управл/i.test(category)) return 'leadership';
  if (/data|analyt|данн/i.test(category)) return 'data';
  return 'core';
}

function activityType(kind: string): Quest['type'] {
  if (/mentor/i.test(kind)) return 'Mentorship';
  if (/project/i.test(kind)) return 'Project';
  if (/assessment|trial|test/i.test(kind)) return 'Trial';
  return 'Workshop';
}

function orderedLevels(levels: RoleLevel[], transitions: Transition[]): RoleLevel[] {
  const remaining = new Map(levels.map(level => [level.id, level]));
  const result: RoleLevel[] = [];
  while (remaining.size) {
    const root = [...remaining.values()].find(level => !transitions.some(edge =>
      edge.to_level_id === level.id && remaining.has(edge.from_level_id))) ?? remaining.values().next().value!;
    result.push(root);
    remaining.delete(root.id);
  }
  return result;
}

/** The adapter only presents confirmed levels and the server's saved recommendations. */
export function normalizeWorkspace(source: WorkspaceSource): Workspace {
  const { me, careerMap, tracks, enrollments } = source;
  const skillById = new Map(source.catalogSkills.map(skill => [skill.id, skill]));
  const levelById = new Map(source.employeeSkills.map(skill => [skill.skill_id, skill.verified_level]));
  const roleById = new Map(tracks.role_levels.map(role => [role.id, role]));
  const trackById = new Map(tracks.items.map(track => [track.id, track]));
  const gradeById = new Map(tracks.grades.map(grade => [grade.id, grade]));
  const skillName = (id: string) => skillById.get(id)?.name ?? 'Навык из каталога';
  const target = roleById.get(careerMap.target_role_level_id ?? '');
  const currentRole = roleById.get(me.employee.role_level_id);
  const targetGrade = target ? gradeById.get(target.grade_id)?.name ?? null : null;
  const targetRole = target ? trackById.get(target.track_id)?.name ?? null : null;

  const skills = source.employeeSkills.map((record): Skill => {
    const catalog = skillById.get(record.skill_id);
    const pending = source.claims.filter(claim => claim.skill_id === record.skill_id
      && ['submitted', 'in_review'].includes(claim.status));
    const claimed = Math.max(record.claimed_level, ...pending.map(claim => claim.claimed_level ?? 0));
    const provenance: Record<string, string> = {
      demo_assessment: 'Подтверждённая оценка демопрофиля',
      imported_assessment: 'Подтверждённая оценка из кадровой системы',
      confirmed_activity: 'Подтверждённое завершение обучения',
      reviewed_assessment: 'Подтверждено проверкой',
      self_assessment: 'Самооценка',
    };
    return {
      id: record.skill_id,
      name: catalog?.name ?? skillName(record.skill_id),
      currentLevel: record.verified_level,
      claimedLevel: claimed,
      maxLevel: 5,
      status: record.verified_level > 0 ? 'verified' : 'self_reported',
      evidence: `${record.verified_level > 0 ? (provenance[record.provenance] ?? 'Подтверждённый уровень') : 'Уровень ещё не подтверждён'}${record.assessed_on ? ` · ${record.assessed_on}` : ''}${pending.length ? ` · заявка ${claimed}/5 на проверке` : ''}`,
      category: skillCategory(catalog?.category ?? ''),
      pendingReview: pending.length > 0,
    };
  });
  // New claims may exist before an EmployeeSkill record is created.
  for (const claim of source.claims) {
    if (!claim.skill_id || !['submitted', 'in_review'].includes(claim.status) || skills.some(skill => skill.id === claim.skill_id)) continue;
    skills.push({ id: claim.skill_id, name: skillName(claim.skill_id), currentLevel: 0,
      claimedLevel: claim.claimed_level ?? 0, maxLevel: 5, status: 'self_reported',
      evidence: `Заявка ${claim.claimed_level ?? 0}/5 на проверке`, category: skillCategory(skillById.get(claim.skill_id)?.category ?? ''), pendingReview: true });
  }

  const candidateLevels = tracks.role_levels.filter(level => level.track_id === currentRole?.track_id || level.id === target?.id);
  const ladder = orderedLevels(candidateLevels, tracks.transitions).map((level): CareerLadderNode => {
    const name = trackById.get(level.track_id)?.name ?? '';
    const grade = gradeById.get(level.grade_id)?.name ?? '';
    const requiredSkills = tracks.requirements.filter(requirement => requirement.role_level_id === level.id && requirement.required_level > 0)
      .map(requirement => ({ name: skillName(requirement.skill_id), required: requirement.required_level, current: levelById.get(requirement.skill_id) ?? 0 }));
    return {
      id: level.id, title: `${name} · ${grade}`, tier: grade,
      status: level.id === me.employee.role_level_id ? 'current' : level.id === target?.id ? 'next' : 'locked',
      levelRequirement: 0, requiredSkills,
      description: level.id === me.employee.role_level_id ? 'Текущая официальная должность'
        : requiredSkills.length ? 'Требования к роли. Назначение подтверждается отдельно.' : 'Требования к роли пока не настроены.',
      branch: name,
    };
  });

  const roles = source.vacancies.filter(vacancy => vacancy.status === 'open').map((vacancy): CareerRole => ({
    id: vacancy.id, vacancyId: vacancy.id, roleLevelId: vacancy.role_level_id, title: vacancy.title,
    readinessPercentage: vacancy.match.coverage ?? 0,
    coverageConfigured: vacancy.match.coverage !== null,
    verifiedCount: vacancy.match.requirements.filter(requirement => requirement.satisfied).length,
    totalSkillsNeeded: vacancy.match.requirements.length,
    gaps: vacancy.match.gaps.map(gap => ({ skill: skillName(gap.skill_id), current: gap.current_level, required: gap.required_level, isCritical: gap.critical })),
    unlockCondition: vacancy.match.coverage === null ? 'Требования к вакансии ещё не настроены.'
      : vacancy.match.ready_for_review ? 'Требования выполнены. Для назначения необходимо решение уполномоченного сотрудника.'
        : 'Подтвердите недостающие навыки для выбранной роли.',
    department: trackById.get(roleById.get(vacancy.role_level_id)?.track_id ?? '')?.name ?? 'Внутренняя вакансия',
    status: careerMap.target_role_level_id === vacancy.role_level_id ? 'in_progress' : 'available',
  }));

  const recommendationByActivity = new Map(source.recommendations.items.map(item => [item.activity_id, item]));
  const activityById = new Map(source.activities.map(activity => [activity.id, activity]));
  const activityIds = [...new Set([
    ...[...source.recommendations.items].sort((a, b) => a.position - b.position).map(item => item.activity_id),
    ...enrollments.filter(enrollment => enrollment.status === 'enrolled').map(enrollment => enrollment.activity_id),
  ])];
  const quests = activityIds.flatMap((id): Quest[] => {
    const activity = activityById.get(id);
    if (!activity) return [];
    const recommendation = recommendationByActivity.get(id);
    const impact = recommendation?.explanation.develops_skills.find(skill => skill.required_level !== null && skill.expected_level > skill.current_level)
      ?? recommendation?.explanation.develops_skills[0];
    const effect = activity.effects[0];
    const skillId = impact?.skill_id ?? effect?.skill_id;
    const current = skillId ? levelById.get(skillId) ?? 0 : 0;
    const expected = impact?.expected_level ?? (activity.grants_verified && effect ? Math.max(current, Math.min(5, effect.max_level, current + effect.gain)) : current);
    const required = impact?.required_level ?? careerMap.requirements.find(requirement => requirement.skill_id === skillId)?.required_level ?? 0;
    const enrollment = enrollments.find(item => item.activity_id === id && item.status === 'enrolled');
    return [{
      id, title: activity.title, type: activityType(activity.kind), category: activity.kind,
      targetSkill: skillId ? skillName(skillId) : 'Профессиональное развитие',
      currentSkillLevel: current, nextSkillLevel: expected, skillBonus: Math.max(0, expected - current),
      seniorRequiredLevel: required, xpProgressBonus: recommendation?.explanation.coverage_gain ?? 0,
      xpGain: 0, duration: `${activity.duration_hours} ч`,
      description: activity.description,
      prerequisites: Object.entries(activity.prerequisites).map(([skill, level]) => `${skillName(skill)}: ${level}/5`),
      isAccepted: Boolean(enrollment),
      isCompleted: !recommendation && !enrollment && enrollments.some(item => item.activity_id === id && item.status === 'completed'),
      sessionId: enrollment?.session_id ?? activity.sessions.find(session => session.starts_on === recommendation?.explanation.next_session)?.id ?? null,
      isRecommended: Boolean(recommendation),
      recommendationReasons: recommendation?.explanation.messages ?? [],
    }];
  });

  return {
    user: {
      name: me.employee.full_name, title: careerMap.official_role, tier: careerMap.official_grade,
      targetGrade, targetRole, coverageConfigured: careerMap.coverage !== null,
      level: 0, currentXp: 0, xpToNextLevel: 0, progressToSenior: careerMap.coverage ?? 0,
      avatarUrl: '', guildRank: careerMap.official_grade, skillPoints: 0, gems: 0,
      completedQuestsCount: enrollments.filter(enrollment => enrollment.status === 'completed').length,
    },
    skills, quests, ladder, roles,
    catalogSkills: source.catalogSkills.map(({ id, name }) => ({ id, name })),
    acceptedQuestIds: [...new Set(enrollments.filter(enrollment => enrollment.status === 'enrolled').map(enrollment => enrollment.activity_id))],
    targetRoleLevelId: careerMap.target_role_level_id,
    preferences: { ui_mode: me.user.ui_mode, locale: me.user.locale, reduced_motion: me.user.reduced_motion },
    enrollments: enrollments.map(enrollment => ({ ...enrollment,
      title: source.activityCatalog?.find(activity => activity.id === enrollment.activity_id)?.title
        ?? activityById.get(enrollment.activity_id)?.title ?? 'Учебная активность' })),
    completionRequests: source.completionRequests ?? [],
  };
}

async function recommendations(): Promise<RecommendationRun> {
  try {
    const current = await api<RecommendationRun>('/recommendations/current');
    if (current.is_current) return current;
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.code !== 'stale_recommendation')) throw error;
  }
  return api<RecommendationRun>('/recommendations', { method: 'POST', body: '{}' });
}

async function mapConcurrent<T, R>(items: T[], run: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let index = 0; index < items.length; index += 6) {
    results.push(...await Promise.all(items.slice(index, index + 6).map(run)));
  }
  return results;
}

export async function loadWorkspace(): Promise<Workspace> {
  const [me, employeeSkills, catalogSkills, careerMap, tracks, claims, enrollments, vacancies, run, activityCatalog, completionRequests] = await Promise.all([
    api<Me>('/me'), allPages<EmployeeSkill>('/me/skills'), allPages<CatalogSkill>('/skills'),
    api<CareerMap>('/me/career-map'), allPages<Track, CareerTracks>('/career-tracks'),
    allPages<Claim>('/me/skill-claims'), allPages<Enrollment>('/me/enrollments'),
    allPages<Vacancy>('/vacancies?status=open'), recommendations(),
    allPages<{ id: string; title: string }>('/activities'),
    allPages<CompletionRequest>('/me/completion-requests'),
  ]);
  const ids = [...new Set([...run.items.map(item => item.activity_id),
    ...enrollments.items.filter(enrollment => enrollment.status === 'enrolled').map(enrollment => enrollment.activity_id)])];
  const [activities, matchedVacancies] = await Promise.all([
    mapConcurrent(ids, id => api<Activity>(`/activities/${encodeURIComponent(id)}`)),
    mapConcurrent(vacancies.items, async vacancy => ({ ...vacancy, match: await api<CareerMap>(`/vacancies/${encodeURIComponent(vacancy.id)}/match`) })),
  ]);
  return normalizeWorkspace({ me, employeeSkills: employeeSkills.items, catalogSkills: catalogSkills.items,
    careerMap, tracks, claims: claims.items, enrollments: enrollments.items, vacancies: matchedVacancies,
    recommendations: run, activities, activityCatalog: activityCatalog.items, completionRequests: completionRequests.items });
}
