import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameDay,
  format,
  parseISO,
  isToday,
  isBefore,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { listClassSessions } from '../api/classSessions'
import { bookSession, cancelBooking, listMyBookings } from '../api/bookings'
import { getErrorMessage } from '../api/client'
import { Spinner } from '../components/Spinner'
import { ErrorBanner } from '../components/ErrorBanner'
import { BookingStatusBadge } from '../components/Badge'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import { formatDuration } from '../utils/format'
import { STUDIO_TIMEZONE } from '../utils/constants'
import type { BookingResponse, ClassSessionResponse } from '../types'

function sessionTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: STUDIO_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(parseISO(iso))
}

function sessionDate(iso: string): Date {
  return parseISO(iso)
}

// ── Shared session card — used in both grid and list views ─────────────────────
interface SessionCardProps {
  session: ClassSessionResponse
  onClick: () => void
  compact?: boolean // true = grid cell, false = list item
}

function SessionCard({ session, onClick, compact = true }: SessionCardProps) {
  const full = session.availableSpots === 0
  const booked = session.myBookingStatus === 'CONFIRMED' || session.myBookingStatus === 'WAITLIST'
  const onWaitlist = session.myBookingStatus === 'WAITLIST'

  const bg = booked
    ? onWaitlist ? 'bg-amber-100 ring-1 ring-amber-300' : 'bg-sage-100 ring-1 ring-sage-300'
    : full ? 'bg-orange-50 hover:bg-orange-100' : 'bg-sage-50 hover:bg-sage-100'

  const statusText = booked
    ? onWaitlist ? 'Lista de espera' : 'Inscrito ✓'
    : full ? 'Fila' : `${session.availableSpots} vaga${session.availableSpots !== 1 ? 's' : ''}`

  const statusColor = booked ? 'text-sage-600' : full ? 'text-orange-600' : 'text-sage-600'

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`w-full rounded-lg px-2 py-1.5 text-left text-xs transition focus:outline-none focus:ring-2 focus:ring-sage-400 ${bg}`}
      >
        <p className="truncate font-semibold leading-tight text-sage-800">{session.classTypeName}</p>
        <p className="mt-0.5 text-sage-500">{sessionTime(session.startDateTime)} · {formatDuration(session.durationMin)}</p>
        <p className={`mt-0.5 font-medium ${statusColor}`}>{statusText}</p>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-sage-400 ${bg}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sage-800">{session.classTypeName}</p>
          <p className="text-sm text-sage-500">
            {sessionTime(session.startDateTime)} · {formatDuration(session.durationMin)}
          </p>
        </div>
        <span className={`shrink-0 text-sm font-medium ${statusColor}`}>{statusText}</span>
      </div>
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function Schedule() {
  const { toast } = useToast()

  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  )
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const [sessions, setSessions] = useState<ClassSessionResponse[]>([])
  const [myBookings, setMyBookings] = useState<BookingResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedSession, setSelectedSession] = useState<ClassSessionResponse | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actioning, setActioning] = useState(false)
  const [confirmCancelBookingId, setConfirmCancelBookingId] = useState<number | null>(null)

  const load = useCallback(async (from: Date, to: Date) => {
    setLoading(true)
    setError(null)
    try {
      const [data, bookings] = await Promise.all([
        listClassSessions(from.toISOString(), to.toISOString()),
        listMyBookings(),
      ])
      setSessions(data)
      setMyBookings(bookings)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const getEffectiveFrom = useCallback((ws: Date, we: Date): Date => {
    const now = new Date()
    return ws <= now && now <= we ? now : ws
  }, [])

  useEffect(() => {
    load(getEffectiveFrom(weekStart, weekEnd), weekEnd)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart])

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        load(getEffectiveFrom(weekStart, weekEnd), weekEnd)
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart])

  const sessionsByDay = useMemo(() => {
    const map = new Map<number, ClassSessionResponse[]>()
    for (const session of sessions) {
      const date = sessionDate(session.startDateTime)
      const dayIdx = days.findIndex((d) => isSameDay(d, date))
      if (dayIdx === -1) continue
      const existing = map.get(dayIdx) ?? []
      existing.push(session)
      map.set(dayIdx, existing)
    }
    return map
  }, [sessions, days])

  const weekBookingCount = useMemo(
    () => sessions.filter((s) => s.myBookingStatus === 'CONFIRMED' || s.myBookingStatus === 'WAITLIST').length,
    [sessions],
  )

  const bookingForSession = useCallback(
    (sessionId: number): BookingResponse | undefined =>
      myBookings.find((b) => b.classSessionId === sessionId && b.status !== 'CANCELLED'),
    [myBookings],
  )

  const reload = useCallback(() => {
    load(getEffectiveFrom(weekStart, weekEnd), weekEnd)
  }, [load, getEffectiveFrom, weekStart, weekEnd])

  const openSession = (session: ClassSessionResponse) => {
    setSelectedSession(session)
    setActionError(null)
  }

  const handleBook = async (session: ClassSessionResponse) => {
    setActioning(true)
    setActionError(null)
    try {
      await bookSession(session.id)
      setSelectedSession(null)
      reload()
      toast(
        session.availableSpots === 0
          ? `Você entrou na lista de espera — ${session.classTypeName}`
          : `Reserva confirmada — ${session.classTypeName} ✓`,
      )
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setActioning(false)
    }
  }

  const handleCancel = async (bookingId: number, className: string) => {
    setActioning(true)
    setActionError(null)
    try {
      await cancelBooking(bookingId)
      setSelectedSession(null)
      setConfirmCancelBookingId(null)
      reload()
      toast(`Reserva cancelada — ${className}`, 'info')
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setActioning(false)
    }
  }

  const prevWeek = () => setWeekStart((w) => subWeeks(w, 1))
  const nextWeek = () => setWeekStart((w) => addWeeks(w, 1))
  const goToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))

  const weekLabel = `${format(weekStart, "d 'de' MMM", { locale: ptBR })} – ${format(weekEnd, "d 'de' MMM yyyy", { locale: ptBR })}`
  const isPastWeek = isBefore(weekEnd, new Date())

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-sage-800">Próximas Aulas</h1>
          {!loading && weekBookingCount > 0 && (
            <span className="rounded-full bg-sage-600 px-2.5 py-0.5 text-xs font-semibold text-white">
              {weekBookingCount} inscrit{weekBookingCount !== 1 ? 'os' : 'o'} esta semana
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button onClick={prevWeek} className="rounded-lg border border-sage-200 px-2.5 py-1.5 text-sm text-sage-600 transition hover:bg-sage-50" aria-label="Semana anterior">‹</button>
          <button onClick={goToday} className="rounded-lg border border-sage-200 px-2.5 py-1.5 text-sm text-sage-600 transition hover:bg-sage-50">Hoje</button>
          <button onClick={nextWeek} className="rounded-lg border border-sage-200 px-2.5 py-1.5 text-sm text-sage-600 transition hover:bg-sage-50" aria-label="Próxima semana">›</button>
          <span className={`hidden text-sm font-medium sm:inline ${isPastWeek ? 'text-sage-400' : 'text-sage-600'}`}>{weekLabel}</span>
          <button onClick={reload} className="rounded-lg border border-sage-200 px-2.5 py-1.5 text-sm text-sage-600 transition hover:bg-sage-50" aria-label="Atualizar">↺</button>
        </div>
        {/* Week label on its own line on very small screens */}
        <p className={`w-full text-sm sm:hidden ${isPastWeek ? 'text-sage-400' : 'text-sage-600'}`}>{weekLabel}</p>
      </div>

      <ErrorBanner message={error} />

      {/* ── MOBILE: list view grouped by day (hidden on md+) ── */}
      <div className="block md:hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner className="text-sage-400" /></div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-sage-200 py-14 text-center text-sm text-sage-400">
            Nenhuma aula disponível nesta semana.
          </div>
        ) : (
          <div className="space-y-4">
            {days.map((day, idx) => {
              const daySessions = sessionsByDay.get(idx) ?? []
              if (daySessions.length === 0) return null
              return (
                <div key={idx}>
                  {/* Day header */}
                  <div className={`mb-2 flex items-center gap-2`}>
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      isToday(day) ? 'bg-sage-600 text-white' : 'bg-sage-100 text-sage-600'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold capitalize text-sage-700">
                        {format(day, "EEEE", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-sage-400">{format(day, 'dd/MM', { locale: ptBR })}</p>
                    </div>
                  </div>
                  <div className="space-y-2 pl-11">
                    {daySessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        onClick={() => openSession(session)}
                        compact={false}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── DESKTOP: 7-column grid calendar (hidden below md) ── */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-xl border border-sage-100 bg-white shadow-sm">
          {/* Day headers */}
          <div className="grid border-b border-sage-100" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
            {days.map((day, idx) => (
              <div key={idx} className={`border-r border-sage-50 px-2 py-3 text-center last:border-r-0 ${isToday(day) ? 'bg-sage-50' : ''}`}>
                <p className="text-xs font-medium uppercase tracking-wide text-sage-400">
                  {format(day, 'EEE', { locale: ptBR })}
                </p>
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
                    <div className="flex h-16 items-center justify-center">
                      <Spinner className="text-sage-300" />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {daySessions.map((session) => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          onClick={() => openSession(session)}
                          compact={true}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {!loading && sessions.length === 0 && (
            <div className="border-t border-sage-50 py-12 text-center text-sm text-sage-400">
              Nenhuma aula disponível nesta semana.
            </div>
          )}
        </div>
      </div>

      {/* ── Session detail / booking modal ── */}
      <Modal
        open={selectedSession !== null}
        onClose={() => { setSelectedSession(null); setActionError(null) }}
        title={selectedSession?.classTypeName ?? ''}
      >
        {selectedSession && (() => {
          const booking = bookingForSession(selectedSession.id)
          const booked = !!booking
          const full = selectedSession.availableSpots === 0
          return (
            <>
              <div className="mb-5 space-y-1 rounded-lg bg-sage-50 p-4 text-sm">
                <p className="text-sage-600"><span className="font-medium text-sage-700">Horário: </span>{sessionTime(selectedSession.startDateTime)}</p>
                <p className="text-sage-600"><span className="font-medium text-sage-700">Duração: </span>{formatDuration(selectedSession.durationMin)}</p>
                <p className="text-sage-600">
                  <span className="font-medium text-sage-700">Vagas: </span>
                  {selectedSession.confirmedCount}/{selectedSession.capacity}
                  {selectedSession.availableSpots > 0 && (
                    <span className="ml-1 text-sage-500">
                      ({selectedSession.availableSpots} disponív{selectedSession.availableSpots !== 1 ? 'eis' : 'el'})
                    </span>
                  )}
                </p>
                {selectedSession.myBookingStatus && (
                  <div className="pt-1">
                    <BookingStatusBadge status={selectedSession.myBookingStatus as 'CONFIRMED' | 'WAITLIST'} />
                  </div>
                )}
              </div>

              <ErrorBanner message={actionError} />

              {booked ? (
                <div>
                  <p className="mb-4 text-sm text-sage-500">
                    {booking.status === 'WAITLIST'
                      ? 'Você está na lista de espera desta aula.'
                      : 'Você está inscrito nesta aula.'}
                  </p>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => { setSelectedSession(null); setActionError(null) }} className="rounded-lg px-4 py-2 text-sm text-sage-600 hover:bg-sage-50">Fechar</button>
                    <button
                      onClick={() => { setSelectedSession(null); setConfirmCancelBookingId(booking.id) }}
                      disabled={new Date(selectedSession.startDateTime).getTime() - Date.now() < 12 * 60 * 60 * 1000}
                      title={
                        new Date(selectedSession.startDateTime).getTime() - Date.now() < 12 * 60 * 60 * 1000
                          ? 'Cancelamento não permitido com menos de 12h de antecedência'
                          : 'Cancelar inscrição'
                      }
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Cancelar inscrição
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {full && <p className="mb-4 text-sm text-amber-600">A aula está lotada — você entrará na lista de espera.</p>}
                  <div className="flex justify-end gap-3">
                    <button onClick={() => { setSelectedSession(null); setActionError(null) }} className="rounded-lg px-4 py-2 text-sm text-sage-600 hover:bg-sage-50">Fechar</button>
                    <button
                      onClick={() => handleBook(selectedSession)}
                      disabled={actioning}
                      className="flex items-center gap-2 rounded-lg bg-sage-600 px-4 py-2 text-sm font-medium text-white hover:bg-sage-700 disabled:opacity-60"
                    >
                      {actioning && <Spinner />}
                      {full ? 'Entrar na fila' : 'Reservar'}
                    </button>
                  </div>
                </>
              )}
            </>
          )
        })()}
      </Modal>

      {/* ── Cancel confirmation modal ── */}
      <Modal
        open={confirmCancelBookingId !== null}
        onClose={() => { setConfirmCancelBookingId(null); setActionError(null) }}
        title="Cancelar inscrição"
      >
        <ErrorBanner message={actionError} />
        <p className="mb-6 text-sage-600">
          Tem certeza que deseja cancelar sua inscrição?
          <span className="mt-2 block text-sm text-amber-600">
            Cancelamentos só são permitidos com mais de 12 horas de antecedência.
            Se você estiver confirmado, o primeiro aluno na lista de espera será promovido automaticamente.
          </span>
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => { setConfirmCancelBookingId(null); setActionError(null) }} className="rounded-lg px-4 py-2 text-sm text-sage-600 hover:bg-sage-50">Voltar</button>
          <button
            onClick={() => {
              const b = myBookings.find((b) => b.id === confirmCancelBookingId)
              if (b) handleCancel(b.id, b.classTypeName)
            }}
            disabled={actioning}
            className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60"
          >
            {actioning && <Spinner />}
            Cancelar inscrição
          </button>
        </div>
      </Modal>
    </div>
  )
}
