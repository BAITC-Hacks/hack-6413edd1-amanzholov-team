import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCareerData } from '../context/careerDataStore'
import { formatRussianCount, getProgress, getRecommendations } from '../services/careerData'
import type { Event, Recommendation } from '../types/career'

const initials = (name: string) => name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
const statusText: Record<string, string> = { completed: 'Завершено', in_progress: 'В процессе', dropped: 'Прервано', no_show: 'Пропуск', declined: 'Отказ', overdue: 'Просрочено' }
const statusClass = (status: string) => status === 'completed' ? '' : ['declined', 'no_show', 'dropped', 'overdue'].includes(status) ? 'bad' : 'neutral'

export function EmployeeProfilePage() {
  const { employeeId } = useParams()
  const { dataset, loading, error, completeActivity } = useCareerData()
  const [confirmEvent, setConfirmEvent] = useState<Event | null>(null)
  const [toast, setToast] = useState('')
  const employee = dataset?.employees.find((item) => item.employee_id === employeeId)
  const progress = useMemo(() => dataset && employee ? getProgress(dataset, employee) : null, [dataset, employee])
  const recommendations = useMemo(() => dataset && employee ? getRecommendations(dataset, employee) : [], [dataset, employee])
  const history = useMemo(() => dataset?.activities.filter((item) => item.employee_id === employeeId).sort((a, b) => b.date.localeCompare(a.date)) ?? [], [dataset, employeeId])
  if (loading) return <div className="notice">Загружаем профиль…</div>
  if (error) return <div className="notice error">{error}</div>
  if (!dataset || !employee) return <div><div className="notice">Сотрудник {employeeId} не найден.</div><Link className="btn" to="/employees">← К списку сотрудников</Link></div>

  const confirmCompletion = () => {
    if (!confirmEvent) return
    completeActivity(employee.employee_id, confirmEvent.event_id)
    setConfirmEvent(null); setToast('Активность отмечена. Навыки и траектория обновлены локально.')
    window.setTimeout(() => setToast(''), 3500)
  }
  const shownGaps = progress?.gaps.slice(0, 7) ?? []
  const selectedGoal = employee.career_goal
  const eventTitle = (eventId: string) => dataset.events.find((item) => item.event_id === eventId)?.title ?? eventId

  return <>
    <div className="page-head"><div><p className="eyebrow">Карьерный профиль</p><p className="page-subtitle"><Link to="/employees">Сотрудники</Link>　/　{employee.employee_id}</p></div><Link className="btn" to="/employees">← Все сотрудники</Link></div>
    <section className="profile-top"><div className="profile-identity"><div className="profile-avatar">{initials(employee.full_name)}</div><div><h1 className="profile-name">{employee.full_name}</h1><p className="profile-meta">{employee.role} <span>·</span> {employee.department} <span>·</span> {employee.tenure_months} мес. в компании</p></div></div><div className="profile-actions"><span className={`grade-pill ${employee.grade.toLowerCase()}`}>{employee.grade}</span><button className="btn" onClick={() => window.print()}>⤓ <span>Печать профиля</span></button></div></section>
    <div className="profile-grid">
      <div className="stack">
        <section className="card progress-card"><div className="progress-line"><strong>Готовность к следующему грейду</strong><span>{progress?.grade ? `${progress.percentage}%` : 'Максимальный грейд'}</span></div>{progress?.grade && <><div className="progress-track"><div className="progress-fill" style={{ width: `${progress.percentage}%` }} /></div><div className="progress-foot"><span>Текущий: {employee.grade}</span><span>Цель: {progress.grade}</span></div></>}</section>
        <section className="card"><div className="card-head"><h2 className="card-title">Зоны роста по навыкам</h2><span className="card-caption">Требования для {progress?.grade ?? 'текущего грейда'}</span></div>{shownGaps.length ? <div className="skill-list">{shownGaps.map(({ id, skill, current, required, critical }) => <div className="skill-row" key={id}><div className="skill-name">{skill?.name ?? id}{critical && <em>КРИТИЧНЫЙ</em>}</div><div className="skill-levels" aria-label={`Уровень ${current} из 5`}>{[1, 2, 3, 4, 5].map((level) => <span key={level} className={`skill-step ${level <= current ? 'filled' : ''}`} />)}</div><div className="gap-value">{current}/{required}</div></div>)}</div> : <div className="empty">Нет навыков ниже требований следующего грейда — отличный прогресс.</div>}</section>
        <section className="card"><div className="card-head"><h2 className="card-title">История развития</h2><span className="card-caption">{history.length} записей</span></div>{history.length ? <div className="history-list">{history.slice(0, 6).map((activity) => <div className="history-item" key={activity.record_id}><div><div className="history-event">{eventTitle(activity.event_id)}</div><div className="history-date">{activity.date} · {activity.completion_pct}%</div></div><span className={`status ${statusClass(activity.status)}`}>{statusText[activity.status] ?? activity.status}</span></div>)}</div> : <div className="empty">История активностей пока пуста.</div>}</section>
      </div>
      <div className="stack">
        <section className="card goal-card"><div className="goal-heading"><span className="goal-mark">✦</span> Карьерная цель</div>{selectedGoal ? <><div className="goal-text">{selectedGoal.target_grade} · {selectedGoal.target_role}</div><div className="goal-small">Цель сотрудника</div></> : <><div className="goal-text">Пока не задана</div><div className="goal-small">Траектория показана к следующему грейду</div></>}</section>
        <section className="card recommendation-card"><div className="card-head"><div><h2 className="card-title">Следующие шаги</h2><span className="card-caption">Персональные рекомендации по навыкам и истории</span></div></div>{recommendations.length ? recommendations.map((recommendation) => <RecommendationCard key={recommendation.event.event_id} recommendation={recommendation} onComplete={() => setConfirmEvent(recommendation.event)} />) : <div className="empty">Нет доступного шага для текущих разрывов. Возможно, нужен новый каталог активностей или цель развития.</div>}</section>
        <div className="notice">Расчёт прогресса сравнивает оценённые навыки с требованиями следующего грейда. Завершённая активность обновляет навыки по правилам из каталога.</div>
      </div>
    </div>
    {confirmEvent && <div className="modal-backdrop" role="presentation"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="completion-title"><h2 id="completion-title">Отметить активность выполненной?</h2><p><strong>{confirmEvent.title}</strong></p><p>Уровень навыка обновится по данным активности с учётом максимума из каталога. Изменение сохранится в этом браузере.</p><div className="modal-actions"><button className="btn" onClick={() => setConfirmEvent(null)}>Отмена</button><button className="btn btn-primary" onClick={confirmCompletion}>Подтвердить</button></div></div></div>}
    {toast && <div className="toast">✓ {toast}</div>}
  </>
}

