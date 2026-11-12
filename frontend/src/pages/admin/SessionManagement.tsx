import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  startOfWeek, endOfWeek, addWeeks, subWeeks,
  eachDayOfInterval, isSameDay, format, parseISO, isToday, isBefore,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { listClassSessions, updateClassSession, createAdHocSession } from '../../api/classSessions'
import { listClassTypes } from '../../api/classTypes'
import { listStudents } from '../../api/students'
import { listSessionBookings, markAttendance, adminBookStudent } from '../../api/bookings'
import { getErrorMessage } from '../../api/client'
import { Spinner } from '../../components/Spinner'
import { ErrorBanner } from '../../components/ErrorBanner'
import { BookingStatusBadge, ClassStatusBadge } from '../../components/Badge'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { formatDateTime, formatDuration } from '../../utils/format'
import { STUDIO_TIMEZONE } from '../../utils/constants'
import type {
  ClassSessionResponse, ClassStatus, ClassTypeResponse,
  SessionBookingResponse, StudentSummary,
} from '../../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function sessionTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: STUDIO_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(parseISO(iso))
}

// ── AttendanceToggle ──────────────────────────────────────────────────────────

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
      <button onClick={() => handleClick(true)} disabled={loading} title="Presente"
        className={`rounded-lg px-2 py-1 text-xs font-medium transition disabled:opacity-50 ${attended === true ? 'bg-green-100 text-green-700 ring-1 ring-green-400' : 'bg-sage-50 text-sage-400 hover:bg-green-50 hover:text-green-600'}`}>✓</button>
      <button onClick={() => handleClick(false)} disabled={loading} title="Falta"
        className={`rounded-lg px-2 py-1 text-xs font-medium transition disabled:opacity-50 ${attended === false ? 'bg-red-100 text-red-700 ring-1 ring-red-400' : 'bg-sage-50 text-sage-400 hover:bg-red-50 hover:text-red-600'}`}>✕</button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function SessionManagementAdmin() {
  const { toast } = useToast()

  // ── Week navigation ──────────────────────────────────────────────────────
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  )
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const [sessions, setSessions] = useState<ClassSessionResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (from: Date, to: Date) => {
    setLoading(true)
    setError(null)
    try {
      setSessions(await listClassSessions(from.toISOString(), to.toISOString()))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const reload = useCallback(() => load(weekStart, weekEnd), [load, weekStart, weekEnd])

  useEffect(() => { reload() }, [weekStart]) // eslint-disable-line react-hooks/exhaustive-deps

  const sessionsByDay = useMemo(() => {
    const map = new Map<number, ClassSessionResponse[]>()
    for (const s of sessions) {
      const idx = days.findIndex((d) => isSameDay(d, parseISO(s.startDateTime)))
      if (idx === -1) continue
      const arr = map.get(idx) ?? []
      arr.push(s)
      map.set(idx, arr)
    }
    return map
  }, [sessions, days])

  // ── Selected session panel ───────────────────────────────────────────────
  const [selectedSession, setSelectedSession] = useState<ClassSessionResponse | null>(null)

  // ── Edit modal ───────────────────────────────────────────────────────────
  const [editSession, setEditSession] = useState<ClassSessionResponse | null>(null)
  const [editCapacity, setEditCapacity] = useState('')
  const [editStatus, setEditStatus] = useState<ClassStatus>('ACTIVE')
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const openEdit = (s: ClassSessionResponse) => {
    setEditSession(s)
    setEditCapacity(String(s.capacity))
    setEditStatus('ACTIVE')
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
      setSelectedSession(null)
      await reload()
      toast(editStatus === 'CANCELLED' ? 'Sessão cancelada e reservas encerradas.' : 'Sessão atualizada.')
    } catch (err) {
      setEditError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  // ── Attendees modal ──────────────────────────────────────────────────────
  const [attendeeSession, setAttendeeSession] = useState<ClassSessionResponse | null>(null)
  const [attendees, setAttendees] = useState<SessionBookingResponse[]>([])
  const [attendeeLoading, setAttendeeLoading] = useState(false)
  const [attendeeError, setAttendeeError] = useState<string | null>(null)

  const openAttendees = async (s: ClassSessionResponse) => {
    setAttendeeSession(s)
    setAttendeeLoading(true)
    setAttendeeError(null)
    try {
      setAttendees(await listSessionBookings(s.id))
    } catch (err) {
      setAttendeeError(getErrorMessage(err))
    } finally {
      setAttendeeLoading(false)
    }
  }

  // ── Admin enroll student ─────────────────────────────────────────────────
  const [enrollSearch, setEnrollSearch] = useState('')
  const [enrollStudents, setEnrollStudents] = useState<StudentSummary[]>([])
  const [enrolling, setEnrolling] = useState(false)
  const [enrollError, setEnrollError] = useState<string | null>(null)

  const loadEnrollStudents = useCallback(async () => {
    try {
      setEnrollStudents(await listStudents())
    } catch (_) {}
  }, [])

  useEffect(() => {
    if (attendeeSession) {
      loadEnrollStudents()
      setEnrollSearch('')
      setEnrollError(null)
    }
  }, [attendeeSession, loadEnrollStudents])

  const filteredEnrollStudents = enrollSearch.trim()
    ? enrollStudents.filter((s) => s.name.toLowerCase().includes(enrollSearch.toLowerCase()))
    : []

  const handleEnroll = async (student: StudentSummary) => {
    if (!attendeeSession) return
    setEnrolling(true)
    setEnrollError(null)
    setEnrollSearch('')
    try {
      await adminBookStudent(attendeeSession.id, student.id)
      setAttendees(await listSessionBookings(attendeeSession.id))
      await reload()
      toast(`${student.name} inscrito com sucesso!`)
    } catch (err) {
      setEnrollError(getErrorMessage(err))
    } finally {
      setEnrolling(false)
    }
  }

  // ── Create ad-hoc modal ──────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false)
  const [classTypes, setClassTypes] = useState<ClassTypeResponse[]>([])
  const [createForm, setCreateForm] = useState({ classTypeId: '', date: '', time: '', durationMin: '60', capacity: '15' })
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const openCreate = async () => {
    setCreateError(null)
    const now = new Date()
    setCreateForm({ classTypeId: classTypes[0] ? String(classTypes[0].id) : '', date: now.toISOString().slice(0, 10), time: '08:00', durationMin: '60', capacity: '15' })
    if (classTypes.length === 0) {
      try {
        const types = await listClassTypes()
        setClassTypes(types)
        setCreateForm((f) => ({ ...f, classTypeId: types[0] ? String(types[0].id) : '' }))
      } catch (_) {}
    }
    setCreateOpen(true)
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)
    try {
      const dtAsDate = new Date(`${createForm.date}T${createForm.time}:00`)
      const offsetMs = -3 * 60 * 60 * 1000
      const utcMs = dtAsDate.getTime() - offsetMs - dtAsDate.getTimezoneOffset() * 60 * 1000
      const isoWithOffset = new Date(utcMs).toISOString().replace('Z', '-03:00')
      await createAdHocSession({ classTypeId: Number(createForm.classTypeId), startDateTime: isoWithOffset, durationMin: Number(createForm.durationMin), capacity: Number(createForm.capacity) })
      setCreateOpen(false)
      await reload()
      toast('Aula avulsa criada com sucesso!')
    } catch (err) {
      setCreateError(getErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  // ── Navigation ───────────────────────────────────────────────────────────
  const prevWeek = () => setWeekStart((w) => subWeeks(w, 1))
  const nextWeek = () => setWeekStart((w) => addWeeks(w, 1))
  const goToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const weekLabel = `${format(weekStart, "d 'de' MMM", { locale: ptBR })} – ${format(weekEnd, "d 'de' MMM yyyy", { locale: ptBR })}`
  const isPastWeek = isBefore(weekEnd, new Date())

  const inputClass = 'w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 outline-none focus:border-sage-500'

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-sage-800">Sessões</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={prevWeek} className="rounded-lg border border-sage-200 px-2.5 py-1.5 text-sm text-sage-600 hover:bg-sage-50">‹</button>
          <button onClick={goToday} className="rounded-lg border border-sage-200 px-2.5 py-1.5 text-sm text-sage-600 hover:bg-sage-50">Hoje</button>
          <button onClick={nextWeek} className="rounded-lg border border-sage-200 px-2.5 py-1.5 text-sm text-sage-600 hover:bg-sage-50">›</button>
          <span className={`text-sm font-medium ${isPastWeek ? 'text-sage-400' : 'text-sage-600'}`}>{weekLabel}</span>
          <button onClick={reload} className="rounded-lg border border-sage-200 px-2.5 py-1.5 text-sm text-sage-600 hover:bg-sage-50">↺</button>
          <button onClick={openCreate} className="rounded-lg bg-sage-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sage-700">+ Nova Aula Avulsa</button>
        </div>
      </div>

      <ErrorBanner message={error} />

      {/* ── MOBILE: list grouped by day ── */}
      <div className="block md:hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner className="text-sage-400" /></div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-sage-200 py-14 text-center text-sm text-sage-400">
            Nenhuma sessão nesta semana. Gere sessões na aba "Gerar".
          </div>
        ) : (
          <div className="space-y-5">
            {days.map((day, idx) => {
              const daySessions = sessionsByDay.get(idx) ?? []
              if (daySessions.length === 0) return null
              return (
                <div key={idx}>
                  <div className="mb-2 flex items-center gap-2">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isToday(day) ? 'bg-sage-600 text-white' : 'bg-sage-100 text-sage-600'}`}>
                      {format(day, 'd')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold capitalize text-sage-700">{format(day, 'EEEE', { locale: ptBR })}</p>
                      <p className="text-xs text-sage-400">{format(day, 'dd/MM', { locale: ptBR })}</p>
                    </div>
                  </div>
                  <div className="space-y-2 pl-11">
                    {daySessions.map((s) => (
                      <button key={s.id} onClick={() => setSelectedSession(s)}
                        className="w-full rounded-xl border border-sage-100 bg-white p-3 text-left shadow-sm hover:border-sage-300 transition">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sage-800">{s.classTypeName}</p>
                          <span className={`text-xs font-medium ${s.availableSpots === 0 ? 'text-orange-500' : 'text-sage-500'}`}>{s.confirmedCount}/{s.capacity}</span>
                        </div>
                        <p className="text-sm text-sage-500">{sessionTime(s.startDateTime)} · {formatDuration(s.durationMin)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── DESKTOP: 7-column calendar ── */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-sage-100 bg-white shadow-sm">
        {/* Day headers */}
        <div className="grid border-b border-sage-100" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
          {days.map((day, idx) => (
            <div key={idx} className={`border-r border-sage-50 px-2 py-3 text-center last:border-r-0 ${isToday(day) ? 'bg-sage-50' : ''}`}>
              <p className="text-xs font-medium uppercase tracking-wide text-sage-400">{format(day, 'EEE', { locale: ptBR })}</p>
              <p className={`mt-0.5 text-lg font-semibold leading-none ${isToday(day) ? 'mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-sage-600 text-white' : 'text-sage-700'}`}>
                {format(day, 'd')}
              </p>
            </div>
          ))}
        </div>
        {/* Session cells */}
        <div className="grid min-h-[200px]" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
          {days.map((_, idx) => {
            const daySessions = sessionsByDay.get(idx) ?? []
            return (
              <div key={idx} className="border-r border-sage-50 p-1.5 last:border-r-0">
                {loading ? (
                  <div className="flex h-16 items-center justify-center"><Spinner className="text-sage-300" /></div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {daySessions.map((s) => (
                      <button key={s.id} onClick={() => setSelectedSession(s)}
                        className={`w-full rounded-lg px-2 py-1.5 text-left text-xs transition focus:outline-none focus:ring-2 focus:ring-sage-400 ${s.availableSpots === 0 ? 'bg-orange-50 hover:bg-orange-100' : 'bg-sage-50 hover:bg-sage-100'}`}>
                        <p className="truncate font-semibold leading-tight text-sage-800">{s.classTypeName}</p>
                        <p className="mt-0.5 text-sage-500">{sessionTime(s.startDateTime)} · {formatDuration(s.durationMin)}</p>
                        <p className={`mt-0.5 font-medium ${s.availableSpots === 0 ? 'text-orange-600' : 'text-sage-600'}`}>
                          {s.confirmedCount}/{s.capacity} vagas
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {!loading && sessions.length === 0 && (
          <div className="border-t border-sage-50 py-12 text-center text-sm text-sage-400">
            Nenhuma sessão nesta semana. Gere sessões na aba "Gerar".
          </div>
        )}
      </div>

      {/* ── Session detail panel (slide-in from right on click) ── */}
      <Modal
        open={selectedSession !== null}
        onClose={() => setSelectedSession(null)}
        title={selectedSession?.classTypeName ?? ''}
      >
        {selectedSession && (
          <div className="space-y-4">
            <div className="rounded-lg bg-sage-50 p-3 text-sm">
              <p className="text-sage-500">{formatDateTime(selectedSession.startDateTime)} · {formatDuration(selectedSession.durationMin)}</p>
              <p className={`mt-1 font-medium ${selectedSession.availableSpots === 0 ? 'text-orange-600' : 'text-sage-700'}`}>
                {selectedSession.confirmedCount}/{selectedSession.capacity} vagas · {selectedSession.availableSpots} disponíveis
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { setSelectedSession(null); openAttendees(selectedSession) }}
                className="rounded-lg border border-sage-200 px-4 py-2 text-sm text-sage-600 hover:bg-sage-50">
                Ver inscritos ({selectedSession.confirmedCount})
              </button>
              <button onClick={() => { setSelectedSession(null); openEdit(selectedSession) }}
                className="rounded-lg border border-sage-200 px-4 py-2 text-sm text-sage-600 hover:bg-sage-50">
                Editar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Edit session modal ── */}
      <Modal open={editSession !== null} onClose={() => setEditSession(null)} title="Editar sessão">
        {editSession && (
          <div className="space-y-4">
            <div className="rounded-lg bg-sage-50 p-3 text-sm">
              <p className="font-medium text-sage-800">{editSession.classTypeName}</p>
              <p className="text-sage-500">{formatDateTime(editSession.startDateTime)}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Capacidade</label>
              <input type="number" min={1} value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Status</label>
              <div className="flex gap-3">
                {(['ACTIVE', 'CANCELLED'] as ClassStatus[]).map((s) => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="status" value={s} checked={editStatus === s} onChange={() => setEditStatus(s)} />
                    <ClassStatusBadge status={s} />
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-amber-600">Cancelar cancela automaticamente todas as reservas ativas.</p>
            </div>
            <ErrorBanner message={editError} />
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setEditSession(null)} className="rounded-lg px-4 py-2 text-sm text-sage-600 hover:bg-sage-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-sage-600 px-4 py-2 text-sm font-medium text-white hover:bg-sage-700 disabled:opacity-60">
                {saving && <Spinner />}Salvar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Attendees modal with enroll ── */}
      <Modal open={attendeeSession !== null} onClose={() => setAttendeeSession(null)} title={`Inscritos — ${attendeeSession?.classTypeName ?? ''}`}>
        {attendeeSession && (
          <div>
            <p className="mb-3 text-sm text-sage-500">{formatDateTime(attendeeSession.startDateTime)} · {formatDuration(attendeeSession.durationMin)}</p>

            {/* Enroll student search */}
            <div className="mb-4 rounded-lg border border-sage-100 bg-sage-50 p-3">
              <p className="mb-2 text-xs font-medium text-sage-600">Inscrever aluno</p>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar aluno por nome..."
                  value={enrollSearch}
                  onChange={(e) => setEnrollSearch(e.target.value)}
                  disabled={enrolling}
                  className="w-full rounded-lg border border-sage-200 bg-white px-3 py-2 text-sm text-sage-800 outline-none focus:border-sage-500 disabled:opacity-60"
                />
                {enrollSearch.trim() && (
                  <div className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-lg border border-sage-200 bg-white shadow-lg">
                    {filteredEnrollStudents.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-sage-400">Nenhum aluno encontrado.</p>
                    ) : (
                      filteredEnrollStudents.map((s) => (
                        <button key={s.id} type="button" onClick={() => handleEnroll(s)} disabled={enrolling}
                          className="block w-full px-3 py-2 text-left text-sm text-sage-700 hover:bg-sage-50 disabled:opacity-50">
                          {s.name}
                          <span className="ml-2 text-xs text-sage-400">{s.email}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <ErrorBanner message={enrollError} />
            </div>

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
                        <td className="px-3 py-2"><BookingStatusBadge status={a.status} /></td>
                        <td className="px-3 py-2 text-center">
                          {a.status === 'CONFIRMED' ? (
                            <AttendanceToggle bookingId={a.bookingId} attended={a.attended}
                              onUpdate={(updated) => setAttendees((prev) => prev.map((x) => x.bookingId === updated.bookingId ? updated : x))} />
                          ) : <span className="text-xs text-sage-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="border-t border-sage-50 px-3 py-2 text-xs text-sage-400">
                  {attendees.filter((a) => a.status === 'CONFIRMED').length} confirmados · {attendees.filter((a) => a.attended === true).length} presentes · {attendees.filter((a) => a.attended === false).length} faltas
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
            <select required value={createForm.classTypeId} onChange={(e) => setCreateForm({ ...createForm, classTypeId: e.target.value })} className={inputClass}>
              {classTypes.map((ct) => <option key={ct.id} value={String(ct.id)}>{ct.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Data</label>
              <input type="date" required value={createForm.date} onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Horário</label>
              <input type="time" required value={createForm.time} onChange={(e) => setCreateForm({ ...createForm, time: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Duração (min)</label>
              <input type="number" min={1} required value={createForm.durationMin} onChange={(e) => setCreateForm({ ...createForm, durationMin: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Capacidade</label>
              <input type="number" min={1} required value={createForm.capacity} onChange={(e) => setCreateForm({ ...createForm, capacity: e.target.value })} className={inputClass} />
            </div>
          </div>
          <p className="text-xs text-sage-400">Aula avulsa não está vinculada a nenhuma aula recorrente.</p>
          <ErrorBanner message={createError} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg px-4 py-2 text-sm text-sage-600 hover:bg-sage-50">Cancelar</button>
            <button type="submit" disabled={creating} className="flex items-center gap-2 rounded-lg bg-sage-600 px-4 py-2 text-sm font-medium text-white hover:bg-sage-700 disabled:opacity-60">
              {creating && <Spinner />}Criar aula
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// end of file
