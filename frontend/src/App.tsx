import { Navigate, Route, Routes } from 'react-router-dom'
import { ApiSessionProvider } from './context/ApiSessionContext'
import { useApiSession } from './context/useApiSession'
import { AppLayout } from './components/AppLayout'
import { HrContentPage, LoginPage } from './pages/HrPages'

function ApplicationRoutes() {
  const { token, user } = useApiSession()
  const isHr = Boolean(token && user?.role === 'hr')
  return <Routes>
    <Route path="/login" element={isHr ? <Navigate to="/hr" replace /> : <LoginPage />} />
    <Route path="*" element={isHr ? <AppLayout><Routes>
      <Route path="/hr" element={<HrContentPage />} />
      <Route path="/hr/skill-gaps" element={<HrContentPage />} />
      <Route path="/hr/no-next-step" element={<HrContentPage />} />
      <Route path="/hr/participation" element={<HrContentPage />} />
      <Route path="*" element={<Navigate to="/hr" replace />} />
    </Routes></AppLayout> : <Navigate to="/login" replace />} />
  </Routes>
}

export default function App() {
  return <ApiSessionProvider><ApplicationRoutes /></ApiSessionProvider>
}
