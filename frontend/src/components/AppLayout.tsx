import type { PropsWithChildren } from 'react'
import { NavLink } from 'react-router-dom'
import { useCareerData } from '../context/careerDataStore'
import { WorkspaceIcon as Icon } from './WorkspaceIcon'
import '../App.css'

export function AppLayout({ children }: PropsWithChildren) {
  const { loading, error, dataset, refresh, logout } = useCareerData()
  return <div className="app-shell">
    <aside className="sidebar">
      <NavLink className="brand" to="/employees"><span className="brand-mark">q</span><span>career<span className="brand-light">quest</span></span></NavLink>
      <div className="workspace-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
      <nav className="side-nav" aria-label="Основная навигация">
        <NavLink to="/employees"><Icon name="users" width="18" height="18" />Сотрудники</NavLink>
        <NavLink to="/hr" end><Icon name="chart" width="18" height="18" />HR-аналитика</NavLink>
        <NavLink to="/hr/overview">Обзор команды</NavLink>
        <NavLink to="/hr/skill-gaps">Разрывы навыков</NavLink>
        <NavLink to="/hr/no-next-step">Нет следующего шага</NavLink>
        <NavLink to="/hr/participation">Участие в обучении</NavLink>
      </nav>
      <div className="sidebar-bottom"><div className="sidebar-workspace"><div className="sidebar-workspace-mark"><Icon name="users" /></div><div><div className="demo-badge"><span className="status-dot"/>HR-кабинет</div><div className="sidebar-caption">Развитие вашей команды</div></div></div><button className="sidebar-logout" disabled={loading} onClick={() => void logout()}><Icon name="logout" width="16" height="16" />Выйти из кабинета</button></div>
    </aside>
    <main className="main-shell">
      <header className="topbar"><div className="breadcrumb">Рабочее пространство <span>/</span> <strong>Развитие команды</strong></div><div className="topbar-right"><button className="workspace-refresh" disabled={loading} onClick={() => void refresh()} aria-label="Обновить данные"><Icon name="refresh" width="15" height="15" /><span>{loading ? 'Обновление…' : 'Обновить данные'}</span></button><span className="dataset-status">{error ? 'Ошибка данных' : dataset ? 'HR Workspace' : 'Загрузка…'}</span><div className="avatar">HR</div></div></header>
      <div className="content-area">{children}</div>
    </main>
  </div>
}
