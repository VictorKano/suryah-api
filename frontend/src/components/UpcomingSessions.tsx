import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  startOfWeek, endOfWeek, addWeeks, subWeeks,
  eachDayOfInterval, isSameDay, format, parseISO, isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { listClassSessions } from '../api/classSessions'
import { listSessionBookings } from '../api/bookings'
import type { ClassSessionResponse, SessionBookingResponse } from '../types'
import { formatDuration } from '../utils/format'
import { STUDIO_TIMEZONE } from '../utils/constants'
import { Spinner } from './Spinner'
import { BookingStatusBadge } from './Badge'

// ── helpers ───────────────────────────────────────────────────────────────────

function sessionTime(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: STUDIO_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(parseISO(iso))
}

// ── SessionPopover ─────────────────────────────────────────────────────────────

interface PopoverProps {
  session: ClassSessionResponse
  anchorRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
}

function SessionPopover({ session, anchorRef, onClose }: PopoverProps) {
  const popRef = useRef<HTMLDivElement>(null)
  const [bookings, setBookings] = useState<SessionBookingResponse[]>([])
  const [loading, setLoading] = useState(true)

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [anchorRef, onClose])

  useEffect(() => {
    setLoading(true)
    listSessionBookings(session.id)
      .then(setBookings)
      .finally(() => setLoading(false))
  }, [session.id])

  const confirmed = bookings.filter((b) => b.status === 'CONFIRMED')
  const waitlist  = bookings.filter((b) => b.status === 'WAITLIST')
  const occupancy = session.capacity > 0
    ? Math.round((session.confirmedCount / session.capacity) * 100)
    : 0

  return (
    <div
      ref={popRef}
      className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-sage-100 bg-white shadow-xl"
    >
      {/* Header */}
      <div className="border-b border-sage-50 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sage-800">{session.classTypeName}</p>
            <p className="mt-0.5 text-xs text-sage-500">
              {sessionTime(session.startDateTime)} · {formatDuration(session.durationMin)}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
              occupancy >= 100
                ? 'bg-red-100 text-red-700'
                : occupancy >= 70
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {session.confirmedCount}/{session.capacity}
          </span>
        </div>
        {/* barra de ocupação */}
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-sage-100">
          <div
            className={`h-full rounded-full ${
              occupancy >= 100 ? 'bg-red-500' : occupancy >= 70 ? 'bg-amber-400' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(occupancy, 100)}%` }}
          />
        </div>
      </div>

      {/* Body */}
      <div className="max-h-60 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : bookings.length === 0 ? (
          <p className="text-center text-xs text-sage-400">Nenhuma reserva ainda.</p>
        ) : (
          <div className="space-y-3">
            {confirmed.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-sage-500">
                  Confirmados ({confirmed.length})
                </p>
                <div className="space-y-1">
                  {confirmed.map((b) => (
                    <div key={b.bookingId} className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm text-sage-700">{b.studentName}</span>
                      <BookingStatusBadge status={b.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {waitlist.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600">
                  Lista de espera ({waitlist.length})
                </p>
                <div className="space-y-1">
                  {waitlist.map((b) => (
                    <div key={b.bookingId} className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm text-sage-700">{b.studentName}</span>
                      <BookingStatusBadge status={b.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── SessionCell ────────────────────────────────────────────────────────────────

function SessionCell({ session }: { session: ClassSessionResponse }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className={`w-full rounded-lg px-2 py-1.5 text-left text-xs transition focus:outline-none focus:ring-2 focus:ring-sage-400 ${
          session.availableSpots === 0
            ? 'bg-orange-50 hover:bg-orange-100'
            : 'bg-sage-50 hover:bg-sage-100'
        }`}
      >
        <p className="truncate font-semibold leading-tight text-sage-800">{session.classTypeName}</p>
        <p className="mt-0.5 text-sage-500">{sessionTime(session.startDateTime)} · {formatDuration(session.durationMin)}</p>
        <p className={`mt-0.5 font-medium ${session.availableSpots === 0 ? 'text-orange-600' : 'text-sage-600'}`}>
          {session.confirmedCount}/{session.capacity} vagas
        </p>
      </button>

      {open && (
        <SessionPopover
          session={session}
          anchorRef={btnRef}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}

// ── MobileSessionCard ──────────────────────────────────────────────────────────

function MobileSessionCard({ session }: { session: ClassSessionResponse }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-xl border border-sage-100 bg-white p-3 text-left shadow-sm transition hover:border-sage-300"
      >
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sage-800">{session.classTypeName}</p>
          <span className={`text-xs font-medium ${session.availableSpots === 0 ? 'text-orange-500' : 'text-sage-500'}`}>
            {session.confirmedCount}/{session.capacity}
          </span>
        </div>
        <p className="text-sm text-sage-500">{sessionTime(session.startDateTime)} · {formatDuration(session.durationMin)}</p>
      </button>

      {open && (
        <SessionPopover
          session={session}
          anchorRef={btnRef}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}

// ── UpcomingSessions (weekly calendar) ────────────────────────────────────────

export function UpcomingSessions() {
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  )
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const [sessions, setSessions] = useState<ClassSessionResponse[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (from: Date, to: Date) => {
    setLoading(true)
    try {
      setSessions(await listClassSessions(from.toISOString(), to.toISOString()))
    } catch {
      // falha silenciosa — o dashboard principal já tem ErrorBanner
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(weekStart, weekEnd)
  }, [weekStart]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const prevWeek = () => setWeekStart((w) => subWeeks(w, 1))
  const nextWeek = () => setWeekStart((w) => addWeeks(w, 1))
  const goToday  = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))

  const weekLabel = `${format(weekStart, "d 'de' MMM", { locale: ptBR })} – ${format(weekEnd, "d 'de' MMM yyyy", { locale: ptBR })}`

  return (
    <div>
      {/* Navegação */}
      <div className="mb-3 flex items-center gap-2">
        <button onClick={prevWeek} className="rounded-lg border border-sage-200 px-2.5 py-1.5 text-sm text-sage-600 hover:bg-sage-50">‹</button>
        <button onClick={goToday}  className="rounded-lg border border-sage-200 px-2.5 py-1.5 text-sm text-sage-600 hover:bg-sage-50">Hoje</button>
        <button onClick={nextWeek} className="rounded-lg border border-sage-200 px-2.5 py-1.5 text-sm text-sage-600 hover:bg-sage-50">›</button>
        <span className="text-sm font-medium text-sage-600">{weekLabel}</span>
      </div>

      {/* ── MOBILE: lista agrupada por dia ── */}
      <div className="block md:hidden">
        {loading ? (
          <div className="flex justify-center py-10"><Spinner className="text-sage-400" /></div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-sage-200 py-10 text-center text-sm text-sage-400">
            Nenhuma sessão nesta semana.
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
                    {daySessions.map((s) => <MobileSessionCard key={s.id} session={s} />)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── DESKTOP: grid 7 colunas ── */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-sage-100 bg-white shadow-sm">
        {/* Cabeçalho com os dias */}
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

        {/* Células com sessões */}
        <div className="grid min-h-[160px]" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
          {days.map((_, idx) => {
            const daySessions = sessionsByDay.get(idx) ?? []
            return (
              <div key={idx} className="border-r border-sage-50 p-1.5 last:border-r-0">
                {loading ? (
                  <div className="flex h-16 items-center justify-center"><Spinner className="text-sage-300" /></div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {daySessions.map((s) => <SessionCell key={s.id} session={s} />)}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {!loading && sessions.length === 0 && (
          <div className="border-t border-sage-50 py-10 text-center text-sm text-sage-400">
            Nenhuma sessão nesta semana.
          </div>
        )}
      </div>
    </div>
  )
}