function RecommendationCard({ recommendation, onComplete }: { recommendation: Recommendation; onComplete: () => void }) {
  const { event, reasons, impacts } = recommendation
  const totalGain = impacts.reduce((sum, impact) => sum + impact.after - impact.current, 0)
  return <article className="recommendation-entry"><div className="recommendation-banner"><div className="recommendation-kicker">Рекомендуемый шаг</div><h3 className="recommendation-title">{event.title}</h3><div className="recommendation-meta"><span>{event.format === 'self_paced' ? 'В своём темпе' : event.format === 'online' ? 'Онлайн' : 'Офлайн'}</span><span>◷ {event.duration_hours} ч</span><span>↗ +{formatRussianCount(totalGain, ['уровень навыка', 'уровня навыков', 'уровней навыков'])}</span></div></div><div className="reasons">{reasons.slice(0, 4).map((reason, index) => <div className="reason" key={`${reason.label}-${index}`}><span className="reason-icon">{reason.icon}</span><div><strong>{reason.label}</strong><p>{reason.detail}</p></div></div>)}</div><div className="recommendation-foot"><span className="card-caption">{impacts.map((impact) => impact.skill.name).join(', ') || 'Развивающая активность'}</span><button className="btn btn-primary" onClick={onComplete}>Отметить выполненной</button></div></article>
}
