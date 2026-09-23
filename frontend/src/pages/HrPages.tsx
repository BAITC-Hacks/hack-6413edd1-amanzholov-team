import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { HrIcon, type HrIconName } from '../components/HrIcon'
import { useApiSession } from '../context/useApiSession'
import { useHrResource } from '../hooks/useHrResource'
import { ApiError } from '../services/api'
import { createCatalog, formatDate, formatNumber, gapKey, goalName, initials, peopleCount, percent, skillName, supportReason } from '../services/hrPresentation'
import type { CareerCatalog, EmployeeDetail, HrCatalog, NamedItem, OverviewReport, Page, SkillGap, SkillGapReport, SupportEmployee, SupportReport, Vacancy } from '../types/hr'

const pageSize = 8

function useCatalog(revision: number, enabled: boolean) {
  const skills = useHrResource<Page<NamedItem>>(enabled ? '/skills?offset=0&limit=100' : null, revision, true)
  const careers = useHrResource<CareerCatalog>(enabled ? '/career-tracks?offset=0&limit=100' : null, revision, true)
  const vacancies = useHrResource<Page<Vacancy>>(enabled ? '/vacancies?offset=0&limit=100' : null, revision, true)
  const catalog = useMemo(() => createCatalog(skills.data?.items, careers.data, vacancies.data?.items), [skills.data, careers.data, vacancies.data])
  return { catalog, loading: skills.loading || careers.loading || vacancies.loading, error: skills.error || careers.error || vacancies.error }
}

function PageHeader({ title, subtitle, date, loading, refresh }: { title: string; subtitle: string; date?: string; loading: boolean; refresh: () => void }) {
  return <header className="hr-heading">
    <div><p className="eyebrow">Управление развитием</p><h1>{title}</h1><p>{subtitle}</p></div>
    <div className="hr-heading-actions"><span className="hr-asof"><HrIcon name="calendar" />{date ? `На ${formatDate(date)}` : 'Актуальные данные команды'}</span><button className="hr-button" onClick={refresh} disabled={loading}><HrIcon name="refresh" />{loading ? 'Обновляем…' : 'Обновить'}</button></div>
  </header>
}

function ErrorNote({ error, retry }: { error: unknown; retry: () => void }) {
  const status = error instanceof ApiError ? error.status : null
  const message = status === 401 ? 'Нужно войти в кабинет заново' : status === 403 ? 'Нет доступа к данным этого подразделения' : 'Не удалось загрузить данные'
  const hint = status === 401 ? 'Срок действия входа закончился. Выйдите из кабинета и войдите ещё раз.' : status === 403 ? 'Обратитесь к администратору, чтобы проверить доступ к вашей команде.' : 'Попробуйте ещё раз. Если проблема повторится, обратитесь к администратору платформы.'
  return <div className="hr-notice error hr-error" role="alert"><div><strong>{message}</strong><p>{hint}</p></div><button className="hr-button" onClick={retry}>Повторить</button></div>
}

function LoadingState() {
  return <div className="hr-loading" role="status" aria-label="Загружаем данные команды"><div className="hr-metrics">{[0, 1, 2, 3].map((item) => <div className="hr-skeleton" key={item} />)}</div><div className="hr-skeleton" style={{ height: 270 }} /><span className="sr-only">Загружаем данные команды…</span></div>
}

function EmptyState({ title, children, icon = 'check' }: { title: string; children: ReactNode; icon?: HrIconName }) {
  return <div className="hr-empty"><HrIcon name={icon} /><h3>{title}</h3><p>{children}</p></div>
}

function Metric({ title, value, note, icon, accent = '' }: { title: string; value: number | string | undefined; note: string; icon: HrIconName; accent?: string }) {
  return <article className={`hr-metric ${accent}`}><div className="hr-metric-top"><span>{title}</span><HrIcon name={icon} /></div><div className="hr-metric-value">{typeof value === 'string' ? value : formatNumber(value)}</div><p className="hr-metric-note">{note}</p></article>
}

