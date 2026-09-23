import { createContext, useContext } from 'react'
import type { CareerDataset } from '../types/career'

export type CareerContextValue = {
  dataset: CareerDataset | null
  loading: boolean
  error: string | null
  selectedEmployeeId: string | null
  selectEmployee: (employeeId: string) => void
  completeActivity: (employeeId: string, eventId: string) => void
  importSupplemental: (employeesFile: File, historyFile: File) => Promise<number>
}

export const CareerDataContext = createContext<CareerContextValue | null>(null)

export function useCareerData() {
  const context = useContext(CareerDataContext)
  if (!context) throw new Error('useCareerData must be used inside CareerDataProvider')
  return context
}
