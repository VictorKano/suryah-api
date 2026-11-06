import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  listStudentDetails,
  updateStudent,
  setStudentActive,
  getStudentBookingHistory,
} from '../../api/students'
import { register } from '../../api/auth'
import { getErrorMessage } from '../../api/client'
import { FullPageSpinner, Spinner } from '../../components/Spinner'
import { ErrorBanner } from '../../components/ErrorBanner'
import { Modal } from '../../components/Modal'
import { BookingStatusBadge } from '../../components/Badge'
import { useToast } from '../../components/Toast'
import { PLAN_LABELS, PLAN_OPTIONS } from '../../utils/constants'
import { isValidEmail, isValidPhone, maskPhone } from '../../utils/validation'
import { formatDate, formatDateTime } from '../../utils/format'
import type {
  AdminUpdateStudentRequest,
  PlanType,
  StudentBookingEntry,
  StudentDetail,
} from '../../types'

export function StudentsAdmin() {
  const { toast } = useToast()
  const [students, setStudents] = useState<StudentDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // ── Create modal ──────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '', email: '', phone: '', age: '', password: '', planType: 'PRIVATE' as PlanType,
  })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({})

  // ── Edit modal ────────────────────────────────────────────────────────────
  const [editStudent, setEditStudent] = useState<StudentDetail | null>(null)
  const [editForm, setEditForm] = useState<AdminUpdateStudentRequest>({})
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({})

  // ── History modal ─────────────────────────────────────────────────────────
  const [historyStudent, setHistoryStudent] = useState<StudentDetail | null>(null)
  const [history, setHistory] = useState<StudentBookingEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const load = useCallback(async (q?: string) => {
    setLoading(true)
    setError(null)
    try {
      setStudents(await listStudentDetails(q))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const id = setTimeout(() => load(search || undefined), 300)
    return () => clearTimeout(id)
  }, [search, load])

  // ── Create ────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setCreateForm({ name: '', email: '', phone: '', age: '', password: '', planType: 'PRIVATE' })
    setCreateError(null)
    setCreateFieldErrors({})
    setCreateOpen(true)
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)
    setCreateFieldErrors({})

    const errs: Record<string, string> = {}
    if (createForm.email && !isValidEmail(createForm.email)) errs.email = 'Digite um e-mail válido.'
    if (createForm.phone && !isValidPhone(createForm.phone)) errs.phone = 'Digite um telefone válido com DDD.'
    if (Object.keys(errs).length > 0) { setCreateFieldErrors(errs); setCreating(false); return }

    try {
      await register({
        name: createForm.name, email: createForm.email,
        phone: createForm.phone || undefined, age: createForm.age ? Number(createForm.age) : undefined,
        password: createForm.password, planType: createForm.planType,
      })
      setCreateOpen(false)
      await load(search || undefined)
      toast(`Aluno ${createForm.name} cadastrado!`)
    } catch (err) {
      setCreateError(getErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  const openEdit = (s: StudentDetail) => {
    setEditStudent(s)
    setEditForm({ name: s.name, email: s.email, phone: s.phone ?? '', age: s.age ?? undefined, planType: s.planType })
    setEditError(null)
    setEditFieldErrors({})
  }

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editStudent) return
    setSaving(true)
    setEditError(null)
    setEditFieldErrors({})

    const errs: Record<string, string> = {}
    if (editForm.email && !isValidEmail(editForm.email)) errs.email = 'Digite um e-mail válido.'
    if (editForm.phone && !isValidPhone(editForm.phone)) errs.phone = 'Digite um telefone válido com DDD.'
    if (Object.keys(errs).length > 0) { setEditFieldErrors(errs); setSaving(false); return }

    try {
      await updateStudent(editStudent.id, editForm)
      setEditStudent(null)
      await load(search || undefined)
      toast('Dados do aluno atualizados.')
    } catch (err) {
      setEditError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────

  const handleToggleActive = async (s: StudentDetail) => {
    try {
      await setStudentActive(s.id, !s.active)
      await load(search || undefined)
      toast(s.active ? `${s.name} desativado.` : `${s.name} reativado.`)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  // ── History ───────────────────────────────────────────────────────────────

  const openHistory = async (s: StudentDetail) => {
    setHistoryStudent(s)
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      setHistory(await getStudentBookingHistory(s.id))
    } catch (err) {
      setHistoryError(getErrorMessage(err))
    } finally {
      setHistoryLoading(false)
    }
  }

  const active = students.filter((s) => s.active)
  const inactive = students.filter((s) => !s.active)
  const inputClass = 'w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-200'

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sage-800">Alunos</h1>
          {!loading && (
            <p className="mt-0.5 text-sm text-sage-400">
              {active.length} ativo{active.length !== 1 ? 's' : ''}
              {inactive.length > 0 && ` · ${inactive.length} inativo${inactive.length !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="search"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-100 sm:w-56"
          />
          <button onClick={openCreate} className="rounded-lg bg-sage-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sage-700">
            + Novo Aluno
          </button>
        </div>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <FullPageSpinner />
      ) : students.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sage-200 py-16 text-center text-sage-400">
          {search ? 'Nenhum aluno encontrado.' : 'Nenhum aluno cadastrado.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-sage-100 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="border-b border-sage-100 bg-sage-50 text-sm text-sage-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Telefone</th>
                <th className="px-4 py-3 font-medium">Idade</th>
                <th className="px-4 py-3 font-medium">Plano</th>
                <th className="px-4 py-3 font-medium">Cadastro</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage-50">
              {students.map((s) => (
                <tr key={s.id} className={`text-sm ${s.active ? 'text-sage-700' : 'text-sage-400 opacity-70'}`}>
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3">{s.email}</td>
                  <td className="px-4 py-3">{s.phone || '—'}</td>
                  <td className="px-4 py-3">{s.age ?? '—'}</td>
                  <td className="px-4 py-3">{PLAN_LABELS[s.planType]}</td>
                  <td className="px-4 py-3">{formatDate(s.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.active ? 'bg-green-100 text-green-800' : 'bg-sage-100 text-sage-500'}`}>
                      {s.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openHistory(s)} className="rounded-lg border border-sage-200 px-3 py-1 text-xs text-sage-500 hover:bg-sage-50">
                        Histórico
                      </button>
                      <button onClick={() => openEdit(s)} className="rounded-lg border border-sage-200 px-3 py-1 text-xs text-sage-600 hover:bg-sage-50">
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggleActive(s)}
                        className={`rounded-lg border px-3 py-1 text-xs transition ${s.active ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                      >
                        {s.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create modal ── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Cadastrar Novo Aluno">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-sage-700">Nome</label>
            <input required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-sage-700">E-mail</label>
            <input type="email" required value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} className={`${inputClass} ${createFieldErrors.email ? 'border-red-300' : ''}`} />
            {createFieldErrors.email && <p className="mt-1 text-xs text-red-500">{createFieldErrors.email}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-sage-700">Senha inicial</label>
            <input type="password" required minLength={6} placeholder="Mínimo 6 caracteres" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Telefone</label>
              <input type="tel" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: maskPhone(e.target.value) })} placeholder="(11) 91234-5678" className={`${inputClass} ${createFieldErrors.phone ? 'border-red-300' : ''}`} />
              {createFieldErrors.phone && <p className="mt-1 text-xs text-red-500">{createFieldErrors.phone}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Idade</label>
              <input type="number" min={1} max={119} value={createForm.age} onChange={(e) => setCreateForm({ ...createForm, age: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-sage-700">Plano</label>
            <select value={createForm.planType} onChange={(e) => setCreateForm({ ...createForm, planType: e.target.value as PlanType })} className={inputClass}>
              {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
            </select>
          </div>
          <ErrorBanner message={createError} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg px-4 py-2 text-sm text-sage-600 hover:bg-sage-50">Cancelar</button>
            <button type="submit" disabled={creating} className="flex items-center gap-2 rounded-lg bg-sage-600 px-4 py-2 text-sm font-medium text-white hover:bg-sage-700 disabled:opacity-60">
              {creating && <Spinner />}Cadastrar
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit modal ── */}
      <Modal open={editStudent !== null} onClose={() => setEditStudent(null)} title={`Editar — ${editStudent?.name ?? ''}`}>
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-sage-700">Nome</label>
            <input value={editForm.name ?? ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-sage-700">E-mail</label>
            <input type="email" value={editForm.email ?? ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className={`${inputClass} ${editFieldErrors.email ? 'border-red-300' : ''}`} />
            {editFieldErrors.email && <p className="mt-1 text-xs text-red-500">{editFieldErrors.email}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Telefone</label>
              <input type="tel" value={editForm.phone ?? ''} onChange={(e) => setEditForm({ ...editForm, phone: maskPhone(e.target.value) })} placeholder="(11) 91234-5678" className={`${inputClass} ${editFieldErrors.phone ? 'border-red-300' : ''}`} />
              {editFieldErrors.phone && <p className="mt-1 text-xs text-red-500">{editFieldErrors.phone}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Idade</label>
              <input type="number" min={1} max={119} value={editForm.age ?? ''} onChange={(e) => setEditForm({ ...editForm, age: e.target.value ? Number(e.target.value) : undefined })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-sage-700">Plano</label>
            <select value={editForm.planType ?? 'PRIVATE'} onChange={(e) => setEditForm({ ...editForm, planType: e.target.value as PlanType })} className={inputClass}>
              {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
            </select>
          </div>
          <ErrorBanner message={editError} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditStudent(null)} className="rounded-lg px-4 py-2 text-sm text-sage-600 hover:bg-sage-50">Cancelar</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-sage-600 px-4 py-2 text-sm font-medium text-white hover:bg-sage-700 disabled:opacity-60">
              {saving && <Spinner />}Salvar
            </button>
          </div>
        </form>
      </Modal>

      {/* ── History modal ── */}
      <Modal open={historyStudent !== null} onClose={() => setHistoryStudent(null)} title={`Histórico — ${historyStudent?.name ?? ''}`}>
        {historyLoading ? (
          <div className="flex justify-center py-8"><Spinner className="text-sage-400" /></div>
        ) : (
          <>
            <ErrorBanner message={historyError} />
            {history.length === 0 ? (
              <p className="py-6 text-center text-sm text-sage-400">Nenhuma reserva encontrada.</p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 border-b border-sage-100 bg-white text-xs text-sage-500">
                    <tr>
                      <th className="px-2 py-2 font-medium">Aula</th>
                      <th className="px-2 py-2 font-medium">Data</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                      <th className="px-2 py-2 font-medium text-center">Presença</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sage-50">
                    {history.map((b) => (
                      <tr key={b.bookingId} className="text-sage-700">
                        <td className="px-2 py-2 font-medium">{b.classTypeName}</td>
                        <td className="px-2 py-2 text-sage-500">{formatDateTime(b.startDateTime)}</td>
                        <td className="px-2 py-2"><BookingStatusBadge status={b.status} /></td>
                        <td className="px-2 py-2 text-center text-xs">
                          {b.attended === true ? <span className="text-green-600 font-medium">✓</span>
                           : b.attended === false ? <span className="text-red-400">✕</span>
                           : <span className="text-sage-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button onClick={() => setHistoryStudent(null)} className="rounded-lg px-4 py-2 text-sm text-sage-600 hover:bg-sage-50">Fechar</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
