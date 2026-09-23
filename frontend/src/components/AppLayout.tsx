import { useEffect, type PropsWithChildren } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useCareerData } from '../context/careerDataStore'
import '../App.css'

export function AppLayout({ children }: PropsWithChildren) {
  const { loading, error, dataset, selectedEmployeeId, selectEmployee } = useCareerData()
  const location = useLocation()
  const isOverview = location.pathname === '/overview'
  const profileMatch = location.pathname.match(/^\/employees\/([^/]+)$/)
  const profileEmployeeId = profileMatch?.[1]
  const selectedEmployee = dataset?.employees.find((employee) => employee.employee_id === (profileEmployeeId ?? selectedEmployeeId)) ?? dataset?.employees[0]
  const isEmployeePortal = isOverview || Boolean(profileEmployeeId)
  const isHrPortal = location.pathname === '/hr' || location.pathname === '/employees'
  const profilePath = selectedEmployee ? `/employees/${selectedEmployee.employee_id}` : '/employees'
  const navLink = (to: string, icon: string, label: string, active: boolean) => <NavLink to={to} end className={`nav-link${active ? ' active' : ''}`} key={`${to}-${label}`}><span className="nav-icon">{icon}</span>{label}</NavLink>

  useEffect(() => {
    if (profileEmployeeId && dataset?.employees.some((employee) => employee.employee_id === profileEmployeeId) && profileEmployeeId !== selectedEmployeeId) {
      selectEmployee(profileEmployeeId)
    }
  }, [dataset, profileEmployeeId, selectedEmployeeId, selectEmployee])

  const pageLabel = isOverview ? 'Обзор'
    : location.pathname === '/hr' ? 'Обзор команды'
      : location.pathname === '/employees' ? 'Сотрудники'
        : location.hash === '#career-path' ? 'Карьерный путь'
          : location.hash === '#activities' ? 'Мои активности'
            : location.hash === '#history' ? 'История обучения'
              : 'Профиль сотрудника'
  const initials = selectedEmployee?.full_name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase() ?? 'CQ'

  return <div className={`app-shell${isOverview ? ' overview-shell' : ''}`}>
    <aside className="sidebar">
      <NavLink className="brand" to="/overview"><span className="brand-mark">✦</span><span>career<span className="brand-light">quest</span></span></NavLink>
      {isOverview && <div className="brand-tagline">РАСТИ В СВОЁМ ТЕМПЕ</div>}
      <div className="role-switch"><NavLink to="/overview" className={`role-option${isEmployeePortal ? ' active' : ''}`}>Сотрудник</NavLink><NavLink to="/hr" className={`role-option${isHrPortal ? ' active' : ''}`}>HR-кабинет</NavLink></div>
      <div className="workspace-label">{isEmployeePortal ? 'МОЁ РАЗВИТИЕ' : 'УПРАВЛЕНИЕ КОМАНДОЙ'}</div>
      <nav className="side-nav" aria-label="Основная навигация">
        {isEmployeePortal ? <>
          {navLink('/overview', '▦', 'Обзор', isOverview)}
          {navLink(`${profilePath}#career-path`, '⌑', 'Карьерный путь', Boolean(profileEmployeeId) && location.hash === '#career-path')}
          {navLink(`${profilePath}#activities`, '▤', 'Мои активности', Boolean(profileEmployeeId) && location.hash === '#activities')}
          {navLink(`${profilePath}#history`, '◷', 'История обучения', Boolean(profileEmployeeId) && location.hash === '#history')}
          {navLink(`${profilePath}#profile`, '♙', 'Мой профиль', Boolean(profileEmployeeId) && (!location.hash || location.hash === '#profile'))}
        </> : <>
          {navLink('/hr', '▥', 'Обзор команды', location.pathname === '/hr')}
          {navLink('/employees', '♙', 'Сотрудники', location.pathname === '/employees')}
        </>}
      </nav>
      <div className="sidebar-bottom">{isOverview && <div className="sidebar-prompt"><span>✧</span><strong>Большие цели. Маленькие шаги.</strong><p>Ваш следующий уровень начинается с одной новой привычки.</p><NavLink to="/employees">Как работает подбор <b>→</b></NavLink></div>}<div className="demo-badge"><span className="status-dot"/>Локальный режим</div><div className="sidebar-caption">Данные доступны в этом браузере<br/>без подключения к серверу.</div></div>
    </aside>
    <main className="main-shell">
      <header className="topbar"><div className="breadcrumb">{isEmployeePortal ? <>Моё развитие <span>›</span> <strong>{pageLabel}</strong></> : <>HR-кабинет <span>›</span> <strong>{pageLabel}</strong></>}</div><div className="topbar-right"><span className="dataset-status">{loading ? 'Загрузка данных…' : error ? 'Ошибка данных' : `${dataset?.employees.length ?? 0} сотрудников`}</span><div className="avatar">{initials}</div></div></header>
      <div className="content-area">{children}</div>
    </main>
  </div>
}
