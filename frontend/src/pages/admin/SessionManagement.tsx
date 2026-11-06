import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { listClassSessions, updateClassSession, createAdHocSession } from '../../api/classSessions'
import { listClassTypes } from '../../api/classTypes'
import { listSessionBookings, markAttendance } from '../../api/bookings'
import { getErrorMessage } from '../../api/client'
import { FullPageSpinner, Spinner } from '../../components/Spinner'
import { ErrorBanner } from '../../components/ErrorBanner'
import { BookingStatusBadge, ClassStatusBadge } from '../../components/Badge'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { formatDateTime, formatDuration } from '../../utils/format'
import type { ClassSessionResponse, ClassStatus, ClassTypeResponse, SessionBookingResponse } from '../../types'

// ── Attendance toggle component ───────────────────────────────────────────────

interface AttendanceToggleProps {
  bookingId: number
  attended: boolean | null
  onUpdate: (updated: SessionBookingResponse) => void
}

function AttendanceToggle({ bookingId, attended, onUpdate }: AttendanceToggleProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleClick = async (value: boolean) => {
    const next = attended === value ? null : value
    setLoading(true)
    try {
      const updated = await markAttendance(bookingId, next)
      onUpdate(updated)
    } catch (err) {
      toast(getErrorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={() => handleClick(true)}
        disabled={loading}
        title="Presente"
        aria-label="Marcar presente"
        className={`rounded-lg px-2 py-1 text-xs font-medium transition disabled:opacity-50 ${
          attended === true
            ? 'bg-green-100 text-green-700 ring-1 ring-green-400'
            : 'bg-sage-50 text-sage-400 hover:bg-green-50 hover:text-green-600'
        }`}
      >
        ✓
      </button>
      <button
        onClick={() => handleClick(false)}
        disabled={loading}
        title="Falta"
        aria-label="Marcar falta"
        className={`rounded-lg px-2 py-1 text-xs font-medium transition disabled:opacity-50 ${
          attended === false
            ? 'bg-red-100 text-red-700 ring-1 ring-red-400'
            : 'bg-sage-50 text-sage-400 hover:bg-red-50 hover:text-red-600'
        }`}
      >
        ✕
      </button>
    </div>
  )
}

export function SessionManagementAdmin() {
  const { toast } = useToast()
  const [sessions, setSessions] = useState<ClassSessionResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | ClassStatus>('ALL')

  const [editSession, setEditSession] = useState<ClassSessionResponse | null>(null)
  const [editCapacity, setEditCapacity] = useState('')
  const [editStatus, setEditStatus] = useState<ClassStatus>('ACTIVE')
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Attendee list modal
  const [attendeeSession, setAttendeeSession] = useState<ClassSessionResponse | null>(null)
  const [attendees, setAttendees] = useState<SessionBookingResponse[]>([])
  const [attendeeLoading, setAttendeeLoading] = useState(false)
  const [attendeeError, setAttendeeError] = useState<string | null>(null)

  // Create ad-hoc session modal
  const [createOpen, setCreateOpen] = useState(false)
  const [classTypes, setClassTypes] = useState<ClassTypeResponse[]>([])
  const [createForm, setCreateForm] = useState({
    classTypeId: '',
    date: '',
    time: '',
    durationMin: '60',
    capacity: '15',
  })
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch a wide range (next 90 days) so admins can manage upcoming sessions
      const now = new Date()
      const from = now.toISOString()
      const to = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
      setSessions(await listClassSessions(from, to))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openEdit = (session: ClassSessionResponse) => {
    setEditSession(session)
    setEditCapacity(String(session.capacity))
    setEditStatus(
      sessions.find((s) => s.id === session.id)?.startDateTime
        ? 'ACTIVE'
        : 'ACTIVE',
    )
    setEditError(null)
  }

  const handleSave = async () => {
    if (!editSession) return
    setSaving(true)
    setEditError(null)
    try {
      await updateClassSession(editSession.id, {
        capacity: editCapacity ? Number(editCapacity) : null,
        status: editStatus,
      })
      setEditSession(null)
      await load()
      toast(editStatus === 'CANCELLED' ? 'Sessão cancelada e reservas encerradas.' : 'Sessão atualizada.')
    } catch (err) {
      setEditError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const openAttendees = async (session: ClassSessionResponse) => {
    setAttendeeSession(session)
    setAttendeeLoading(true)
    setAttendeeError(null)
    try {
      setAttendees(await listSessionBookings(session.id))
    } catch (err) {
      setAttendeeError(getErrorMessage(err))
    } finally {
      setAttendeeLoading(false)
    }
  }

  const openCreate = async () => {
    setCreateError(null)
    // Pre-populate date with today and default time
    const now = new Date()
    setCreateForm({
      classTypeId: classTypes[0] ? String(classTypes[0].id) : '',
      date: now.toISOString().slice(0, 10),
      time: '08:00',
      durationMin: '60',
      capacity: '15',
    })
    // Load class types if not yet loaded
    if (classTypes.length === 0) {
      try {
        const types = await listClassTypes()
        setClassTypes(types)
        setCreateForm((f) => ({ ...f, classTypeId: types[0] ? String(types[0].id) : '' }))
      } catch (_) { /* ignore */ }
    }
    setCreateOpen(true)
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)
    try {
      // Combine date + time into an ISO offset datetime using the studio timezone offset
      // We send a local datetime string; the browser appends the local offset automatically
      const localDt = `${createForm.date}T${createForm.time}:00`
      // Get the offset for America/Sao_Paulo at that moment
      const dtAsDate = new Date(localDt)
      const offsetMs = -3 * 60 * 60 * 1000 // BRT = UTC-3
      const utcMs = dtAsDate.getTime() - offsetMs - dtAsDate.getTimezoneOffset() * 60 * 1000
      const utcDate = new Date(utcMs)
      const isoWithOffset = utcDate.toISOString().replace('Z', '-03:00')

      await createAdHocSession({
        classTypeId: Number(createForm.classTypeId),
        startDateTime: isoWithOffset,
        durationMin: Number(createForm.durationMin),
        capacity: Number(createForm.capacity),
      })
      setCreateOpen(false)
      await load()
      toast('Aula avulsa criada com sucesso!')
    } catch (err) {
      setCreateError(getErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  // The backend only returns ACTIVE sessions, so both filters show the same set.
  const filtered = filter === 'ALL' ? sessions : sessions

  if (loading) return <FullPageSpinner />

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-sage-800">Sessões</h1>
        <div className="flex gap-2">
          <button
            onClick={openCreate}
            className="rounded-lg bg-sage-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sage-700"
          >
            + Nova Aula Avulsa
          </button>
          {(['ALL', 'ACTIVE'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                filter === f
                  ? 'bg-sage-600 text-white'
                  : 'border border-sage-200 text-sage-600 hover:bg-sage-50'
              }`}
            >
              {f === 'ALL' ? 'Todas' : 'Ativas'}
            </button>
          ))}
          <button
            onClick={load}
            className="rounded-lg border border-sage-200 px-3 py-1.5 text-sm text-sage-600 transition hover:bg-sage-50"
          >
            Atualizar
          </button>
        </div>
      </div>

      <ErrorBanner message={error} />

      {filtered.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-sage-200 py-16 text-center text-sage-400">
          Nenhuma sessão encontrada. Gere sessões na aba "Gerar".
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-sage-100 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="border-b border-sage-100 bg-sage-50 text-sm text-sage-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Início</th>
                <th className="px-4 py-3 font-medium">Duração</th>
                <th className="px-4 py-3 font-medium">Capacidade</th>
                <th className="px-4 py-3 font-medium">Confirmadas</th>
                <th className="px-4 py-3 font-medium">Disponíveis</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage-50">
              {filtered.map((session) => (
                <tr key={session.id} className="text-sm text-sage-700">
                  <td className="px-4 py-3 font-medium">
                    {session.classTypeName}
                  </td>
                  <td className="px-4 py-3">
                    {formatDateTime(session.startDateTime)}
                  </td>
                  <td className="px-4 py-3">
                    {formatDuration(session.durationMin)}
                  </td>
                  <td className="px-4 py-3">{session.capacity}</td>
                  <td className="px-4 py-3">{session.confirmedCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        session.availableSpots === 0
                          ? 'text-terracotta-500 font-medium'
                          : 'text-sage-600'
                      }
                    >
                      {session.availableSpots}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openAttendees(session)}
                        className="rounded-lg border border-sage-200 px-3 py-1 text-xs text-sage-500 hover:bg-sage-50"
                      >
                        Inscritos ({session.confirmedCount})
                      </button>
                      <button
                        onClick={() => openEdit(session)}
                        className="rounded-lg border border-sage-200 px-3 py-1 text-xs text-sage-600 hover:bg-sage-50"
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit session modal */}
      <Modal
        open={editSession !== null}
        onClose={() => setEditSession(null)}
        title="Editar sessão"
      >
        {editSession && (
          <div className="space-y-4">
            <div className="rounded-lg bg-sage-50 p-3 text-sm">
              <p className="font-medium text-sage-800">
                {editSession.classTypeName}
              </p>
              <p className="text-sage-500">
                {formatDateTime(editSession.startDateTime)}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">
                Capacidade
              </label>
              <input
                type="number"
                min={1}
                value={editCapacity}
                onChange={(e) => setEditCapacity(e.target.value)}
                className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 outline-none focus:border-sage-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">
                Status
              </label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="status"
                    value="ACTIVE"
                    checked={editStatus === 'ACTIVE'}
                    onChange={() => setEditStatus('ACTIVE')}
                  />
                  <ClassStatusBadge status="ACTIVE" />
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="status"
                    value="CANCELLED"
                    checked={editStatus === 'CANCELLED'}
                    onChange={() => setEditStatus('CANCELLED')}
                  />
                  <ClassStatusBadge status="CANCELLED" />
                </label>
              </div>
              <p className="mt-1 text-xs text-amber-600">
                Cancelar uma sessão cancela automaticamente todas as reservas
                ativas (confirmadas e lista de espera) dessa aula.
              </p>
            </div>

            <ErrorBanner message={editError} />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditSession(null)}
                className="rounded-lg px-4 py-2 text-sm text-sage-600 hover:bg-sage-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-sage-600 px-4 py-2 text-sm font-medium text-white hover:bg-sage-700 disabled:opacity-60"
              >
                {saving && <Spinner />}
                Salvar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Attendees modal ── */}
      <Modal
        open={attendeeSession !== null}
        onClose={() => setAttendeeSession(null)}
        title={`Inscritos — ${attendeeSession?.classTypeName ?? ''}`}
      >
        {attendeeSession && (
          <div>
            <p className="mb-4 text-sm text-sage-500">
              {formatDateTime(attendeeSession.startDateTime)} · {formatDuration(attendeeSession.durationMin)}
            </p>
            <ErrorBanner message={attendeeError} />
            {attendeeLoading ? (
              <div className="flex justify-center py-8"><Spinner className="text-sage-500" /></div>
            ) : attendees.length === 0 ? (
              <p className="py-6 text-center text-sm text-sage-400">Nenhum aluno inscrito.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-sage-100">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-sage-100 bg-sage-50 text-xs text-sage-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Nome</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium text-center">Presença</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sage-50">
                    {attendees.map((a) => (
                      <tr key={a.bookingId} className="text-sage-700">
                        <td className="px-3 py-2">
                          <p className="font-medium">{a.studentName}</p>
                          <p className="text-xs text-sage-400">{a.studentEmail}</p>
                        </td>
                        <td className="px-3 py-2">
                          <BookingStatusBadge status={a.status} />
                        </td>
                        <td className="px-3 py-2 text-center">
                          {a.status === 'CONFIRMED' ? (
                            <AttendanceToggle
                              bookingId={a.bookingId}
                              attended={a.attended}
                              onUpdate={(updated) =>
                                setAttendees((prev) =>
                                  prev.map((x) =>
                                    x.bookingId === updated.bookingId ? updated : x,
                                  ),
                                )
                              }
                            />
                          ) : (
                            <span className="text-xs text-sage-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="border-t border-sage-50 px-3 py-2 text-xs text-sage-400">
                  {attendees.filter((a) => a.status === 'CONFIRMED').length} confirmados
                  {' · '}
                  {attendees.filter((a) => a.attended === true).length} presentes
                  {' · '}
                  {attendees.filter((a) => a.attended === false).length} faltas
                </p>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button onClick={() => setAttendeeSession(null)} className="rounded-lg px-4 py-2 text-sm text-sage-600 hover:bg-sage-50">Fechar</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Create ad-hoc session modal ── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nova Aula Avulsa">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-sage-700">Tipo de aula</label>
            <select
              required
              value={createForm.classTypeId}
              onChange={(e) => setCreateForm({ ...createForm, classTypeId: e.target.value })}
              className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 outline-none focus:border-sage-500"
            >
              {classTypes.map((ct) => (
                <option key={ct.id} value={String(ct.id)}>{ct.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Data</label>
              <input
                type="date"
                required
                value={createForm.date}
                onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 outline-none focus:border-sage-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Horário</label>
              <input
                type="time"
                required
                value={createForm.time}
                onChange={(e) => setCreateForm({ ...createForm, time: e.target.value })}
                className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 outline-none focus:border-sage-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Duração (min)</label>
              <input
                type="number"
                min={1}
                required
                value={createForm.durationMin}
                onChange={(e) => setCreateForm({ ...createForm, durationMin: e.target.value })}
                className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 outline-none focus:border-sage-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Capacidade</label>
              <input
                type="number"
                min={1}
                required
                value={createForm.capacity}
                onChange={(e) => setCreateForm({ ...createForm, capacity: e.target.value })}
                className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 outline-none focus:border-sage-500"
              />
            </div>
          </div>
          <p className="text-xs text-sage-400">
            Aula avulsa não está vinculada a nenhuma aula recorrente. Alunos podem reservar normalmente após a criação.
          </p>
          <ErrorBanner message={createError} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg px-4 py-2 text-sm text-sage-600 hover:bg-sage-50">Cancelar</button>
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 rounded-lg bg-sage-600 px-4 py-2 text-sm font-medium text-white hover:bg-sage-700 disabled:opacity-60"
            >
              {creating && <Spinner />}
              Criar aula
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// end of file
