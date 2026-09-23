import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCareerData } from '../context/careerDataStore'
import { getProgress, getRecommendations } from '../services/careerData'

const grades = ['Junior', 'Middle', 'Senior', 'Lead']
const initials = (name: string) => name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
const activityKinds: Record<string, string> = { course: 'Курс', workshop: 'Практикум', mentoring: 'Менторство', meetup: 'Встреча', certification: 'Сертификация', onboarding: 'Онбординг', compliance: 'Обязательное обучение' }
const formatDuration = (hours: number) => hours === 0 ? '0 мин' : `${Math.floor(hours)} ч${hours % 1 ? ` ${Math.round(hours % 1 * 60)} мин` : ''}`

export function EmployeeOverviewPage() {
  const { dataset, loading, error } = useCareerData()
  const [selectedEmployeeId, selectEmployee] = useState<string | null>(null)
  const employee = dataset?.employees.find((item) => item.employee_id === selectedEmployeeId) ?? dataset?.employees[0] ?? null

  if (loading) return <div className="notice">Загружаем локальные данные…</div>
  if (error) return <div className="notice error">{error}</div>
  if (!dataset || !employee) return <div className="notice">В локальном наборе пока нет сотрудников.</div>

  const progress = getProgress(dataset, employee)
  const recommendations = getRecommendations(dataset, employee)
  const activities = dataset.activities.filter((item) => item.employee_id === employee.employee_id)
  const completedActivities = activities.filter((item) => item.status === 'completed')
  const learningHours = completedActivities.reduce((total, item) => total + (dataset.events.find((event) => event.event_id === item.event_id)?.duration_hours ?? 0), 0)
  const nextGrade = progress.grade
  const targetGrade = nextGrade ?? employee.career_goal?.target_grade
  const firstName = employee.full_name.split(' ')[0]
  const targetProfile = targetGrade ? dataset.roleProfiles.find((item) => item.role === employee.role && item.grade === targetGrade) : undefined
  const skillRows = Object.entries(targetProfile?.required_skills ?? {}).map(([skillId, required]) => ({
    id: skillId,
    name: dataset.skills.find((skill) => skill.skill_id === skillId)?.name ?? skillId,
    current: employee.skills[skillId] ?? 0,
    required,
    critical: targetProfile?.critical_skills.includes(skillId) ?? false,
  })).sort((a, b) => Number(b.critical) - Number(a.critical) || (a.current / a.required) - (b.current / b.required)).slice(0, 7)

  return <div className="employee-overview">
    <div className="overview-heading"><div><h1>Расти в своём темпе, {firstName} <span>✦</span></h1><p>Каждый маленький шаг — часть большого карьерного пути.</p></div><div className="overview-heading-actions"><label className="sr-only" htmlFor="employee-picker">Демо-профиль</label><select id="employee-picker" className="overview-employee-select" value={employee.employee_id} onChange={(event) => selectEmployee(event.target.value)}>{dataset.employees.map((item) => <option value={item.employee_id} key={item.employee_id}>{item.full_name} · {item.role}</option>)}</select><div className="overview-date">▦　{new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</div></div></div>

    <div className="overview-grid">
      <div className="overview-main-column">
        <section className="overview-hero">
          <div className="hero-copy"><div className="hero-eyebrow">✧　ВАШ ПЕРСОНАЛЬНЫЙ МАРШРУТ</div><h2>{nextGrade ? <>Следующий уровень —<br /><span>ближе, чем кажется.</span></> : <>Вы достигли<br /><span>максимального уровня.</span></>}</h2><p>Ваш опыт, ваши цели и навыки складываются<br />в понятный план действий.</p><Link className="overview-primary-button" to={nextGrade ? `/employees/${employee.employee_id}` : '/employees'}>Мой карьерный маршрут <span>→</span></Link></div>
          <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="art-spark spark-one">✦</div><div className="art-steps"><span/><span/><span/></div><div className="art-flag">⚑</div><div className="art-check">✓</div><div className="art-label">↗　+1 навык</div></div>
          {nextGrade && <span className="hero-grade">{nextGrade}</span>}
        </section>

        <section className="overview-stats" aria-label="Показатели развития">
          <div className="overview-stat"><span className="stat-icon purple">◎</span><div><strong>{progress.percentage}<small>%</small></strong><span>Готовность к {nextGrade ?? 'цели'}</span></div></div>
          <div className="overview-stat"><span className="stat-icon green">✓</span><div><strong>{completedActivities.length}</strong><span>Активностей завершено</span></div></div>
          <div className="overview-stat"><span className="stat-icon orange">◷</span><div><strong>{formatDuration(learningHours)}</strong><span>Время на развитие</span></div></div>
        </section>

        <section className="recommendations-section">
          <div className="section-heading"><div><h2>Твой следующий шаг <span className="ai-pill">✧ Демо-подбор</span></h2><p>Подобрано под ваши навыки и карьерную цель</p></div><Link to={`/employees/${employee.employee_id}`}>Все активности　→</Link></div>
          {recommendations.length ? <div className="overview-recommendations">{recommendations.map(({ event, impacts }) => {
            const impact = impacts[0]
            const tone = event.type === 'course' ? 'lavender' : event.type === 'workshop' ? 'sage' : 'peach'
            return <article className="overview-recommendation" key={event.event_id}>
              <div className={`recommendation-visual ${tone}`} aria-hidden="true"><div className="visual-orbit"/><div className="visual-sheet"><span/><span/><span/></div><div className="visual-sticker">{event.type === 'course' ? '✧' : event.type === 'workshop' ? '✓' : '↗'}</div></div>
              <div className="recommendation-content"><div className="recommendation-meta"><span>{activityKinds[event.type] ?? 'Активность'}</span><span>◷ {formatDuration(event.duration_hours)}</span></div><h3>{event.title}</h3><p>{event.description}</p><div className="recommendation-rationale">✧　{impact ? `Цель по навыку «${impact.skill.name}»: ${impact.current} → ${impact.after} из ${impact.required}.` : 'Подходит для вашего карьерного маршрута.'}</div><div className="recommendation-action"><span>+{impacts.reduce((sum, item) => sum + item.after - item.current, 0)} к навыку</span><Link to={`/employees/${employee.employee_id}`}>Открыть план　→</Link></div></div>
            </article>
          })}</div> : <div className="overview-empty">Пока нет подходящих рекомендаций. Откройте профиль, чтобы посмотреть разрывы по навыкам.</div>}
          <p className="overview-disclaimer">ⓘ　Демо-подбор: дефицит навыков, польза и длительность активности</p>
        </section>

        <section className="career-steps"><div className="section-heading"><div><h2>Большой путь начинается с шага</h2></div><Link to={`/employees/${employee.employee_id}`}>Подробнее　→</Link></div><div className="grade-track">{grades.map((grade, index) => {
          const currentIndex = grades.indexOf(employee.grade)
          const reached = index < currentIndex
          const current = index === currentIndex
          const target = grade === targetGrade
          return <div className={`grade-step${reached ? ' reached' : ''}${current ? ' current' : ''}${target ? ' target' : ''}`} key={grade}><span className="grade-node">{reached ? '✓' : current ? '♙' : target ? '⚑' : '♙'}</span><strong>{grade}</strong><small>{reached ? 'Пройденный этап' : current ? 'Вы здесь' : target ? 'Следующая цель' : 'Новый горизонт'}</small></div>
        })}</div></section>
      </div>

      <aside className="overview-aside">
        <section className="overview-profile-card"><div className="overview-avatar">{initials(employee.full_name)}</div><h2>{employee.full_name}</h2><p>{employee.role}</p><div className="profile-tags"><span>{employee.grade}</span><span>{employee.department}</span></div><div className="profile-progress"><div><span>Путь к {targetGrade ?? 'цели'}</span><strong>{progress.percentage}%</strong></div><div className="overview-progress-track"><span style={{ width: `${progress.percentage}%` }}/></div><small>{progress.criticalGaps} критичных навыков требуют внимания</small></div><Link to={`/employees/${employee.employee_id}`}>Открыть профиль　→</Link></section>

        <section className="overview-skills-card"><div className="skills-heading"><div><h2>Мои навыки</h2><p>Где вы сейчас и к чему стремиться</p></div><span aria-hidden="true">↗</span></div>{skillRows.length ? <div className="overview-skill-list">{skillRows.map((skill) => <div className="overview-skill" key={skill.id}><div><span>{skill.name}{skill.critical && <i>КРИТИЧНЫЙ</i>}</span><strong>{skill.current} / {skill.required}</strong></div><div className="skill-target-track"><span style={{ width: `${Math.min(skill.current / 5 * 100, 100)}%` }}/><i style={{ left: `${Math.min(skill.required / 5 * 100, 100)}%` }}/></div></div>)}</div> : <div className="overview-empty">Для этой цели пока нет требований по навыкам.</div>}<div className="skill-legend"><span><i/>Текущий уровень</span><span><i/>Цель для {targetGrade ?? 'уровня'}</span></div></section>

        <section className="overview-tip"><span>♧</span><div><strong>Не быстрее. Регулярнее.</strong><p>Даже 20 минут на обучение — это шаг к тому, кем вы хотите стать.</p></div></section>
      </aside>
    </div>
    <footer className="overview-footer"><span>Career Quest · Ваш следующий шаг имеет значение.</span><span><i/> Прогресс сохраняется</span></footer>
  </div>
}