function PanelHeading({ title, subtitle, to, link }: { title: string; subtitle?: string; to?: string; link?: string }) {
  return <div className="hr-panel-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{to && <Link className="hr-link" to={to}>{link ?? 'Подробнее'}<HrIcon name="arrow" /></Link>}</div>
}

function SkillBars({ items, catalog, employeeCount }: { items: SkillGap[]; catalog: HrCatalog; employeeCount: number }) {
  return <div className="hr-skill-list">{items.map((gap) => <div className="hr-skill-row" key={gapKey(gap)}>
    <div className="hr-skill-label"><strong>{skillName(gap.skill_id, catalog)}</strong><small>{gap.vacancy_id ? 'Вакансия: ' : ''}{goalName(gap, catalog)}</small></div>
    <div className="hr-bar-track" aria-hidden="true"><span style={{ width: `${percent(gap.employees_with_gap, employeeCount)}%` }} /></div><span className="hr-bar-count" aria-label={peopleCount(gap.employees_with_gap)}>{formatNumber(gap.employees_with_gap)}</span>
  </div>)}</div>
}

function EmployeeSummary({ item, revision, compact = false, onOpen }: { item: SupportEmployee; revision: number; compact?: boolean; onOpen: (item: SupportEmployee) => void }) {
  const profile = useHrResource<EmployeeDetail>(`/hr/employees/${encodeURIComponent(item.employee_id)}`, revision)
  const reason = supportReason(item.reason_code, profile.data?.career_map)
  const name = profile.data?.employee.full_name || (profile.loading ? 'Загружаем имя…' : 'Имя сотрудника недоступно')
  const person = <><span className="hr-person-avatar" aria-hidden="true">{profile.data ? initials(name) : '—'}</span><div className="hr-person-copy"><strong>{name}</strong><span>{profile.data ? `${profile.data.career_map.official_role} · ${profile.data.career_map.official_grade}` : profile.loading ? 'Загружаем должность' : 'Откройте карточку, чтобы повторить загрузку'}</span></div></>
  if (compact) return <div className="hr-person-row">{person}<div className="hr-person-status"><span className="hr-tag amber">{reason.title}</span><button className="hr-link" onClick={() => onOpen(item)} aria-label={`Подробнее: ${name}`}>Подробнее<HrIcon name="arrow" /></button></div></div>
  return <article className="hr-support-card"><div className="hr-support-person">{person}</div><div className="hr-support-description"><span className="hr-tag amber">{reason.title}</span><p>{reason.action}</p></div><div className="hr-support-action"><button className="hr-button" onClick={() => onOpen(item)}>Карточка сотрудника<HrIcon name="arrow" /></button></div></article>
}

