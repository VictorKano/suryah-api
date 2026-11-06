import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../api/client'
import { Spinner } from '../components/Spinner'
import { ErrorBanner } from '../components/ErrorBanner'
import { PLAN_LABELS, PLAN_OPTIONS } from '../utils/constants'
import { isValidEmail, isValidPhone, maskPhone } from '../utils/validation'
import type { PlanType } from '../types'

export function Register() {
  const { register, loading } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [age, setAge] = useState('')
  const [password, setPassword] = useState('')
  const [planType, setPlanType] = useState<PlanType>('PRIVATE')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (email && !isValidEmail(email)) errs.email = 'Digite um e-mail válido.'
    if (phone && !isValidPhone(phone)) errs.phone = 'Digite um telefone válido com DDD.'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!validate()) return
    try {
      await register({
        name,
        email,
        phone: phone || undefined,
        age: age ? Number(age) : undefined,
        password,
        planType,
      })
      navigate('/', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const inputClass =
    'w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-200'

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand-50 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <img src="/lotus.svg" alt="Suryah" className="mx-auto mb-3 h-14 w-14" />
          <h1 className="text-2xl font-bold text-sage-700">Criar Conta</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl bg-white p-6 shadow-sm"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-sage-700">
              Nome
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-sage-700">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${inputClass} ${fieldErrors.email ? 'border-red-300' : ''}`}
              autoComplete="email"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-sage-700">
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">
                Telefone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                placeholder="(11) 91234-5678"
                className={`${inputClass} ${fieldErrors.phone ? 'border-red-300' : ''}`}
              />
              {fieldErrors.phone && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.phone}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">
                Idade
              </label>
              <input
                type="number"
                min={1}
                max={119}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-sage-700">
              Plano
            </label>
            <select
              value={planType}
              onChange={(e) => setPlanType(e.target.value as PlanType)}
              className={inputClass}
            >
              {PLAN_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {PLAN_LABELS[p]}
                </option>
              ))}
            </select>
          </div>

          <ErrorBanner message={error} />

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-sage-600 px-4 py-2.5 font-medium text-white transition hover:bg-sage-700 disabled:opacity-60"
          >
            {loading && <Spinner />}
            Cadastrar
          </button>

          <p className="text-center text-sm text-sage-500">
            Já tem conta?{' '}
            <Link to="/login" className="font-medium text-sage-600 hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
