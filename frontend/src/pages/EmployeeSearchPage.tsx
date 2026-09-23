import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCareerData } from '../context/careerDataStore'

const initials = (name: string) => name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
const gradeClass = (grade: string) => grade.toLowerCase()

export function EmployeeSearchPage() {
  const { dataset, loading, error, importSupplemental } = useCareerData()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('all')
  const [grade, setGrade] = useState('all')
  const [page, setPage] = useState(0)
  const [importError, setImportError] = useState('')
  const [toast, setToast] = useState('')
  const employeeFile = useRef<HTMLInputElement>(null)
  const historyFile = useRef<HTMLInputElement>(null)
  const pageSize = 12

  const departments = useMemo(() => [...new Set(dataset?.employees.map((employee) => employee.department) ?? [])].sort(), [dataset])
  const filtered = useMemo(() => (dataset?.employees ?? []).filter((employee) => {
    const search = query.trim().toLowerCase()
    const matchesQuery = !search || employee.full_name.toLowerCase().includes(search) || employee.employee_id.toLowerCase().includes(search)
    return matchesQuery && (department === 'all' || employee.department === department) && (grade === 'all' || employee.grade === grade)
  }), [dataset, query, department, grade])
  const visible = filtered.slice(page * pageSize, (page + 1) * pageSize)
  const setFilter = (setter: (value: string) => void) => (value: string) => { setter(value); setPage(0) }
  const handleImport = async () => {
    setImportError('')
    if (!employeeFile.current?.files?.[0] || !historyFile.current?.files?.[0]) { setImportError('Выберите оба файла: employees.json и activity_history.csv.'); return }
    try {
      const count = await importSupplemental(employeeFile.current.files[0], historyFile.current.files[0])
      setToast(`Импортировано профилей: ${count}`)
      ;(document.getElementById('import-modal') as HTMLDialogElement | null)?.close()
      window.setTimeout(() => setToast(''), 3200)
      employeeFile.current.value = ''; historyFile.current.value = ''
    } catch (reason) { setImportError(reason instanceof Error ? reason.message : 'Не удалось импортировать файлы.') }
  }

  return <>
    <div className="page-head"><div><p className="eyebrow">Развитие команды</p><h1>Сотрудники</h1><p className="page-subtitle">Изучайте карьерные цели и прогресс команды. Выберите профиль, чтобы увидеть персональный план развития.</p></div><button className="btn" onClick={() => { setImportError(''); (document.getElementById('import-modal') as HTMLDialogElement | null)?.showModal() }}>↑ <span>Загрузить проверочные данные</span></button></div>
    <div className="stat-grid">
      <div className="card stat-card"><div className="stat-label">Сотрудники в каталоге</div><div className="stat-value">{dataset?.employees.length ?? '—'}</div><div className="stat-note">Все профили из локального набора</div></div>
      <div className="card stat-card"><div className="stat-label">Активностей в истории</div><div className="stat-value">{dataset?.activities.length.toLocaleString('ru-RU') ?? '—'}</div><div className="stat-note">История за последние 24 месяца</div></div>
      <div className="card stat-card"><div className="stat-label">Ролей</div><div className="stat-value">{dataset ? new Set(dataset.employees.map((item) => item.role)).size : '—'}</div><div className="stat-note">Развитие по карьерным трекам</div></div>
      <div className="card stat-card"><div className="stat-label">Навыков в модели</div><div className="stat-value">{dataset?.skills.length ?? '—'}</div><div className="stat-note">Hard и soft skills</div></div>
    </div>

    <div className="search-row"><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setFilter(setQuery)(event.target.value)} placeholder="Поиск по имени или ID" /></label><select className="select" value={department} onChange={(event) => setFilter(setDepartment)(event.target.value)}><option value="all">Все подразделения</option>{departments.map((name) => <option key={name} value={name}>{name}</option>)}</select><select className="select" value={grade} onChange={(event) => setFilter(setGrade)(event.target.value)}><option value="all">Все грейды</option>{['Junior', 'Middle', 'Senior', 'Lead'].map((name) => <option key={name}>{name}</option>)}</select></div>

    {error && <div className="notice error">{error}</div>}
    <section className="card table-wrap"><table className="employee-table"><thead><tr><th>Сотрудник</th><th>Должность</th><th>Подразделение</th><th>Грейд</th><th>Стаж</th><th>Цель развития</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={6} className="empty">Загружаем локальные данные…</td></tr> : visible.length ? visible.map((employee) => <tr key={employee.employee_id} onClick={() => navigate(`/employees/${employee.employee_id}`)}><td><div className="person-cell"><div className="person-avatar">{initials(employee.full_name)}</div><div><div className="person-name">{employee.full_name}</div><div className="person-id">{employee.employee_id}</div></div></div></td><td>{employee.role}</td><td>{employee.department}</td><td><span className={`grade-pill ${gradeClass(employee.grade)}`}>{employee.grade}</span></td><td>{employee.tenure_months} мес.</td><td>{employee.career_goal ? `${employee.career_goal.target_grade} · ${employee.career_goal.target_role}` : 'Не указана'}</td></tr>) : <tr><td colSpan={6} className="empty">Сотрудники по этому запросу не найдены.</td></tr>}
    </tbody></table><div className="table-footer"><span>{filtered.length ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, filtered.length)} из ${filtered.length}` : '0 сотрудников'}</span><span><button className="text-button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>← Назад</button>　<button className="text-button" disabled={(page + 1) * pageSize >= filtered.length} onClick={() => setPage((value) => value + 1)}>Далее →</button></span></div></section>

    <dialog id="import-modal" className="import-dialog"><div className="modal"><h2>Загрузить проверочные данные</h2><p>Загрузите профили и историю по ним. Новые ID добавятся; для совпадающих ID профиль и его история заменятся данными из файлов.</p><label className="field">Профили сотрудников (.json)<input ref={employeeFile} type="file" accept="application/json,.json" /></label><label className="field">История участия (.csv)<input ref={historyFile} type="file" accept="text/csv,.csv" /></label>{importError && <div className="notice error">{importError}</div>}<div className="modal-actions"><button className="btn" onClick={() => (document.getElementById('import-modal') as HTMLDialogElement | null)?.close()}>Отмена</button><button className="btn btn-primary" onClick={handleImport}>Импортировать</button></div></div></dialog>
    {toast && <div className="toast">✓ {toast}</div>}
  </>
}
