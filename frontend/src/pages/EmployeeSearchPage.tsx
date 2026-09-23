import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { WorkspaceIcon as Icon } from '../components/WorkspaceIcon'
import { useCareerData } from '../context/careerDataStore'
import { formatRussianCount } from '../services/careerData'
import { buildEmployeeDirectory, filterEmployeeDirectory, type DirectoryEntry, type DirectorySegment, type DirectorySort } from '../services/employeeDirectory'
import './EmployeeSearchPage.css'

const pageSize = 10
const number = (value: number) => value.toLocaleString('ru-RU')
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
const segments: { value: DirectorySegment; label: string }[] = [
  { value: 'all', label: 'Все сотрудники' },
  { value: 'with-goal', label: 'С карьерной целью' },
  { value: 'without-goal', label: 'Без цели' },
  { value: 'learning', label: 'В обучении' },
]
const sorts: { value: DirectorySort; label: string }[] = [
  { value: 'name', label: 'Имя: А → Я' }, { value: 'name-desc', label: 'Имя: Я → А' },
  { value: 'progress', label: 'Соответствие цели' }, { value: 'tenure', label: 'Сначала опытные' },
]

export function EmployeeSearchPage() {
  const { dataset, loading, error, refresh } = useCareerData()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const department = params.get('department') ?? ''
  const role = params.get('role') ?? ''
  const grade = params.get('grade') ?? ''
  const segment = segments.find((item) => item.value === params.get('segment'))?.value ?? 'all'
  const sort = sorts.find((item) => item.value === params.get('sort'))?.value ?? 'name'
  const requestedPage = Number(params.get('page') ?? 1)
  const entries = useMemo(() => dataset ? buildEmployeeDirectory(dataset) : [], [dataset])
  const options = useMemo(() => {
    const distinct = (key: 'department' | 'role' | 'grade') => [...new Set(entries.map(({ employee }) => employee[key]))].sort((a, b) => a.localeCompare(b, 'ru'))
    return { departments: distinct('department'), roles: distinct('role'), grades: distinct('grade') }
  }, [entries])
  const counts = useMemo(() => ({
    all: entries.length,
    'with-goal': entries.filter(({ employee }) => employee.career_goal).length,
    'without-goal': entries.filter(({ employee }) => !employee.career_goal).length,
    learning: entries.filter(({ learning }) => learning.active > 0).length,
  }), [entries])
  const filtered = useMemo(() => filterEmployeeDirectory(entries, { query, department, role, grade, segment, sort }), [entries, query, department, role, grade, segment, sort])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const page = Number.isSafeInteger(requestedPage) ? Math.max(1, Math.min(requestedPage, pageCount)) : 1
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)
  const hasFilters = !!(query || department || role || grade || segment !== 'all')
  const busy = loading || !dataset
  const goalCoverage = counts.all ? Math.round(counts['with-goal'] / counts.all * 100) : 0
  const date = dataset ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${dataset.asOfDate}T00:00:00Z`)) : null
  const update = (key: string, value: string) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      if (value) next.set(key, value)
      else next.delete(key)
      if (key !== 'page') next.delete('page')
      return next
    }, { replace: true })
  }
  const reset = () => setParams({}, { replace: true })
  const value = (count: number) => busy ? '—' : number(count)

  return <div className="employee-directory">
    <header className="directory-heading">
      <div><p className="eyebrow">Люди и развитие</p><h1>Сотрудники<span className="directory-title-dot">.</span></h1><p className="directory-subtitle">Помогайте людям расти. Находите возможности для развития команды.</p></div>
      <Link className="btn directory-analytics" to="/hr"><Icon name="chart" />HR-аналитика<Icon name="upRight" width="16" height="16" /></Link>
    </header>

    <section className="directory-metrics" aria-label="Сводка по доступным сотрудникам">
      <div className="directory-metric directory-metric-primary"><div className="metric-top"><span>Ваша команда</span><Icon name="users" /></div><strong>{value(counts.all)}</strong><div className="metric-bottom"><span>{busy ? 'Загружаем команду' : formatRussianCount(options.departments.length, ['подразделение', 'подразделения', 'подразделений'])}</span><span className="metric-live">Доступные профили</span></div></div>
      <button className="directory-metric" disabled={busy} aria-pressed={segment === 'with-goal'} onClick={() => update('segment', segment === 'with-goal' ? '' : 'with-goal')}><div className="metric-top"><span>С карьерной целью</span><span className="metric-icon mint"><Icon name="target" /></span></div><strong>{value(counts['with-goal'])}</strong><div className="metric-bottom"><span>{busy ? '—' : `${goalCoverage}% команды определили цель`}</span><Icon name="upRight" width="16" height="16" /></div><div className="metric-coverage" aria-hidden="true"><span style={{ width: `${busy ? 0 : goalCoverage}%` }} /></div></button>
      <button className="directory-metric" disabled={busy} aria-pressed={segment === 'learning'} onClick={() => update('segment', segment === 'learning' ? '' : 'learning')}><div className="metric-top"><span>В обучении</span><span className="metric-icon blue"><Icon name="book" /></span></div><strong>{value(counts.learning)}</strong><div className="metric-bottom"><span>Записаны или уже проходят</span><Icon name="upRight" width="16" height="16" /></div></button>
      <button className="directory-metric" disabled={busy} aria-pressed={segment === 'without-goal'} onClick={() => update('segment', segment === 'without-goal' ? '' : 'without-goal')}><div className="metric-top"><span>Без карьерной цели</span><span className="metric-icon amber"><Icon name="target" /></span></div><strong>{value(counts['without-goal'])}</strong><div className="metric-bottom"><span>Помогите выбрать направление</span><Icon name="upRight" width="16" height="16" /></div></button>
    </section>

    <section className="directory-panel" aria-labelledby="directory-list-title" aria-busy={loading}>
      <div className="directory-panel-heading"><div><h2 id="directory-list-title">Команда <span>{value(counts.all)}</span></h2><p>Карьерные цели, навыки и обучение — в одном месте</p></div>{date && <span className="directory-date"><Icon name="calendar" width="15" height="15" />Срез на {date}</span>}</div>
      <div className="directory-segments" role="group" aria-label="Быстрые фильтры сотрудников">{segments.map((item) => <button key={item.value} className={segment === item.value ? 'is-active' : ''} aria-pressed={segment === item.value} onClick={() => update('segment', item.value === 'all' ? '' : item.value)}>{item.label}<span>{value(counts[item.value])}</span></button>)}</div>
      <div className="directory-filters">
        <label className="directory-search"><Icon name="search" width="19" height="19" /><input aria-label="Поиск сотрудников" value={query} onChange={(event) => update('q', event.target.value)} placeholder="Имя, должность или ID" />{query && <button type="button" aria-label="Очистить поиск" onClick={() => update('q', '')}><Icon name="close" width="16" height="16" /></button>}</label>
        <select aria-label="Подразделение" value={department} onChange={(event) => update('department', event.target.value)}><option value="">Все подразделения</option>{options.departments.map((name) => <option key={name} value={name}>{name}</option>)}</select>
        <select aria-label="Должность" value={role} onChange={(event) => update('role', event.target.value)}><option value="">Все должности</option>{options.roles.map((name) => <option key={name} value={name}>{name}</option>)}</select>
        <select aria-label="Грейд" value={grade} onChange={(event) => update('grade', event.target.value)}><option value="">Все грейды</option>{options.grades.map((name) => <option key={name} value={name}>{name}</option>)}</select>
      </div>
      <div className="directory-result-bar"><div className="directory-result-count" role="status" aria-live="polite">{loading ? 'Обновляем список…' : error ? 'Не удалось загрузить список' : <>Найдено <strong>{formatRussianCount(filtered.length, ['сотрудник', 'сотрудника', 'сотрудников'])}</strong></>}{hasFilters && <button className="directory-reset" onClick={reset}><Icon name="close" width="13" height="13" />Сбросить</button>}</div><label className="directory-sort"><Icon name="filter" width="16" height="16" /><select aria-label="Сортировка сотрудников" value={sort} onChange={(event) => update('sort', event.target.value)}>{sorts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>

      {error ? <div className="directory-empty" role="alert"><span className="directory-empty-icon"><Icon name="info" /></span><h3>Не удалось получить данные</h3><p>{error}</p><button className="btn btn-primary" disabled={loading} onClick={() => void refresh()}><Icon name="refresh" width="16" height="16" />Повторить попытку</button></div>
        : loading ? <div className="directory-loading" role="status"><span className="sr-only">Загружаем сотрудников</span>{Array.from({ length: 5 }, (_, index) => <div className="directory-skeleton" key={index}><span /><span /><span /><span /></div>)}</div>
          : !visible.length ? <div className="directory-empty"><span className="directory-empty-icon"><Icon name={hasFilters ? 'search' : 'users'} width="26" height="26" /></span><h3>{hasFilters ? 'Сотрудники не найдены' : 'Здесь появится ваша команда'}</h3><p>{hasFilters ? 'Попробуйте другое имя или измените фильтры.' : 'В доступных вам подразделениях пока нет сотрудников.'}</p>{hasFilters && <button className="btn" onClick={reset}>Сбросить фильтры</button>}</div>
            : <div className="directory-table-wrap"><table className="directory-table"><caption className="sr-only">Сотрудники и их развитие</caption><thead><tr><th scope="col">Сотрудник</th><th scope="col">Должность / грейд</th><th scope="col">Карьерная цель</th><th scope="col">Соответствие по навыкам</th><th scope="col">Обучение</th><th scope="col"><span className="sr-only">Профиль</span></th></tr></thead><tbody>{visible.map((entry) => <EmployeeRow key={entry.employee.employee_id} entry={entry} />)}</tbody></table></div>}

      {!loading && !error && filtered.length > 0 && <footer className="directory-pagination"><span>Показано <strong>{number((page - 1) * pageSize + 1)}–{number(Math.min(page * pageSize, filtered.length))}</strong> из {number(filtered.length)}</span><nav aria-label="Страницы сотрудников"><button aria-label="Предыдущая страница" disabled={page === 1} onClick={() => update('page', String(page - 1))}><Icon name="chevron" className="icon-back" width="16" height="16" /></button><span>Страница <strong>{page}</strong> из {pageCount}</span><button aria-label="Следующая страница" disabled={page === pageCount} onClick={() => update('page', String(page + 1))}><Icon name="chevron" width="16" height="16" /></button></nav></footer>}
    </section>
    <p className="directory-footnote"><Icon name="info" width="15" height="15" /><span>Соответствие рассчитано по подтверждённым навыкам и требованиям целевой роли. Оно не означает автоматическое повышение.</span></p>
  </div>
}

function EmployeeRow({ entry }: { entry: DirectoryEntry }) {
  const { employee, progress, learning } = entry
  const target = employee.career_goal ?? (employee.target_profile ? { target_role: employee.target_profile.role, target_grade: employee.target_profile.grade } : null)
  const closed = employee.vacancy_status === 'closed'
  const color = [...employee.employee_id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 5
  return <tr>
    <td data-label="Сотрудник"><div className="directory-person"><span className={`directory-avatar avatar-tone-${color}`} aria-hidden="true">{initials(employee.full_name)}</span><div><Link className="directory-person-name" to={`/employees/${employee.employee_id}`}>{employee.full_name}</Link><span className="directory-secondary">{employee.department}</span><span className="directory-person-id">{employee.external_id ?? employee.employee_id.slice(0, 8)}</span></div></div></td>
    <td data-label="Должность / грейд"><span className="directory-role">{employee.role}</span><div className="directory-role-meta"><span className={`directory-grade grade-${employee.grade.toLowerCase().replace(/[^a-z]/g, '')}`}>{employee.grade}</span><span className="directory-tenure">{employee.tenure_months} мес.</span></div></td>
    <td data-label="Карьерная цель"><span className={`directory-goal ${!employee.career_goal ? 'is-inferred' : ''}`}>{target ? `${target.target_grade} · ${target.target_role}` : 'Не определена'}</span><span className={`directory-secondary ${closed ? 'directory-warning' : ''}`}>{closed ? 'Вакансия закрыта' : employee.career_goal ? 'Цель сотрудника' : target ? 'Следующий грейд · цель не выбрана' : 'Обсудите направление развития'}</span></td>
    <td data-label="Соответствие по навыкам">{!closed && progress.percentage !== null ? <div className="directory-progress"><div className="directory-progress-top"><strong>{progress.percentage}%</strong>{progress.percentage === 100 ? <Icon name="check" width="14" height="14" /> : <span>{formatRussianCount(progress.gaps.length, ['зона роста', 'зоны роста', 'зон роста'])}</span>}</div><div className="directory-progress-track" role="progressbar" aria-label={`Соответствие по навыкам: ${employee.full_name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percentage}><span style={{ width: `${progress.percentage}%` }} /></div></div> : <span className="directory-secondary">{closed ? 'Нужна новая цель' : progress.grade ? 'Нет требований' : 'Нет целевой роли'}</span>}</td>
    <td data-label="Обучение"><span className={`directory-learning ${learning.active ? 'is-learning' : learning.pending ? 'is-pending' : ''}`}><span />{learning.active ? formatRussianCount(learning.active, ['активность', 'активности', 'активностей']) : learning.pending ? 'На проверке' : 'Нет активностей'}</span>{learning.active > 0 && learning.pending > 0 && <span className="directory-secondary">На проверке: {learning.pending}</span>}</td>
    <td className="directory-open-cell"><Link className="directory-open" to={`/employees/${employee.employee_id}`} aria-label={`Открыть профиль: ${employee.full_name}`}><Icon name="arrow" width="18" height="18" /></Link></td>
  </tr>
}
