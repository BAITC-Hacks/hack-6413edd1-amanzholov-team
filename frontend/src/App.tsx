import { Navigate, Route, Routes } from 'react-router-dom'
import { CareerDataProvider } from './context/CareerDataContext'
import { AppLayout } from './components/AppLayout'
import { EmployeeProfilePage } from './pages/EmployeeProfilePage'
import { EmployeeSearchPage } from './pages/EmployeeSearchPage'
import { HrDashboardPage } from './pages/HrDashboardPage'
import { EmployeeOverviewPage } from './pages/EmployeeOverviewPage'

export default function App() {
  return <CareerDataProvider><AppLayout><Routes>
    <Route path="/overview" element={<EmployeeOverviewPage />} />
    <Route path="/employees" element={<EmployeeSearchPage />} />
    <Route path="/employees/:employeeId" element={<EmployeeProfilePage />} />
    <Route path="/hr" element={<HrDashboardPage />} />
    <Route path="*" element={<Navigate to="/overview" replace />} />
  </Routes></AppLayout></CareerDataProvider>
}
