import { useState, type FormEvent } from 'react'
import { useCareerData } from '../context/careerDataStore'

export function LoginPage() {
  const { login, loading, error } = useCareerData()
  const [username, setUsername] = useState('hr')
  const [password, setPassword] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    await login(username, password)
    setPassword('')
  }
  return <main className="login-shell"><form className="card login-card" onSubmit={submit}>
    <p className="eyebrow">Career Quest · HR</p><h1>Вход в HR-кабинет</h1>
    <p className="page-subtitle">Сотрудники, карьерные цели и развитие вашей команды.</p>
    <label className="field">Логин<input required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} /></label>
    <label className="field">Пароль<input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
    {error && <div role="alert" className="notice error">{error}</div>}
    <button className="btn btn-primary" disabled={loading}>{loading ? 'Подключаемся…' : 'Войти'}</button>
  </form></main>
}