function EmployeeDialog({ item, catalog, onClose }: { item: SupportEmployee; catalog: HrCatalog; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [revision, setRevision] = useState(0)
  const resource = useHrResource<EmployeeDetail>(`/hr/employees/${encodeURIComponent(item.employee_id)}`, revision)
  const detail = resource.data
  const reason = supportReason(item.reason_code, detail?.career_map)
  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return <dialog className="hr-dialog" ref={dialogRef} aria-labelledby="hr-employee-title" onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="hr-dialog-header"><div><p className="eyebrow">Развитие сотрудника</p><h2 id="hr-employee-title">{detail?.employee.full_name || 'Карточка сотрудника'}</h2></div><button className="hr-icon-button" aria-label="Закрыть карточку" onClick={onClose} autoFocus><HrIcon name="close" /></button></div>
    {resource.loading ? <p role="status">Загружаем карточку…</p> : resource.error ? <ErrorNote error={resource.error} retry={() => setRevision((value) => value + 1)} /> : detail && <>
      <p className="hr-detail-role">{detail.career_map.official_role} · {detail.career_map.official_grade}</p>
      <div className="hr-detail-action"><span className="hr-tag amber">{reason.title}</span><p>{reason.action}</p></div>
      <dl className="hr-detail-grid"><div><dt>Направление развития</dt><dd>{detail.career_map.target_role_level_id ? catalog.roles.get(detail.career_map.target_role_level_id) || 'Название должности недоступно' : 'Пока не выбрано'}</dd></div><div><dt>Цель развития</dt><dd>{detail.career_map.goal_reason === 'explicit_goal' ? 'Выбрана сотрудником' : detail.career_map.goal_reason === 'configured_next_transition' ? 'Следующая ступень карьерного пути' : 'Нужно уточнить с сотрудником'}</dd></div><div><dt>Последняя оценка</dt><dd>{formatDate(detail.employee.last_review_date)}</dd></div><div><dt>В команде с</dt><dd>{formatDate(detail.employee.hire_date)}</dd></div></dl>
      {detail.career_map.coverage !== null && <div className="hr-detail-progress"><div className="hr-track-labels"><span>Соответствие навыков цели</span><strong>{formatNumber(detail.career_map.coverage)}%</strong></div><div className="hr-track" role="progressbar" aria-label="Соответствие навыков цели" aria-valuenow={detail.career_map.coverage} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(100, Math.max(0, detail.career_map.coverage))}%` }} /></div><p className="hr-footnote">По подтверждённым навыкам. Решение о повышении принимается отдельно.</p></div>}
      <div className="hr-detail-skills"><h3>Какие навыки развивать</h3>{detail.career_map.gaps.length ? detail.career_map.gaps.map((gap) => <div className="hr-detail-skill" key={gap.skill_id}><div><strong>{skillName(gap.skill_id, catalog)}</strong>{gap.critical && <span className="hr-tag amber">Обязателен для цели</span>}</div><span>Подтверждённый уровень {gap.current_level} из {gap.required_level} необходимых</span></div>) : <p className="hr-footnote">{detail.career_map.vacancy_status === 'closed' ? 'После выбора новой цели здесь появятся актуальные требования по навыкам.' : detail.career_map.ready_for_review ? 'Все требования по навыкам выполнены. Можно обсудить рассмотрение повышения.' : 'Для оценки навыков нужно уточнить цель и требования к ней.'}</p>}</div>
    </>}
  </dialog>
}

type ReportPageProps = { revision: number; refresh: () => void; catalog: HrCatalog; catalogsLoading: boolean }

function OverviewPage({ revision, refresh, catalog, catalogsLoading }: ReportPageProps) {
  const overview = useHrResource<OverviewReport>('/hr/overview', revision)
  const gaps = useHrResource<SkillGapReport>('/hr/skill-gaps?offset=0&limit=100', revision, true)
  const support = useHrResource<SupportReport>('/hr/employees-without-next-step?offset=0&limit=3', revision)
  const [selected, setSelected] = useState<SupportEmployee | null>(null)
  const data = overview.data
  const prioritySkills = [...(gaps.data?.items ?? [])].sort((a, b) => b.employees_with_gap - a.employees_with_gap).slice(0, 4)
  const loading = overview.loading || gaps.loading || support.loading || catalogsLoading
  return <>
    <PageHeader title="Обзор команды" subtitle="Общая картина развития и конкретные шаги для вашей команды." date={data?.as_of_date} loading={loading} refresh={refresh} />
    {overview.loading ? <LoadingState /> : overview.error ? <ErrorNote error={overview.error} retry={refresh} /> : data && <>
      <section className="hr-metrics" aria-label="Основные показатели"><Metric title="Сотрудников в команде" value={data.employee_count} note="В доступных вам подразделениях" icon="people" /><Metric title="Выбрали цель развития" value={data.with_explicit_goal} note={`Из ${formatNumber(data.employee_count)} сотрудников команды`} icon="target" accent="accent" /><Metric title="Записей на обучение" value={data.participations} note="За всё время до даты отчёта" icon="learning" /><Metric title="Нужна поддержка HR" value={support.data?.total} note={support.error ? 'Не удалось получить показатель' : support.loading ? 'Уточняем список сотрудников' : 'Помощь с планом развития'} icon="support" accent="attention" /></section>
      <div className="hr-columns"><section className="hr-panel"><PanelHeading title="Где развивать навыки" subtitle="Сколько сотрудников не достигли требований своей цели" to="/hr/skill-gaps" link="Все навыки" />{gaps.loading || catalogsLoading ? <p className="hr-footnote" role="status">Загружаем навыки…</p> : gaps.error ? <ErrorNote error={gaps.error} retry={refresh} /> : prioritySkills.length ? <><SkillBars items={prioritySkills} catalog={catalog} employeeCount={data.employee_count} /><p className="hr-footnote">Каждая строка — отдельная карьерная цель. У сотрудника может быть несколько навыков для развития.</p></> : <EmptyState title="Нет выявленных пробелов">По текущим целям навыки не требуют доработки. Для сотрудников без цели стоит сначала определить направление развития.</EmptyState>}</section>
        <section className="hr-focus"><span className="hr-kicker">В фокусе HR</span><h2>{support.data?.total === 0 ? 'Планы развития актуальны' : 'Поможем найти следующий шаг'}</h2><div className="hr-focus-number">{formatNumber(support.data?.total)}</div><p>{support.error ? 'Список сотрудников временно недоступен.' : support.loading ? 'Уточняем, кому нужна помощь.' : support.data?.total === 0 ? 'Сейчас нет сотрудников, которым нужна помощь с планом развития.' : 'Столько сотрудников ждут выбора цели, подходящего обучения или обновления плана.'}</p><Link className="hr-button" to="/hr/no-next-step">{support.data?.total === 0 ? 'Посмотреть раздел' : 'Посмотреть, кому помочь'}<HrIcon name="arrow" /></Link></section></div>
      <section className="hr-panel"><PanelHeading title="Кому нужна поддержка" subtitle="Начните с разговора о цели и ближайшем шаге" to="/hr/no-next-step" link="Весь список" />{support.loading ? <p className="hr-footnote" role="status">Загружаем сотрудников…</p> : support.error ? <ErrorNote error={support.error} retry={refresh} /> : support.data?.items.length ? support.data.items.map((item) => <EmployeeSummary key={item.employee_id} item={item} revision={revision} compact onOpen={setSelected} />) : <EmptyState title="Всё в порядке с планами">Если кому-то понадобится помощь, сотрудник появится здесь.</EmptyState>}</section>
      <section className="hr-panel"><PanelHeading title="Как продвигается обучение" subtitle="От записи на программу до подтверждённого завершения" to="/hr/participation" link="Об обучении" /><div className="hr-learning-summary"><div><span className="hr-learning-number">{formatNumber(data.completed)}</span><p>обучений завершено</p></div><div className="hr-learning-progress"><div className="hr-track-labels"><span>Завершено из {formatNumber(data.participations)} записей</span><strong>{data.participations ? `${percent(data.completed, data.participations)}%` : 'Пока нет записей'}</strong></div><div className="hr-track" aria-hidden="true"><span style={{ width: `${percent(data.completed, data.participations)}%` }} /></div><p className="hr-footnote">Один сотрудник может записаться на несколько программ.</p></div></div></section>
    </>}
    {selected && <EmployeeDialog item={selected} catalog={catalog} onClose={() => setSelected(null)} />}
  </>
}

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (value: number) => void }) {
  if (!total) return null
  return <div className="hr-pagination"><span>Показано {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} из {formatNumber(total)}</span>{total > pageSize && <div><button className="hr-button subtle" disabled={page === 0} onClick={() => onChange(page - 1)}>Назад</button><button className="hr-button subtle" disabled={(page + 1) * pageSize >= total} onClick={() => onChange(page + 1)}>Далее</button></div>}</div>
}

function SkillsPage({ revision, refresh, catalog, catalogsLoading }: ReportPageProps) {
  const resource = useHrResource<SkillGapReport>('/hr/skill-gaps?offset=0&limit=100', revision, true)
  const [query, setQuery] = useState('')
  const [goal, setGoal] = useState('')
  const [page, setPage] = useState(0)
  const data = resource.data
  const goalKey = (gap: SkillGap) => JSON.stringify([gap.role_level_id, gap.vacancy_id])
  const options = [...new Map((data?.items ?? []).map((gap) => [goalKey(gap), `${gap.vacancy_id ? 'Вакансия: ' : ''}${goalName(gap, catalog)}`])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'ru'))
  const items = (data?.items ?? []).filter((gap) => (!goal || goalKey(gap) === goal) && `${skillName(gap.skill_id, catalog)} ${goalName(gap, catalog)}`.toLocaleLowerCase('ru-RU').includes(query.trim().toLocaleLowerCase('ru-RU'))).sort((a, b) => b.employees_with_gap - a.employees_with_gap)
  const currentPage = Math.min(page, Math.max(0, Math.ceil(items.length / pageSize) - 1))
  return <>
    <PageHeader title="Развитие навыков" subtitle="Планируйте обучение под реальные потребности команды и карьерные цели." date={data?.as_of_date} loading={resource.loading || catalogsLoading} refresh={refresh} />
    {resource.loading || catalogsLoading ? <LoadingState /> : resource.error ? <ErrorNote error={resource.error} retry={refresh} /> : data && <>
      <div className="hr-insight"><HrIcon name="skills" /><div><strong>Начните с навыков, которые нужны большему числу сотрудников</strong><p>Для каждой должности и вакансии показаны свои требования. Один сотрудник может встречаться в нескольких строках.</p></div></div>
      <section className="hr-panel"><PanelHeading title="Потребности в развитии" subtitle={`${peopleCount(data.employee_count)} в доступных подразделениях`} /><div className="hr-filters"><label className="hr-search"><HrIcon name="search" /><span className="sr-only">Поиск навыка или должности</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0) }} placeholder="Найти навык или должность" /></label><label className="hr-select-label"><span>Карьерная цель</span><select value={goal} onChange={(event) => { setGoal(event.target.value); setPage(0) }}><option value="">Все цели</option>{options.map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label></div>
        {items.length ? <><div className="hr-table-wrap"><table className="hr-table"><caption className="sr-only">Навыки, требующие развития, по карьерным целям</caption><thead><tr><th scope="col">Навык</th><th scope="col">Для какой цели</th><th scope="col">Нужен сотрудникам</th></tr></thead><tbody>{items.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map((gap) => <tr key={gapKey(gap)}><td><div className="hr-cell-title"><strong>{skillName(gap.skill_id, catalog)}</strong></div></td><td><div className="hr-cell-title"><strong>{goalName(gap, catalog)}</strong><small>{gap.vacancy_id ? 'Вакансия' : 'Карьерный уровень'}</small></div></td><td><div className="hr-table-count"><strong>{peopleCount(gap.employees_with_gap)}</strong><div className="hr-bar-track" aria-hidden="true"><span style={{ width: `${percent(gap.employees_with_gap, data.employee_count)}%` }} /></div></div></td></tr>)}</tbody></table></div><Pagination page={currentPage} total={items.length} onChange={setPage} /></> : <EmptyState title={query || goal ? 'Ничего не найдено' : 'Нет выявленных пробелов'} icon={query || goal ? 'search' : 'check'}>{query || goal ? 'Попробуйте другой запрос или выберите все карьерные цели.' : 'По текущим целям нет навыков ниже требуемого уровня. Сотрудникам без цели может понадобиться помощь с её выбором.'}</EmptyState>}
      </section>
    </>}
  </>
}

function SupportPage({ revision, refresh, catalog, catalogsLoading }: ReportPageProps) {
  const resource = useHrResource<SupportReport>('/hr/employees-without-next-step?offset=0&limit=100', revision, true)
  const [reasonFilter, setReasonFilter] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<SupportEmployee | null>(null)
  const data = resource.data
  const reasons = [...new Set(data?.items.map((item) => item.reason_code))]
  const items = (data?.items ?? []).filter((item) => !reasonFilter || item.reason_code === reasonFilter)
  const currentPage = Math.min(page, Math.max(0, Math.ceil(items.length / pageSize) - 1))
  return <>
    <PageHeader title="Поддержка сотрудников" subtitle="Кому нужна помощь с целью, обучением или следующим шагом в развитии." date={data?.as_of_date} loading={resource.loading || catalogsLoading} refresh={refresh} />
    {resource.loading ? <LoadingState /> : resource.error ? <ErrorNote error={resource.error} retry={refresh} /> : data && <>
      <div className="hr-insight"><HrIcon name="support" /><div><strong>{data.total ? `${peopleCount(data.total)} — в фокусе внимания` : 'Сейчас помощь с планами не требуется'}</strong><p>Причина подскажет, с чего начать разговор. У каждого сотрудника показана одна текущая причина обращения к HR.</p></div></div>
      <section className="hr-panel"><PanelHeading title="Следующий шаг для каждого" /><div className="hr-filters"><label className="hr-select-label"><span>Причина</span><select value={reasonFilter} onChange={(event) => { setReasonFilter(event.target.value); setPage(0) }}><option value="">Все причины</option>{reasons.map((reason) => <option key={reason} value={reason}>{supportReason(reason).title}</option>)}</select></label><span className="hr-result-count">{peopleCount(items.length)}</span></div>
        {items.length ? <><div className="hr-support-list">{items.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map((item) => <EmployeeSummary key={item.employee_id} item={item} revision={revision} onOpen={setSelected} />)}</div><Pagination page={currentPage} total={items.length} onChange={setPage} /></> : <EmptyState title={reasonFilter ? 'Нет сотрудников с этой причиной' : 'У команды есть следующий шаг'}>{reasonFilter ? 'Выберите другую причину или посмотрите весь список.' : 'Здесь появятся сотрудники, которым нужна помощь с планом развития.'}</EmptyState>}
      </section>
    </>}
    {selected && <EmployeeDialog item={selected} catalog={catalog} onClose={() => setSelected(null)} />}
  </>
}

function LearningPage({ revision, refresh }: { revision: number; refresh: () => void }) {
  const [since, setSince] = useState('')
  const resource = useHrResource<OverviewReport>(`/hr/activity-participation${since ? `?since=${encodeURIComponent(since)}` : ''}`, revision)
  const data = resource.data
  const completion = data ? percent(data.completed, data.participations) : 0
  return <>
    <PageHeader title="Обучение команды" subtitle="Следите за записями на программы и подтверждёнными завершениями." date={data?.as_of_date} loading={resource.loading} refresh={refresh} />
    <div className="hr-filters"><label className="hr-select-label"><span>Записи начиная с</span><input type="date" value={since} onChange={(event) => setSince(event.target.value)} /></label>{since && <button className="hr-button subtle" onClick={() => setSince('')}>За всё время</button>}</div>
    {resource.loading ? <LoadingState /> : resource.error ? <ErrorNote error={resource.error} retry={refresh} /> : data && <>
      <section className="hr-metrics" aria-label="Показатели обучения"><Metric title="Сотрудников в команде" value={data.employee_count} note="В доступных вам подразделениях" icon="people" /><Metric title="Записей на обучение" value={data.participations} note={since ? `С ${formatDate(since)}` : 'За всё время до даты отчёта'} icon="learning" /><Metric title="Обучений завершено" value={data.completed} note="Завершение подтверждено" icon="check" accent="accent" /><Metric title="Доля завершённых" value={data.participations ? `${completion}%` : '—'} note="Среди записей за выбранный период" icon="overview" /></section>
      <div className="hr-columns"><section className="hr-panel"><PanelHeading title="От записи к результату" subtitle={since ? `Записи с ${formatDate(since)} по ${formatDate(data.as_of_date)}` : `Все записи до ${formatDate(data.as_of_date)}`} />{data.participations ? <><div className="hr-learning-summary"><div><span className="hr-learning-number">{completion}%</span><p>записей завершены</p></div></div><div className="hr-track" role="progressbar" aria-label="Доля завершённых записей на обучение" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${completion}%` }} /></div><div className="hr-track-labels"><span>Завершено: {formatNumber(data.completed)}</span><span>Остальные записи: {formatNumber(data.participations - data.completed)}</span></div><p className="hr-footnote">Период определяется датой записи на программу, а не датой её завершения. Остальные записи могут включать отменённые.</p></> : <EmptyState title="Пока нет записей на обучение" icon="learning">{since ? 'За выбранный период записей нет. Выберите другую дату или покажите данные за всё время.' : 'Когда сотрудники запишутся на программы, здесь появится прогресс обучения.'}</EmptyState>}</section>
        <section className="hr-panel"><PanelHeading title="Как поддержать обучение" subtitle="Три шага, которые помогут команде двигаться дальше" /><div className="hr-checklist"><div className="hr-checklist-row"><span>1</span><div><strong>Определите потребность</strong><p>Посмотрите, какие навыки нужны команде для карьерных целей.</p><Link className="hr-link" to="/hr/skill-gaps">К навыкам<HrIcon name="arrow" /></Link></div></div><div className="hr-checklist-row"><span>2</span><div><strong>Обсудите ближайший шаг</strong><p>Помогите сотрудникам, для которых ещё не подобрано обучение.</p><Link className="hr-link" to="/hr/no-next-step">К сотрудникам<HrIcon name="arrow" /></Link></div></div><div className="hr-checklist-row"><span>3</span><div><strong>Дождитесь подтверждения</strong><p>Завершение программы учитывается после проверки ответственным сотрудником.</p></div></div></div></section></div>
      <div className="hr-insight"><HrIcon name="people" /><div><strong>Записи на обучение и число сотрудников — разные показатели</strong><p>Один сотрудник может участвовать в нескольких программах. Доля завершённых показывает результат по записям, а не долю обучающихся сотрудников.</p></div></div>
    </>}
  </>
}

