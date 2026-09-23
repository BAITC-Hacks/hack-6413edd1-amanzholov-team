import { Navigate, Route, Routes } from 'react-router-dom'
import { CareerDataProvider } from './context/CareerDataContext'
import { AppLayout } from './components/AppLayout'
import { EmployeeProfilePage } from './pages/EmployeeProfilePage'
import { EmployeeSearchPage } from './pages/EmployeeSearchPage'
import { HrDashboardPage } from './pages/HrDashboardPage'
import { LoginPage } from './pages/LoginPage'
import { useCareerData } from './context/careerDataStore'
import { ApiContentPage } from './pages/ApiPages'
import './App.css'

export default function App() {
  return <CareerDataProvider><HrWorkspace /></CareerDataProvider>
}

function HrWorkspace() {
  const { authenticated } = useCareerData()
  if (!authenticated) return <LoginPage />
  return <AppLayout><Routes>
    <Route path="/employees" element={<EmployeeSearchPage />} />
    <Route path="/employees/:employeeId" element={<EmployeeProfilePage />} />
    <Route path="/hr/overview" element={<ApiContentPage />} />
    <Route path="/hr/skill-gaps" element={<ApiContentPage />} />
    <Route path="/hr/no-next-step" element={<ApiContentPage />} />
    <Route path="/hr/participation" element={<ApiContentPage />} />
    <Route path="/hr" element={<HrDashboardPage />} />
    <Route path="*" element={<Navigate to="/employees" replace />} />
  </Routes></AppLayout>
}
