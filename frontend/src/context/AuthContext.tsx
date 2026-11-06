import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { LoginRequest, RegisterRequest, Role, StudentResponse, TokenResponse } from '../types'
import * as authApi from '../api/auth'
import { getMe } from '../api/me'

interface AuthState {
  token: string | null
  role: Role | null
  profile: StudentResponse | null
  isAuthenticated: boolean
  loading: boolean
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

const TOKEN_KEY = 'suryah_token'
const ROLE_KEY = 'suryah_role'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  )
  const [role, setRole] = useState<Role | null>(() => {
    const r = localStorage.getItem(ROLE_KEY)
    return r === 'STUDENT' || r === 'ADMIN' ? r : null
  })
  const [profile, setProfile] = useState<StudentResponse | null>(null)
  const [loading, setLoading] = useState(false)

  // Keep localStorage in sync if the client.ts interceptor ever clears the token.
  useEffect(() => {
    const handleStorage = () => {
      const t = localStorage.getItem(TOKEN_KEY)
      const r = localStorage.getItem(ROLE_KEY)
      if (!t) {
        setToken(null)
        setRole(null)
        setProfile(null)
      } else {
        setToken(t)
        if (r === 'STUDENT' || r === 'ADMIN') setRole(r)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // Fetch profile on mount if already authenticated (page refresh)
  useEffect(() => {
    if (token && !profile) {
      getMe().then(setProfile).catch(() => {/* token may be expired — interceptor handles redirect */})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const persist = useCallback(async (res: TokenResponse) => {
    localStorage.setItem(TOKEN_KEY, res.token)
    localStorage.setItem(ROLE_KEY, res.role)
    setToken(res.token)
    setRole(res.role)
    // Fetch full profile right after persisting so the name is available immediately
    try {
      const p = await getMe()
      setProfile(p)
    } catch {
      // non-critical — name just won't show until next load
    }
  }, [])

  const login = useCallback(
    async (data: LoginRequest) => {
      setLoading(true)
      try {
        const res = await authApi.login(data)
        await persist(res)
      } finally {
        setLoading(false)
      }
    },
    [persist],
  )

  const register = useCallback(
    async (data: RegisterRequest) => {
      setLoading(true)
      try {
        await authApi.register(data)
        const res = await authApi.login({
          email: data.email,
          password: data.password,
        })
        await persist(res)
      } finally {
        setLoading(false)
      }
    },
    [persist],
  )

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(ROLE_KEY)
    setToken(null)
    setRole(null)
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    try {
      const p = await getMe()
      setProfile(p)
    } catch {
      // ignore
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      token,
      role,
      profile,
      isAuthenticated: !!token,
      loading,
      login,
      register,
      logout,
      refreshProfile,
    }),
    [token, role, profile, loading, login, register, logout, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