export function HrContentPage() {
  const path = useLocation().pathname
  const [revision, setRevision] = useState(0)
  const { catalog, loading, error } = useCatalog(revision, path !== '/hr/participation')
  const refresh = () => setRevision((value) => value + 1)
  const props = { revision, refresh, catalog, catalogsLoading: loading }
  return <div className="hr-page">
    {Boolean(error) && <div className="hr-notice warning" role="status"><strong>Часть названий временно недоступна.</strong> Нажмите «Обновить», чтобы загрузить названия навыков и должностей повторно.</div>}
    {path === '/hr/skill-gaps' ? <SkillsPage {...props} /> : path === '/hr/no-next-step' ? <SupportPage {...props} /> : path === '/hr/participation' ? <LearningPage revision={revision} refresh={refresh} /> : <OverviewPage {...props} />}
    <footer className="hr-footer"><span>Career Quest · Развитие команды</span><span>Данные только по доступным вам подразделениям</span></footer>
  </div>
}

export function LoginPage() {
  const { signIn } = useApiSession()
  const [login, setLogin] = useState('hr')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try { await signIn(login, password) }
    catch (reason) {
      setError(reason instanceof ApiError
        ? reason.status === 401 ? 'Проверьте логин и пароль и попробуйте ещё раз.' : reason.status === 429 ? 'Слишком много попыток входа. Попробуйте немного позже.' : 'Не удалось войти. Попробуйте ещё раз или обратитесь к администратору.'
        : 'Для входа нужна действующая учётная запись HR. Проверьте доступ у администратора.')
    }
    finally { setBusy(false) }
  }
  return <main className="login-shell hr-login"><form className="login-card" onSubmit={(event) => void submit(event)}><div className="brand-mark">✦</div><p className="eyebrow">Career Quest · Управление развитием</p><h1>Добро пожаловать</h1><p className="page-subtitle">Войдите в HR-кабинет, чтобы видеть развитие команды и помогать сотрудникам двигаться дальше.</p><label className="field">Логин<input autoComplete="username" value={login} onChange={(event) => setLogin(event.target.value)} required /></label><label className="field">Пароль<input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <div className="hr-notice error" role="alert">{error}</div>}<button className="hr-button primary login-submit" disabled={busy}>{busy ? 'Входим…' : 'Войти в кабинет'}<HrIcon name="arrow" /></button><p className="privacy-note">Доступ предоставляется вашей организацией.</p></form></main>
}
