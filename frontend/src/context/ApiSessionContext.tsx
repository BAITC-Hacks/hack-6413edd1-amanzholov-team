import { useMemo, useState, type PropsWithChildren } from 'react'
import { apiRequest, asRecord } from '../services/api'
import { SessionContext, type UserInfo, type SessionValue } from './apiSession'

const TOKEN_KEY = 'career-quest-api-token'

export function ApiSessionProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<UserInfo | null>(() => {
    try { return JSON.parse(localStorage.getItem('career-quest-api-user') ?? 'null') as UserInfo | null } catch { return null }
  })

  const value = useMemo<SessionValue>(() => ({
    token,
    user,
    async signIn(login, password) {
      const result = asRecord(await apiRequest('/auth/login', { method: 'POST', body: { login, password } }))
      if (typeof result.access_token !== 'string') throw new Error('Backend не вернул access token.')
      const nextToken = result.access_token
      const profile = asRecord(await apiRequest('/me', { token: nextToken }))
      const nextUser = asRecord(profile.user) as UserInfo
      if (nextUser.role !== 'hr') {
        await apiRequest('/auth/logout', { method: 'POST', token: nextToken }).catch(() => undefined)
        throw new Error('Веб-платформа Career Quest доступна только HR-аккаунтам.')
      }
      localStorage.setItem(TOKEN_KEY, nextToken)
      localStorage.setItem('career-quest-api-user', JSON.stringify(nextUser))
      setToken(nextToken)
      setUser(nextUser)
    },
    async signOut() {
      if (token) await apiRequest('/auth/logout', { method: 'POST', token }).catch(() => undefined)
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('career-quest-api-user')
      setToken(null)
      setUser(null)
    },
  }), [token, user])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
