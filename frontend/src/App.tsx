import { Navigate, Route, Routes } from 'react-router-dom'
import { ApiSessionProvider } from './context/ApiSessionContext'
import { useApiSession } from './context/useApiSession'
import { AppLayout } from './components/AppLayout'
import { ApiContentPage, LoginPage } from './pages/ApiPages'

function ApplicationRoutes() {
  const { token, user } = useApiSession()
  const isHr = Boolean(token && user?.role === 'hr')
  return <Routes>
    <Route path="/login" element={isHr ? <Navigate to="/hr" replace /> : <LoginPage />} />
    <Route path="*" element={isHr ? <AppLayout><Routes>
      <Route path="/hr" element={<ApiContentPage />} />
      <Route path="/hr/skill-gaps" element={<ApiContentPage />} />
      <Route path="/hr/no-next-step" element={<ApiContentPage />} />
      <Route path="/hr/participation" element={<ApiContentPage />} />
      <Route path="*" element={<Navigate to="/hr" replace />} />
    </Routes></AppLayout> : <Navigate to="/login" replace />} />
  </Routes>
}

export default function App() {
  return <ApiSessionProvider><ApplicationRoutes /></ApiSessionProvider>
}
