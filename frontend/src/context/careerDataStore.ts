import { createContext, useContext } from 'react'
import type { CareerDataset } from '../types/career'

export type CareerContextValue = {
  dataset: CareerDataset | null
  loading: boolean
  error: string | null
  authenticated: boolean
  login: (login: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

export const CareerDataContext = createContext<CareerContextValue | null>(null)

export function useCareerData() {
  const context = useContext(CareerDataContext)
  if (!context) throw new Error('useCareerData must be used inside CareerDataProvider')
  return context
}
