import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  createRecurringClass,
  deleteRecurringClass,
  listRecurringClasses,
  updateRecurringClass,
  setRecurringClassActive,
} from '../../api/recurringClasses'
import {
  createFixedEnrollment,
  deleteFixedEnrollment,
  listFixedEnrollments,
} from '../../api/fixedEnrollments'
import { listClassTypes } from '../../api/classTypes'
import { listStudents } from '../../api/students'
import { getErrorMessage } from '../../api/client'
import { FullPageSpinner, Spinner } from '../../components/Spinner'
import { ErrorBanner } from '../../components/ErrorBanner'
import { useToast } from '../../components/Toast'
import { Modal } from '../../components/Modal'
import {
  DAY_OF_WEEK_LABELS,
  DAY_OF_WEEK_OPTIONS,
} from '../../utils/constants'
import { fromLocalTimeString, toLocalTimeString } from '../../utils/format'
import type {
  ClassTypeResponse,
  FixedEnrollmentResponse,
  RecurringClassResponse,
  StudentSummary,
  DayOfWeek,
} from '../../types'

interface FormState {
  dayOfWeek: DayOfWeek
  startTime: string // "HH:mm" for input
  durationMin: string
  classTypeId: string
  capacity: string
}

export function RecurringClassesAdmin() {
  const { toast } = useToast()
  const [items, setItems] = useState<RecurringClassResponse[]>([])
  const [classTypes, setClassTypes] = useState<ClassTypeResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringClassResponse | null>(null)
  const [form, setForm] = useState<FormState>({
    dayOfWeek: 'MONDAY',
    startTime: '08:00',
    durationMin: '60',
    classTypeId: '',
    capacity: '15',
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Fixed enrollment modal state
  const [enrollRcId, setEnrollRcId] = useState<number | null>(null)
  const [enrollRcCapacity, setEnrollRcCapacity] = useState<number>(0)
  const [enrollments, setEnrollments] = useState<FixedEnrollmentResponse[]>([])
  const [enrollLoading, setEnrollLoading] = useState(false)
  const [students, setStudents] = useState<StudentSummary[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [enrollError, setEnrollError] = useState<string | null>(null)
  const [enrollSaving, setEnrollSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rcs, types] = await Promise.all([
        listRecurringClasses(),
        listClassTypes(),
      ])
      setItems(rcs)
      setClassTypes(types)
      // Preselect the first class type if creating
      if (types.length > 0 && !form.classTypeId) {
        setForm((prev) => ({ ...prev, classTypeId: String(types[0].id) }))
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [form.classTypeId])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({
      dayOfWeek: 'MONDAY',
      startTime: '08:00',
      durationMin: '60',
      classTypeId: classTypes[0] ? String(classTypes[0].id) : '',
      capacity: '15',
    })
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (rc: RecurringClassResponse) => {
    setEditing(rc)
    setForm({
      dayOfWeek: rc.dayOfWeek,
      startTime: fromLocalTimeString(rc.startTime),
      durationMin: String(rc.durationMin),
      classTypeId: String(
        classTypes.find((ct) => ct.name === rc.classTypeName)?.id ?? '',
      ),
      capacity: String(rc.capacity),
    })
    setFormError(null)
    setModalOpen(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const payload = {
        dayOfWeek: form.dayOfWeek,
        startTime: toLocalTimeString(form.startTime),
        durationMin: Number(form.durationMin),
        classTypeId: Number(form.classTypeId),
        capacity: Number(form.capacity),
      }
      if (editing) {
        await updateRecurringClass(editing.id, payload)
      } else {
        await createRecurringClass(payload)
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeleting(true)
    try {
      await deleteRecurringClass(id)
      setDeleteId(null)
      await load()
      toast('Aula recorrente removida.', 'info')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActive = async (rc: RecurringClassResponse) => {
    try {
      await setRecurringClassActive(rc.id, !rc.active)
      await load()
      toast(rc.active ? 'Aula recorrente desativada.' : 'Aula recorrente ativada.')
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  // ── Fixed enrollment management ──────────────────────────────────────────

  const openEnrollments = async (rc: RecurringClassResponse) => {
    setEnrollRcId(rc.id)
    setEnrollRcCapacity(rc.capacity)
    setStudentSearch('')
    setEnrollError(null)
    setEnrollLoading(true)
    try {
      const [enrs, stds] = await Promise.all([
        listFixedEnrollments(rc.id),
        listStudents(),
      ])
      setEnrollments(enrs)
      setStudents(stds)
    } catch (err) {
      setEnrollError(getErrorMessage(err))
    } finally {
      setEnrollLoading(false)
    }
  }

  const handleSelectStudent = async (student: StudentSummary) => {
    if (!enrollRcId) return
    setStudentSearch('')
    setEnrollSaving(true)
    setEnrollError(null)
    try {
      await createFixedEnrollment(enrollRcId, { studentId: student.id })
      setEnrollments(await listFixedEnrollments(enrollRcId))
    } catch (err) {
      setEnrollError(getErrorMessage(err))
    } finally {
      setEnrollSaving(false)
    }
  }

  const handleRemoveEnrollment = async (id: number) => {
    if (!enrollRcId) return
    try {
      await deleteFixedEnrollment(id)
      setEnrollments(await listFixedEnrollments(enrollRcId))
    } catch (err) {
      setEnrollError(getErrorMessage(err))
    }
  }

  const filteredStudents = studentSearch.trim()
    ? students.filter((s) =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase()),
      )
    : students

  if (loading) return <FullPageSpinner />

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-sage-800">Aulas Recorrentes</h1>
        <button
          onClick={openCreate}
          className="rounded-lg bg-sage-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sage-700"
        >
          + Nova Aula Recorrente
        </button>
      </div>

      <ErrorBanner message={error} />

      {items.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-sage-200 py-16 text-center text-sage-400">
          Nenhuma aula recorrente cadastrada.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-sage-100 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="border-b border-sage-100 bg-sage-50 text-sm text-sage-500">
              <tr>
                <th className="px-4 py-3 font-medium">Dia</th>
                <th className="px-4 py-3 font-medium">Horário</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Duração</th>
                <th className="px-4 py-3 font-medium">Capacidade</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage-50">
              {items.map((rc) => (
                <tr key={rc.id} className={`text-sm ${rc.active ? 'text-sage-700' : 'text-sage-400 opacity-70'}`}>
                  <td className="px-4 py-3 font-medium">
                    {DAY_OF_WEEK_LABELS[rc.dayOfWeek]}
                  </td>
                  <td className="px-4 py-3">{fromLocalTimeString(rc.startTime)}</td>
                  <td className="px-4 py-3">{rc.classTypeName}</td>
                  <td className="px-4 py-3">{rc.durationMin} min</td>
                  <td className="px-4 py-3">{rc.capacity}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      rc.active ? 'bg-green-100 text-green-800' : 'bg-sage-100 text-sage-500'
                    }`}>
                      {rc.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEnrollments(rc)}
                        className="rounded-lg border border-sand-300 px-3 py-1 text-xs text-sand-500 hover:bg-sand-100"
                      >
                        Alunos Fixos
                      </button>
                      <button
                        onClick={() => openEdit(rc)}
                        className="rounded-lg border border-sage-200 px-3 py-1 text-xs text-sage-600 hover:bg-sage-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggleActive(rc)}
                        className={`rounded-lg border px-3 py-1 text-xs transition ${
                          rc.active
                            ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                            : 'border-green-200 text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {rc.active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => setDeleteId(rc.id)}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar aula recorrente' : 'Nova aula recorrente'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">
                Dia da semana
              </label>
              <select
                value={form.dayOfWeek}
                onChange={(e) =>
                  setForm({ ...form, dayOfWeek: e.target.value as DayOfWeek })
                }
                className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 outline-none focus:border-sage-500"
              >
                {DAY_OF_WEEK_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {DAY_OF_WEEK_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">
                Horário
              </label>
              <input
                type="time"
                required
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 outline-none focus:border-sage-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">
                Duração (min)
              </label>
              <input
                type="number"
                min={1}
                required
                value={form.durationMin}
                onChange={(e) =>
                  setForm({ ...form, durationMin: e.target.value })
                }
                className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 outline-none focus:border-sage-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">
                Capacidade
              </label>
              <input
                type="number"
                min={1}
                required
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 outline-none focus:border-sage-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-sage-700">
              Tipo de aula
            </label>
            <select
              required
              value={form.classTypeId}
              onChange={(e) => setForm({ ...form, classTypeId: e.target.value })}
              className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 outline-none focus:border-sage-500"
            >
              {classTypes.map((ct) => (
                <option key={ct.id} value={String(ct.id)}>
                  {ct.name}
                </option>
              ))}
            </select>
          </div>

          <ErrorBanner message={formError} />
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg px-4 py-2 text-sm text-sage-600 hover:bg-sage-50"
            >
              Cancelar
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

      {/* Delete confirmation */}
      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Excluir aula recorrente"
      >
        <p className="mb-6 text-sage-600">
          Esta ação é <strong>permanente</strong> e não pode ser desfeita. A aula recorrente e seus alunos fixos serão removidos. As sessões já geradas não são afetadas.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteId(null)}
            className="rounded-lg px-4 py-2 text-sm text-sage-600 hover:bg-sage-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => deleteId && handleDelete(deleteId)}
            disabled={deleting}
            className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60"
          >
            {deleting && <Spinner />}
            Excluir permanentemente
          </button>
        </div>
      </Modal>

      {/* Fixed enrollments modal */}
      <Modal
        open={enrollRcId !== null}
        onClose={() => setEnrollRcId(null)}
        title="Alunos Fixos"
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-sage-500">
            Alunos fixos recebem reserva autom&#225;tica confirmada nas sess&#245;es geradas.
          </p>
          <span className={`text-sm font-medium ${
            enrollments.length >= enrollRcCapacity ? 'text-red-600' : 'text-sage-600'
          }`}>
            {enrollments.length}/{enrollRcCapacity} vagas
          </span>
        </div>

        <div className="mb-4">
          {enrollments.length >= enrollRcCapacity ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Capacidade m&#225;xima atingida ({enrollments.length}/{enrollRcCapacity}). Remova um aluno para adicionar outro.
            </p>
          ) : (
            <>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar aluno por nome..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 outline-none focus:border-sage-500"
                />
                {studentSearch.trim() && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-sage-200 bg-white shadow-lg">
                    {filteredStudents.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-sage-400">
                        Nenhum aluno encontrado.
                      </p>
                    ) : (
                      filteredStudents.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelectStudent(s)}
                          disabled={enrollSaving}
                          className="block w-full px-3 py-2 text-left text-sm text-sage-700 hover:bg-sage-50 disabled:opacity-50"
                        >
                          {s.name}
                          <span className="ml-2 text-xs text-sage-400">
                            {s.email}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {enrollSaving && (
                <p className="mt-1 text-xs text-sage-400">Adicionando...</p>
              )}
            </>
          )}
        </div>

        <ErrorBanner message={enrollError} />

        {enrollLoading ? (
          <div className="py-8 text-center">
            <Spinner className="text-xl text-sage-500" />
          </div>
        ) : enrollments.length === 0 ? (
          <p className="py-6 text-center text-sm text-sage-400">
            Nenhum aluno fixo cadastrado.
          </p>
        ) : (
          <ul className="divide-y divide-sage-50">
            {enrollments.map((enr) => (
              <li
                key={enr.id}
                className="flex items-center justify-between py-2.5"
              >
                <div>
                  <span className="font-medium text-sage-800">
                    {enr.studentName}
                  </span>
                  <span className="ml-2 text-xs text-sage-400">
                    ID {enr.studentId}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveEnrollment(enr.id)}
                  className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  )
}
