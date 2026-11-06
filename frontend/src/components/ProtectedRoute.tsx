import { Navigate } from 'react-router-dom'
import { type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { FullPageSpinner } from './Spinner'
import type { Role } from '../types'

interface ProtectedRouteProps {
  children: ReactNode
  roles?: Role[]
}

/**
 * Guards a route: redirects to /login if not authenticated, and to / (the
 * role-appropriate landing page) if the user's role is not allowed.
 */
export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, role } = useAuth()

  // While we don't have a dedicated "initialising" flag, a missing token with
  // no role means we're sure there's no session to wait for.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (roles && role && !roles.includes(role)) {
    // Send them home — App routes them to the right landing based on role.
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

/**
 * Convenience wrapper for admin-only routes.
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute roles={['ADMIN']}>
      {children}
    </ProtectedRoute>
  )
}

export function LoadingGate({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  // A thin gate for pages that need the auth state settled.
  if (isAuthenticated === undefined) return <FullPageSpinner />
  return <>{children}</>
}
