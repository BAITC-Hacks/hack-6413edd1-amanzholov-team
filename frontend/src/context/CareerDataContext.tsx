import { useCallback, useEffect, useState, type PropsWithChildren } from 'react'
import { api, ApiError, session } from '../services/api'
import type { CareerDataset } from '../types/career'
import { CareerDataContext } from './careerDataStore'

export function CareerDataProvider({ children }: PropsWithChildren) {
  const [dataset, setDataset] = useState<CareerDataset | null>(null)
  const [loading, setLoading] = useState(!!session.get())
  const [error, setError] = useState<string | null>(null)
  const [authenticated, setAuthenticated] = useState(!!session.get())

  const loadData = useCallback(async (signal?: AbortSignal) => {
    try {
      const loaded = await api<CareerDataset>('/hr/workspace', { signal })
      if (!signal?.aborted) { setDataset(loaded); setAuthenticated(true); setError(null) }
    } catch (reason) {
      if (signal?.aborted) return
      setDataset(null)
      if (reason instanceof ApiError && [401, 403].includes(reason.status)) {
        session.clear()
        setAuthenticated(false)
      }
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить данные.')
    } finally { if (!signal?.aborted) setLoading(false) }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    if (session.get()) void loadData(controller.signal)
    return () => controller.abort()
  }, [loadData])

  const refresh = async () => {
    setLoading(true)
    setError(null)
    await loadData()
  }

  const login = async (login: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await api<{ access_token: string }>('/auth/login', {
        method: 'POST', body: JSON.stringify({ login, password }),
      })
      session.set(result.access_token)
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось войти.')
    } finally { setLoading(false) }
  }

  const logout = async () => {
    setLoading(true)
    try {
      await api('/auth/logout', { method: 'POST', body: '{}' })
      session.clear(); setDataset(null); setAuthenticated(false); setError(null)
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) {
        session.clear(); setDataset(null); setAuthenticated(false); setError(null)
      } else setError(reason instanceof Error ? reason.message : 'Не удалось выйти. Повторите попытку.')
    } finally { setLoading(false) }
  }

  return <CareerDataContext.Provider value={{ dataset, loading, error, authenticated, login, logout, refresh }}>{children}</CareerDataContext.Provider>
}
