import { useContext } from 'react'
import { SessionContext } from './apiSession'

export function useApiSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useApiSession must be used inside ApiSessionProvider')
  return value
}
