import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../api/client'
import { Spinner } from '../components/Spinner'
import { ErrorBanner } from '../components/ErrorBanner'

export function Login() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionExpired = searchParams.get('expired') === '1'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await login({ email, password })
      // App routes "/" to the role-appropriate landing page.
      navigate('/', { replace: true })
    } catch (err) {
      // The backend returns a generic 500 on bad credentials (see gotcha §3),
      // so we surface a friendly message rather than the raw "unexpected error".
      setError(getErrorMessage(err, 'E-mail ou senha inválidos.'))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/lotus.svg" alt="Suryah" className="mx-auto mb-3 h-14 w-14" />
          <h1 className="text-2xl font-bold text-sage-700">Suryah</h1>
          <p className="mt-1 text-sm text-sage-500">Agendamento de aulas</p>
        </div>

        {sessionExpired && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Sua sessão expirou. Faça login para continuar.
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl bg-white p-6 shadow-sm"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-sage-700"
            >
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-200"
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-sage-700"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-200"
              autoComplete="current-password"
            />
          </div>

          <ErrorBanner message={error} />

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-sage-600 px-4 py-2.5 font-medium text-white transition hover:bg-sage-700 disabled:opacity-60"
          >
            {loading && <Spinner />}
            Entrar
          </button>

          <p className="text-center text-sm text-sage-500">
            Não tem conta?{' '}
            <Link to="/register" className="font-medium text-sage-600 hover:underline">
              Cadastre-se
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
