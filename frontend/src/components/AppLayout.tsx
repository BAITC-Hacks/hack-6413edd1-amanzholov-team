import type { PropsWithChildren } from 'react'
import { NavLink } from 'react-router-dom'
import { useCareerData } from '../context/careerDataStore'
import '../App.css'

export function AppLayout({ children }: PropsWithChildren) {
  const { loading, error, dataset } = useCareerData()
  return <div className="app-shell">
    <aside className="sidebar">
      <NavLink className="brand" to="/employees"><span className="brand-mark">q</span><span>career<span className="brand-light">quest</span></span></NavLink>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Основная навигация">
        <NavLink to="/employees"><span className="nav-icon">◫</span>Развитие сотрудников</NavLink>
        <NavLink to="/hr"><span className="nav-icon">▥</span>HR-аналитика</NavLink>
      </nav>
      <div className="sidebar-bottom"><div className="demo-badge"><span className="status-dot"/>Локальный режим</div><div className="sidebar-caption">Данные доступны в этом браузере<br/>без подключения к серверу.</div></div>
    </aside>
    <main className="main-shell">
      <header className="topbar"><div className="breadcrumb">Career Quest <span>/</span> <strong>Платформа развития</strong></div><div className="topbar-right"><span className="dataset-status">{loading ? 'Загрузка данных…' : error ? 'Ошибка данных' : `${dataset?.employees.length ?? 0} сотрудников`}</span><div className="avatar">CQ</div></div></header>
      <div className="content-area">{children}</div>
    </main>
  </div>
}
