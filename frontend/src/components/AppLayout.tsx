import { useEffect, type PropsWithChildren } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useApiSession } from '../context/useApiSession'
import { apiRequest, asRecord } from '../services/api'
import { HrIcon } from './HrIcon'
import '../App.css'
import '../HrPortal.css'

const hrNavigation = [
  ['/hr', 'overview', 'Обзор команды'],
  ['/hr/skill-gaps', 'skills', 'Развитие навыков'],
  ['/hr/no-next-step', 'support', 'Поддержка сотрудников'],
  ['/hr/participation', 'learning', 'Обучение команды'],
] as const

export function AppLayout({ children }: PropsWithChildren) {
  const { token, user, signOut } = useApiSession()
  const location = useLocation()
  const navigate = useNavigate()
  const label = hrNavigation.find(([path]) => path === location.pathname)?.[2] ?? 'Обзор команды'
  const initials = user?.login?.slice(0, 2).toUpperCase() ?? 'HR'

  useEffect(() => {
    // Local HR preview is for shell/navigation only and must survive backend 401s.
    if (token === 'preview-only') return
    let active = true
    void apiRequest('/me', { token }).then((data) => {
      const currentUser = asRecord(asRecord(data).user)
      if (active && currentUser.role !== 'hr') {
        void signOut().then(() => navigate('/login', { replace: true }))
      }
    }).catch((error: unknown) => {
      if (active && error instanceof Error && 'status' in error && (error as { status: number }).status === 401) {
        void signOut().then(() => navigate('/login', { replace: true }))
      }
    })
    return () => { active = false }
  }, [navigate, signOut, token])

  return <div className="app-shell hr-shell">
    <aside className="sidebar">
      <NavLink className="brand" to="/hr"><span className="brand-mark">✦</span><span>career<span className="brand-light">quest</span></span></NavLink>
      <p className="hr-workspace">Пространство развития команды</p>
      <div className="workspace-label">УПРАВЛЕНИЕ КОМАНДОЙ</div>
      <nav className="side-nav" aria-label="Навигация HR">{hrNavigation.map(([to, icon, text]) => <NavLink key={to} to={to} end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}><HrIcon name={icon} className="nav-icon" />{text}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="hr-account"><div className="avatar">{initials}</div><div className="hr-account-copy"><strong>HR-кабинет</strong><span>Управление командой</span></div></div><button className="hr-logout" onClick={() => void signOut().then(() => navigate('/login'))}><HrIcon name="logout" />Выйти из кабинета</button></div>
    </aside>
    <main className="main-shell" id="main-content"><header className="topbar"><div className="breadcrumb">HR-кабинет <span>›</span> <strong>{label}</strong></div><div className="topbar-right"><span className="dataset-status">Развитие команды</span><div className="avatar">{initials}</div></div></header><div className="content-area">{children}</div></main>
  </div>
}
