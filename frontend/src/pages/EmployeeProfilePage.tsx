import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCareerData } from '../context/careerDataStore'
import { formatRussianCount, getProgress, getRecommendations } from '../services/careerData'
import type { Recommendation } from '../types/career'

const initials = (name: string) => name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
const statusText: Record<string, string> = { enrolled: 'Записан', completion_pending: 'Ожидает подтверждения', completed: 'Завершено', in_progress: 'В процессе', dropped: 'Прервано', no_show: 'Пропуск', declined: 'Отказ', overdue: 'Просрочено' }
const statusClass = (status: string) => status === 'completed' ? '' : ['declined', 'no_show', 'dropped', 'overdue'].includes(status) ? 'bad' : 'neutral'

export function EmployeeProfilePage() {
  const { employeeId } = useParams()
  const { dataset, loading, error } = useCareerData()
  const employee = dataset?.employees.find((item) => item.employee_id === employeeId)
  const progress = useMemo(() => dataset && employee ? getProgress(dataset, employee) : null, [dataset, employee])
  const recommendations = useMemo(() => dataset && employee ? getRecommendations(dataset, employee) : [], [dataset, employee])
  const history = useMemo(() => dataset?.activities.filter((item) => item.employee_id === employeeId).sort((a, b) => b.date.localeCompare(a.date)) ?? [], [dataset, employeeId])
  if (loading) return <div className="notice">Загружаем профиль…</div>
  if (error) return <div className="notice error">{error}</div>
  if (!dataset || !employee) return <div><div className="notice">Сотрудник {employeeId} не найден.</div><Link className="btn" to="/employees">← К списку сотрудников</Link></div>

  const shownGaps = progress?.gaps.slice(0, 7) ?? []
  const selectedGoal = employee.career_goal
  const vacancyClosed = employee.vacancy_status === 'closed'
  const progressLabel = !progress?.grade ? 'Цель не определена' : progress.percentage === null ? 'Требования не настроены' : `${progress.percentage}%`
  const noStepMessage = vacancyClosed ? 'Вакансия закрыта. Сотруднику нужно выбрать новую карьерную цель.' : progress?.grade && progress.percentage === null ? 'Требования карьерной цели ещё не настроены.' : 'Нет доступного шага для текущих разрывов. Возможно, нужен новый каталог активностей или цель развития.'
  const eventTitle = (eventId: string) => dataset.events.find((item) => item.event_id === eventId)?.title ?? eventId

  return <>
    <div className="page-head"><div><p className="eyebrow">Карьерный профиль</p><p className="page-subtitle"><Link to="/employees">Сотрудники</Link>　/　{employee.external_id ?? employee.employee_id}</p></div><Link className="btn" to="/employees">← Все сотрудники</Link></div>
    <section className="profile-top"><div className="profile-identity"><div className="profile-avatar">{initials(employee.full_name)}</div><div><h1 className="profile-name">{employee.full_name}</h1><p className="profile-meta">{employee.role} <span>·</span> {employee.department} <span>·</span> {employee.tenure_months} мес. в компании</p></div></div><div className="profile-actions"><span className={`grade-pill ${employee.grade.toLowerCase()}`}>{employee.grade}</span><button className="btn" onClick={() => window.print()}>⤓ <span>Печать профиля</span></button></div></section>
    <div className="profile-grid">
      <div className="stack">
        <section className="card progress-card"><div className="progress-line"><strong>Соответствие карьерной цели</strong><span>{progressLabel}</span></div>{progress?.grade && progress.percentage !== null && <><div className="progress-track"><div className="progress-fill" style={{ width: `${progress.percentage}%` }} /></div><div className="progress-foot"><span>Текущий: {employee.grade}</span><span>Цель: {progress.grade}</span></div></>}</section>
        <section className="card"><div className="card-head"><h2 className="card-title">Зоны роста по навыкам</h2><span className="card-caption">Требования для {progress?.grade ?? 'текущего грейда'}</span></div>{shownGaps.length ? <div className="skill-list">{shownGaps.map(({ id, skill, current, required, critical }) => <div className="skill-row" key={id}><div className="skill-name">{skill?.name ?? id}{critical && <em>КРИТИЧНЫЙ</em>}</div><div className="skill-levels" aria-label={`Уровень ${current} из 5`}>{[1, 2, 3, 4, 5].map((level) => <span key={level} className={`skill-step ${level <= current ? 'filled' : ''}`} />)}</div><div className="gap-value">{current}/{required}</div></div>)}</div> : <div className="empty">Разрывы не найдены. Если цель не определена, сначала выберите её в кабинете сотрудника.</div>}</section>
        <section className="card"><div className="card-head"><h2 className="card-title">История развития</h2><span className="card-caption">{history.length} записей</span></div>{history.length ? <div className="history-list">{history.slice(0, 6).map((activity) => <div className="history-item" key={activity.record_id}><div><div className="history-event">{eventTitle(activity.event_id)}</div><div className="history-date">{activity.date}{activity.completion_pct !== null ? ` · ${activity.completion_pct}%` : ''}</div></div><span className={`status ${statusClass(activity.status)}`}>{statusText[activity.status] ?? activity.status}</span></div>)}</div> : <div className="empty">История активностей пока пуста.</div>}</section>
      </div>
      <div className="stack">
        <section className="card goal-card"><div className="goal-heading"><span className="goal-mark">✦</span> Карьерная цель</div>{selectedGoal ? <><div className="goal-text">{selectedGoal.target_grade} · {selectedGoal.target_role}</div><div className="goal-small">{vacancyClosed ? 'Вакансия закрыта — требуется новая цель' : 'Цель сотрудника'}</div></> : <><div className="goal-text">Пока не задана</div><div className="goal-small">Траектория показана к следующему грейду</div></>}</section>
        <section className="card recommendation-card"><div className="card-head"><div><h2 className="card-title">Следующие шаги</h2><span className="card-caption">Персональные рекомендации по навыкам и истории</span></div></div>{recommendations.length ? recommendations.map((recommendation) => <RecommendationCard key={recommendation.event.event_id} recommendation={recommendation} />) : <div className="empty">{noStepMessage}</div>}</section>
        <div className="notice">Показаны подтверждённые навыки из базы и требования карьерной цели. Подбор активностей — предварительный расчёт для HR. Завершение обучения требует независимого подтверждения.</div>
      </div>
    </div>
  </>
}

function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const { event, reasons, impacts } = recommendation
  const totalGain = impacts.reduce((sum, impact) => sum + impact.after - impact.current, 0)
  return <article className="recommendation-entry"><div className="recommendation-banner"><div className="recommendation-kicker">Рекомендуемый шаг</div><h3 className="recommendation-title">{event.title}</h3><div className="recommendation-meta"><span>{event.format === 'self_paced' ? 'В своём темпе' : event.format === 'online' ? 'Онлайн' : 'Офлайн'}</span><span>◷ {event.duration_hours} ч</span><span>↗ +{formatRussianCount(totalGain, ['уровень навыка', 'уровня навыков', 'уровней навыков'])}</span></div></div><div className="reasons">{reasons.slice(0, 4).map((reason, index) => <div className="reason" key={`${reason.label}-${index}`}><span className="reason-icon">{reason.icon}</span><div><strong>{reason.label}</strong><p>{reason.detail}</p></div></div>)}</div><div className="recommendation-foot"><span className="card-caption">{impacts.map((impact) => impact.skill.name).join(', ') || 'Развивающая активность'}</span><span className="card-caption">Подтверждение — в кабинете оценщика</span></div></article>
}
