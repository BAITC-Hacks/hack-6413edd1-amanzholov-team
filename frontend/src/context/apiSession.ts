import { createContext } from 'react'

export type UserInfo = { role?: string; login?: string }
export type SessionValue = {
  token: string | null
  user: UserInfo | null
  signIn: (login: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const SessionContext = createContext<SessionValue | null>(null)
