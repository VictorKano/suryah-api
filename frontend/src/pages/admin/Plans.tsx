import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { listPlans, createPlan, updatePlan, setPlanActive } from '../../api/plans'
import { getErrorMessage } from '../../api/client'
import { FullPageSpinner, Spinner } from '../../components/Spinner'
import { ErrorBanner } from '../../components/ErrorBanner'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import type { BillingCycle, BillingType, PlanResponse } from '../../types'

const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  MONTHLY: 'Mensal',
  SEMESTER: 'Semestral',
  ANNUAL: 'Anual',
}

type FormState = {
  name: string
  billingType: BillingType
  // PER_SESSION
  pricePerAttendance: string
  // SUBSCRIPTION
  billingCycle: BillingCycle
  weeklySessionLimit: string
  price: string
}

const EMPTY_FORM: FormState = {
  name: '',
  billingType: 'PER_SESSION',
  pricePerAttendance: '',
  billingCycle: 'MONTHLY',
  weeklySessionLimit: '',
  price: '',
}

export function PlansAdmin() {
  const { toast } = useToast()
  const [plans, setPlans] = useState<PlanResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PlanResponse | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { setPlans(await listPlans()) }
    catch (err) { setError(getErrorMessage(err)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (p: PlanResponse) => {
    setEditing(p)
    setForm({
      name: p.name,
      billingType: p.billingType,
      pricePerAttendance: String(p.pricePerAttendance),
      billingCycle: p.billingCycle ?? 'MONTHLY',
      weeklySessionLimit: p.weeklySessionLimit != null ? String(p.weeklySessionLimit) : '',
      price: p.price != null ? String(p.price) : '',
    })
    setFormError(null)
    setModalOpen(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const isSubscription = form.billingType === 'SUBSCRIPTION'
      const data = {
        name: form.name,
        billingType: form.billingType,
        pricePerAttendance: isSubscription ? 0 : Number(form.pricePerAttendance),
        billingCycle: isSubscription ? form.billingCycle : null,
        weeklySessionLimit: isSubscription ? Number(form.weeklySessionLimit) : null,
        price: isSubscription ? Number(form.price) : null,
      }
      if (editing) await updatePlan(editing.id, data)
      else await createPlan(data)
      setModalOpen(false)
      await load()
      toast(editing ? 'Plano atualizado.' : 'Plano criado.')
    } catch (err) { setFormError(getErrorMessage(err)) }
    finally { setSaving(false) }
  }

  const handleToggle = async (p: PlanResponse) => {
    try {
      await setPlanActive(p.id, !p.active)
      await load()
      toast(p.active ? 'Plano desativado.' : 'Plano ativado.')
    } catch (err) { setError(getErrorMessage(err)) }
  }

  const inputClass = 'w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-200'
  const isSubscription = form.billingType === 'SUBSCRIPTION'

  if (loading) return <FullPageSpinner />

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sage-800">Planos</h1>
          <p className="mt-0.5 text-sm text-sage-400">Configure planos por sessão e planos de assinatura.</p>
        </div>
        <button onClick={openCreate} className="rounded-lg bg-sage-600 px-4 py-2 text-sm font-medium text-white hover:bg-sage-700">+ Novo Plano</button>
      </div>

      <ErrorBanner message={error} />

      {plans.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sage-200 py-16 text-center text-sage-400">Nenhum plano cadastrado.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-sage-100 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="border-b border-sage-100 bg-sage-50 text-sm text-sage-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Cobrança / Limite</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage-50">
              {plans.map((p) => (
                <tr key={p.id} className={`text-sm ${p.active ? 'text-sage-700' : 'text-sage-400 opacity-70'}`}>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      p.billingType === 'SUBSCRIPTION'
                        ? 'bg-violet-100 text-violet-700'
                        : 'bg-sage-100 text-sage-600'
                    }`}>
                      {p.billingType === 'SUBSCRIPTION'
                        ? (p.billingCycle ? BILLING_CYCLE_LABELS[p.billingCycle] : 'Assinatura')
                        : 'Por sessão'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.billingType === 'PER_SESSION' ? (
                      <span className={`font-semibold ${p.pricePerAttendance === 0 ? 'text-sage-400' : 'text-sage-800'}`}>
                        {p.pricePerAttendance === 0 ? '—' : `R$ ${p.pricePerAttendance.toFixed(2).replace('.', ',')}`}
                      </span>
                    ) : (
                      <div>
                        <span className="font-semibold text-sage-800">
                          {p.price != null ? `R$ ${p.price.toFixed(2).replace('.', ',')}` : '—'}
                        </span>
                        {p.weeklySessionLimit != null && (
                          <span className="ml-1.5 text-xs text-sage-400">· {p.weeklySessionLimit}x/sem</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${p.active ? 'bg-green-100 text-green-800' : 'bg-sage-100 text-sage-500'}`}>
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(p)} className="rounded-lg border border-sage-200 px-3 py-1 text-xs text-sage-600 hover:bg-sage-50">Editar</button>
                      <button onClick={() => handleToggle(p)} className={`rounded-lg border px-3 py-1 text-xs transition ${p.active ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                        {p.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Plano' : 'Novo Plano'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="mb-1 block text-sm font-medium text-sage-700">Nome do plano</label>
            <input required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass} placeholder="Ex: Mensal 3x, TotalPass, Wellhub" />
          </div>

          {/* Tipo de cobrança */}
          <div>
            <label className="mb-2 block text-sm font-medium text-sage-700">Tipo de cobrança</label>
            <div className="flex gap-3">
              {(['PER_SESSION', 'SUBSCRIPTION'] as BillingType[]).map((bt) => (
                <label key={bt} className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border p-3 transition ${form.billingType === bt ? 'border-sage-500 bg-sage-50' : 'border-sage-200 hover:bg-sage-50'}`}>
                  <input type="radio" name="billingType" value={bt}
                    checked={form.billingType === bt}
                    onChange={() => setForm({ ...form, billingType: bt })}
                    className="accent-sage-600" />
                  <div>
                    <p className="text-sm font-medium text-sage-800">
                      {bt === 'PER_SESSION' ? 'Por sessão' : 'Assinatura'}
                    </p>
                    <p className="text-xs text-sage-400">
                      {bt === 'PER_SESSION' ? 'Wellhub, TotalPass, Avulso' : 'Mensal, Semestral, Anual'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* PER_SESSION: valor por presença */}
          {!isSubscription && (
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Valor por presença (R$)</label>
              <input type="number" required min="0" step="0.01"
                value={form.pricePerAttendance}
                onChange={(e) => setForm({ ...form, pricePerAttendance: e.target.value })}
                className={inputClass} placeholder="0.00" />
              <p className="mt-1 text-xs text-sage-400">Valor recebido por cada presença confirmada.</p>
            </div>
          )}

          {/* SUBSCRIPTION: ciclo + limite + valor */}
          {isSubscription && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-sage-700">Ciclo de cobrança</label>
                <select required value={form.billingCycle}
                  onChange={(e) => setForm({ ...form, billingCycle: e.target.value as BillingCycle })}
                  className={inputClass}>
                  <option value="MONTHLY">Mensal</option>
                  <option value="SEMESTER">Semestral</option>
                  <option value="ANNUAL">Anual</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-sage-700">Valor do plano (R$)</label>
                  <input type="number" required min="0.01" step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className={inputClass} placeholder="Ex: 200.00" />
                  <p className="mt-1 text-xs text-sage-400">Valor cobrado por ciclo.</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-sage-700">Limite por semana</label>
                  <input type="number" required min="1" step="1"
                    value={form.weeklySessionLimit}
                    onChange={(e) => setForm({ ...form, weeklySessionLimit: e.target.value })}
                    className={inputClass} placeholder="Ex: 3" />
                  <p className="mt-1 text-xs text-sage-400">Máx. de aulas/semana.</p>
                </div>
              </div>
            </>
          )}

          <ErrorBanner message={formError} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg px-4 py-2 text-sm text-sage-600 hover:bg-sage-50">Cancelar</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-sage-600 px-4 py-2 text-sm font-medium text-white hover:bg-sage-700 disabled:opacity-60">
              {saving && <Spinner />}Salvar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
