import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCareerData } from '../context/careerDataStore'
import { formatRussianCount, getProgress, getRecommendations, nextGrade } from '../services/careerData'

export function HrDashboardPage() {
  const { dataset, loading, error } = useCareerData()
  const metrics = useMemo(() => {
    if (!dataset) return null
    const skillCounts = new Map<string, { name: string; employees: Set<string>; critical: number }>()
    let withoutRecommendations = 0
    let employeesWithNextGrade = 0
    dataset.employees.forEach((employee) => {
      const progress = getProgress(dataset, employee)
      if (progress.grade) employeesWithNextGrade++
      progress.gaps.forEach((gap) => {
        if (!gap.skill) return
        const value = skillCounts.get(gap.id) ?? { name: gap.skill.name, employees: new Set<string>(), critical: 0 }
        value.employees.add(employee.employee_id)
        if (gap.critical) value.critical++
        skillCounts.set(gap.id, value)
      })
      if (!getRecommendations(dataset, employee).length && nextGrade(employee.grade)) withoutRecommendations++
    })
    const weakSkills = [...skillCounts.entries()]
      .map(([id, value]) => ({ id, ...value, count: value.employees.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
    const eventMetrics = dataset.events.map((event) => {
      const records = dataset.activities.filter((activity) => activity.event_id === event.event_id)
      const completed = records.filter((activity) => activity.status === 'completed').length
      return { event, participants: records.length, completed, rate: records.length ? Math.round(completed / records.length * 100) : 0 }
    }).filter((item) => item.participants).sort((a, b) => b.participants - a.participants).slice(0, 7)
    return { weakSkills, withoutRecommendations, employeesWithNextGrade, eventMetrics, totalEmployees: dataset.employees.length }
  }, [dataset])

  if (loading) return <div className="notice">Загружаем HR-сводку…</div>
  if (error) return <div className="notice error">{error}</div>
  if (!metrics || !dataset) return <div className="notice">HR-сводка пока недоступна.</div>
  const maxSkillCount = Math.max(1, ...metrics.weakSkills.map((item) => item.count))
  const maxEventCount = Math.max(1, ...metrics.eventMetrics.map((item) => item.participants))
  const employeesWithoutSteps = dataset.employees.filter((employee) => nextGrade(employee.grade) && !getRecommendations(dataset, employee).length).slice(0, 8)

  return <>
    <div className="page-head">
      <div>
        <p className="eyebrow">HR-аналитика</p>
        <h1>Развитие команды</h1>
        <p className="page-subtitle">Общий срез навыков и участия помогает находить зоны поддержки и планировать развитие команды.</p>
      </div>
      <span className="local-tag"><i /> Данные из локального набора</span>
    </div>
    <div className="stat-grid">
      <div className="card stat-card"><div className="stat-label">Сотрудники в выборке</div><div className="stat-value">{metrics.totalEmployees}</div><div className="stat-note">Локальные профили</div></div>
      <div className="card stat-card"><div className="stat-label">С траекторией роста</div><div className="stat-value">{metrics.employeesWithNextGrade}</div><div className="stat-note">Есть следующий грейд</div></div>
      <div className="card stat-card"><div className="stat-label">Без следующей рекомендации</div><div className="stat-value">{metrics.withoutRecommendations}</div><div className="stat-note">Нужна проверка каталога активностей</div></div>
      <div className="card stat-card"><div className="stat-label">Компетенций ниже требований</div><div className="stat-value">{metrics.weakSkills.length}</div><div className="stat-note">Учитываются требования ближайшего грейда</div></div>
    </div>
    <div className="dashboard-grid">
      <section className="card">
        <div className="card-head"><div><h2 className="card-title">Частые разрывы по навыкам</h2><span className="card-caption">Сотрудники ниже требований следующего грейда</span></div></div>
        {metrics.weakSkills.length ? <div className="bar-list">{metrics.weakSkills.map((skill) => <div className="bar-row" key={skill.id}><div className="bar-label" title={skill.name}>{skill.name}</div><div className="bar-track"><div className="bar-fill" style={{ width: `${skill.count / maxSkillCount * 100}%` }} /></div><div className="bar-value">{skill.count}</div></div>)}</div> : <div className="empty">Нет разрывов по навыкам в данных.</div>}
      </section>
      <section className="card">
        <div className="card-head"><div><h2 className="card-title">Участие в активностях</h2><span className="card-caption">Число записей и доля завершений</span></div></div>
        {metrics.eventMetrics.length ? <div className="event-list">{metrics.eventMetrics.map((item) => <div className="event-row" key={item.event.event_id}><div className="event-row-head"><span title={item.event.title}>{item.event.title}</span><strong>{item.participants} · {item.rate}%</strong></div><div className="bar-track"><div className="bar-fill" style={{ width: `${item.participants / maxEventCount * 100}%` }} /></div><small>{item.completed} завершено из {item.participants}</small></div>)}</div> : <div className="empty">История участия пуста.</div>}
      </section>
    </div>
    <section className="card attention-card">
      <div className="card-head"><div><h2 className="card-title">Сотрудники без следующего шага</h2><span className="card-caption">Нет подходящей необязательной активности для текущих разрывов</span></div><Link className="text-button" to="/employees">Открыть каталог →</Link></div>
      <div className="attention-grid">{employeesWithoutSteps.map((employee) => {
        const progress = getProgress(dataset, employee)
        const criticalGaps = formatRussianCount(progress.criticalGaps, ['критичный разрыв', 'критичных разрыва', 'критичных разрывов'])
        return <Link className="attention-person" key={employee.employee_id} to={`/employees/${employee.employee_id}`}><span className="person-avatar">{employee.full_name.split(' ').slice(0, 2).map((part) => part[0]).join('')}</span><span><strong>{employee.full_name}</strong><small>{employee.role} · {criticalGaps}</small></span><span className="attention-arrow">↗</span></Link>
      })}</div>
    </section>
    <p className="privacy-note">Сводка агрегирует профессиональные навыки и историю развития из синтетического датасета. Все изменения в локальном режиме хранятся только в этом браузере.</p>
  </>
}
