import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { useApiSession } from '../context/useApiSession'
import { ApiError, session, apiRequest, asItems, asRecord, displayValue, type JsonRecord } from '../services/api'

function useResource(path: string) {
  const token = session.get()
  const [data, setData] = useState<unknown>(null)
  const [loadedRevision, setLoadedRevision] = useState(-1)
  const [error, setError] = useState<unknown>(null)
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => { setError(null); setRevision((value) => value + 1) }, [])
  useEffect(() => {
    let active = true
    void apiRequest(path, { token }).then((result) => {
      if (active) setData(result)
    }).catch((reason: unknown) => {
      if (active) setError(reason)
    }).finally(() => { if (active) setLoadedRevision(revision) })
    return () => { active = false }
  }, [path, revision, token])
  return { data, loading: loadedRevision !== revision, error, refresh }
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="page-head"><div><p className="eyebrow">Career Quest · HR</p><h1>{title}</h1><p className="page-subtitle">{subtitle}</p></div></div>
}

function ErrorNote({ error }: { error: unknown }) {
  const apiError = error instanceof ApiError ? error : null
  const message = apiError?.status === 502 || apiError?.status === 0
    ? 'Backend API недоступен: приложение не получило ответ от сервера на localhost:8000.'
    : apiError?.status === 404
      ? 'На localhost:8000 отвечает сервер, но он не распознаёт маршрут Career Quest API.'
    : apiError?.status === 401
      ? 'Сессия HR истекла или токен недействителен. Войдите снова.'
      : apiError?.status === 403
        ? 'У этой учётной записи нет HR-доступа к данным подразделения.'
        : error instanceof Error ? error.message : 'Не удалось загрузить данные.'
  const hint = apiError?.status === 502 || apiError?.status === 0
    ? 'Проверьте backend: в backend/.env должны быть заданы POSTGRES_PASSWORD и DATABASE_URL; для демо также DEMO_SEED=true и DEMO_PASSWORD. Затем запустите docker compose up --build из папки backend.'
    : apiError?.status === 404
      ? 'Проверьте, что порт 8000 принадлежит именно Career Quest backend. Его health endpoint должен отвечать на /health/live, а API находится под /api/v1.'
    : apiError?.status === 403
      ? 'Используйте demo-аккаунт hr: именно ему backend выдаёт разрешение hr на демонстрационное подразделение.'
      : 'Запрос отправлен в backend API; сервер вернул ошибку.'
  return <div className="notice error"><strong>{message}</strong><span className="api-help">{hint}</span>{apiError?.requestId && <small>Request ID: {apiError.requestId}</small>}</div>
}

function DataCard({ item }: { item: JsonRecord }) {
  const preferred = ['title', 'name', 'kind', 'status', 'reason_code', 'coverage', 'employee_count', 'participations', 'completed', 'total']
  const fields = Object.entries(item).filter(([key, value]) => !['id', 'items', 'created_at', 'updated_at', 'published_at', 'snapshot', 'versions'].includes(key) && value !== null && typeof value !== 'object')
  fields.sort(([a], [b]) => (preferred.indexOf(a) < 0 ? 99 : preferred.indexOf(a)) - (preferred.indexOf(b) < 0 ? 99 : preferred.indexOf(b)))
  const title = preferred.map((key) => item[key]).find((value) => typeof value === 'string' && value.length > 0) ?? item.id ?? 'Показатель'
  return <article className="api-card"><h3>{String(title)}</h3>{fields.length > 0 && <dl className="api-fields">{fields.map(([key, value]) => <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{displayValue(value)}</dd></div>)}</dl>}<details><summary>Детали отчёта</summary><pre>{JSON.stringify(item, null, 2)}</pre></details></article>
}

function ResultPanel({ data, loading, error, refresh }: { data: unknown; loading: boolean; error: unknown; refresh: () => void }) {
  if (loading) return <div className="notice">Запрашиваем HR-отчёт из backend…</div>
  if (error) return <ErrorNote error={error} />
  const value = asRecord(data)
  const items = asItems(data)
  const summary = Object.fromEntries(Object.entries(value).filter(([key, field]) => !['items', 'id', 'created_at', 'updated_at', 'published_at', 'snapshot', 'versions'].includes(key) && field !== null && typeof field !== 'object'))
  const cards = items.length ? items : Object.keys(summary).length ? [summary] : []
  return <>
    <div className="api-toolbar"><span>Источник: {String(value.total ?? cards.length)} записей · backend API</span><button className="btn" onClick={refresh}>Обновить</button></div>
    {cards.length ? <div className="api-card-grid">{cards.map((item, index) => <DataCard key={String(item.id ?? item.skill_id ?? item.employee_id ?? index)} item={item} />)}</div> : <div className="notice">В этом HR-отчёте пока нет записей.</div>}
    {value.items && <details className="api-raw"><summary>Ответ API целиком</summary><pre>{JSON.stringify(data, null, 2)}</pre></details>}
  </>
}

const reports: Record<string, { title: string; subtitle: string; endpoint: string }> = {
  '/hr': { title: 'Обзор команды', subtitle: 'Сводные показатели и участие сотрудников в развитии.', endpoint: '/hr/overview' },
  '/hr/skill-gaps': { title: 'Разрывы навыков', subtitle: 'Разрывы относительно карьерных целей; роли не усредняются между собой.', endpoint: '/hr/skill-gaps?offset=0&limit=100' },
  '/hr/no-next-step': { title: 'Нет следующего шага', subtitle: 'Сотрудники, для которых пока не сформирован актуальный следующий шаг.', endpoint: '/hr/employees-without-next-step?offset=0&limit=100' },
  '/hr/participation': { title: 'Участие в обучении', subtitle: 'Количество записей и завершений за период.', endpoint: '/hr/activity-participation' },
}

export function ApiContentPage() {
  const path = useLocation().pathname
  const report = reports[path] ?? reports['/hr']
  const resource = useResource(report.endpoint)
  return <><PageHeader title={report.title} subtitle={report.subtitle} /><ResultPanel data={resource.data} loading={resource.loading} error={resource.error} refresh={resource.refresh} /></>
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
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось войти.') }
    finally { setBusy(false) }
  }
  return <main className="login-shell"><form className="login-card" onSubmit={(event) => void submit(event)}><div className="brand-mark">✦</div><p className="eyebrow">Career Quest · HR-платформа</p><h1>Вход для HR</h1><p className="page-subtitle">Войдите с HR-учётной записью. Сотруднический кабинет находится в мобильном приложении.</p><label className="field">Логин<input autoComplete="username" value={login} onChange={(event) => setLogin(event.target.value)} required /></label><label className="field">Пароль<input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <div className="notice error">{error}</div>}<button className="btn btn-primary login-submit" disabled={busy}>{busy ? 'Входим…' : 'Войти'}</button><p className="privacy-note">API: {import.meta.env.VITE_API_BASE_URL ?? '/api/v1'}</p></form></main>
}
