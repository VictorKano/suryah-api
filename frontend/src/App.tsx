import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Layout } from './components/Layout'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Schedule } from './pages/Schedule'
import { MyBookings } from './pages/MyBookings'
import { AdminDashboard } from './pages/admin/Dashboard'
import { ClassTypesAdmin } from './pages/admin/ClassTypes'
import { RecurringClassesAdmin } from './pages/admin/RecurringClasses'
import { GenerateSessionsAdmin } from './pages/admin/GenerateSessions'
import { SessionManagementAdmin } from './pages/admin/SessionManagement'
import { StudentsAdmin } from './pages/admin/Students'
import { ReportsAdmin } from './pages/admin/Reports'

/** Role-aware landing: students go to the schedule, admins to the dashboard. */
function Home() {
  const { role } = useAuth()
  return <Navigate to={role === 'ADMIN' ? '/admin' : '/schedule'} replace />
}

export default function App() {
  return (
    <Routes>
      {/* Public auth routes (no layout) */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Everything else lives inside the Layout with auth guards */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Shared */}
        <Route path="/" element={<Home />} />

        {/* Student */}
        <Route
          path="/schedule"
          element={
            <ProtectedRoute roles={['STUDENT']}>
              <Schedule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute roles={['STUDENT']}>
              <MyBookings />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/class-types"
          element={
            <AdminRoute>
              <ClassTypesAdmin />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/recurring-classes"
          element={
            <AdminRoute>
              <RecurringClassesAdmin />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/sessions"
          element={
            <AdminRoute>
              <SessionManagementAdmin />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/generate"
          element={
            <AdminRoute>
              <GenerateSessionsAdmin />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <AdminRoute>
              <ReportsAdmin />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/students"
          element={
            <AdminRoute>
              <StudentsAdmin />
            </AdminRoute>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
