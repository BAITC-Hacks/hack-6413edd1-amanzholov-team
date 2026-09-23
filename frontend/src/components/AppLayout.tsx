import { useEffect, type PropsWithChildren } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useApiSession } from '../context/useApiSession'
import { apiRequest, asRecord } from '../services/api'
import '../App.css'

const hrNavigation = [
  ['/hr', '▥', 'Обзор команды'],
  ['/hr/skill-gaps', '◇', 'Разрывы навыков'],
  ['/hr/no-next-step', '↗', 'Нет следующего шага'],
  ['/hr/participation', '◷', 'Участие в обучении'],
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

  return <div className="app-shell">
    <aside className="sidebar">
      <NavLink className="brand" to="/hr"><span className="brand-mark">✦</span><span>career<span className="brand-light">quest</span></span></NavLink>
      <div className="role-switch"><span className="role-option active">HR-кабинет</span><button className="role-option role-button" onClick={() => void signOut().then(() => navigate('/login'))}>Выйти</button></div>
      <div className="workspace-label">УПРАВЛЕНИЕ КОМАНДОЙ</div>
      <nav className="side-nav" aria-label="Навигация HR">{hrNavigation.map(([to, icon, text]) => <NavLink key={to} to={to} end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}><span className="nav-icon">{icon}</span>{text}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="demo-badge"><span className="status-dot"/>HR-портал</div><div className="sidebar-caption">Аналитика и данные команды<br />из Career Quest API.</div></div>
    </aside>
    <main className="main-shell"><header className="topbar"><div className="breadcrumb">Career Quest <span>›</span> <strong>{label}</strong></div><div className="topbar-right"><span className="dataset-status">HR · Backend API</span><div className="avatar">{initials}</div></div></header><div className="content-area">{children}</div></main>
  </div>
}
