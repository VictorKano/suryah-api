import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateMe } from '../api/me'
import { getErrorMessage } from '../api/client'
import { Modal } from './Modal'
import { ErrorBanner } from './ErrorBanner'
import { Spinner } from './Spinner'
import { useToast } from './Toast'
import { PLAN_LABELS, PLAN_OPTIONS } from '../utils/constants'
import { isValidEmail, isValidPhone, maskPhone } from '../utils/validation'
import type { PlanType } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  adminMode?: boolean // true = show only the password section
}

export function ProfileModal({ open, onClose, adminMode = false }: Props) {
  const { profile, refreshProfile } = useAuth()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [age, setAge] = useState('')
  const [planType, setPlanType] = useState<PlanType>('PRIVATE')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Populate fields when profile loads or modal opens
  useEffect(() => {
    if (profile && open) {
      setName(profile.name)
      setEmail(profile.email)
      setPhone(profile.phone ?? '')
      setAge(profile.age?.toString() ?? '')
      setPlanType(profile.planType)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setError(null)
      setFieldErrors({})
    }
  }, [profile, open])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const errs: Record<string, string> = {}
    if (email && !isValidEmail(email)) errs.email = 'Digite um e-mail válido.'
    if (phone && !isValidPhone(phone)) errs.phone = 'Digite um telefone válido com DDD.'
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }

    if (newPassword && newPassword !== confirmPassword) {
      setError('A nova senha e a confirmação não coincidem.')
      return
    }
    if (newPassword && newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }

    setSaving(true)
    try {
      await updateMe({
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        age: age ? Number(age) : undefined,
        planType,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      })
      await refreshProfile()
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast('Perfil atualizado com sucesso!')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-200'

  return (
    <Modal open={open} onClose={onClose} title={adminMode ? 'Alterar Senha' : 'Meu Perfil'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!adminMode && (
          <>
            <div>
          <label className="mb-1 block text-sm font-medium text-sage-700">Nome</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-sage-700">E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${inputClass} ${fieldErrors.email ? 'border-red-300' : ''}`}
            autoComplete="email"
          />
          {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-sage-700">Telefone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
              placeholder="(11) 91234-5678"
              className={`${inputClass} ${fieldErrors.phone ? 'border-red-300' : ''}`}
            />
            {fieldErrors.phone && <p className="mt-1 text-xs text-red-500">{fieldErrors.phone}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-sage-700">Idade</label>
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
          <label className="mb-1 block text-sm font-medium text-sage-700">Plano</label>
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
          </>
        )}

        {/* Password section */}
        <div className={adminMode ? '' : 'border-t border-sage-100 pt-4'}>
          <p className="mb-3 text-sm font-medium text-sage-600">
            {adminMode ? 'Nova senha' : 'Alterar senha'}{' '}
            <span className="font-normal text-sage-400">(opcional)</span>
          </p>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Senha atual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
                autoComplete="current-password"
                placeholder="Necessário para alterar a senha"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Nova senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Confirmar nova senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>

        <ErrorBanner message={error} />

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-sage-600 hover:bg-sage-50"
          >
            Fechar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-sage-600 px-4 py-2 text-sm font-medium text-white hover:bg-sage-700 disabled:opacity-60"
          >
            {saving && <Spinner />}
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  )
}
