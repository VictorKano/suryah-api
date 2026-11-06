import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { STUDIO_TIMEZONE } from './constants'

/**
 * The backend serializes OffsetDateTime in the America/Sao_Paulo zone
 * (application.yml: jackson.time-zone). When the string includes an offset,
 * the browser parses it into a correct UTC instant. We then re-display it
 * in the studio timezone using Intl so students always see local São Paulo
 * times regardless of their own timezone.
 */

function toZonedDate(iso: string): Date {
  // OffsetDateTime comes back as e.g. "2026-11-02T07:00:00-03:00".
  // If the backend ever omits the offset, fall back to treating it as local.
  const parsed = parseISO(iso)
  return parsed
}

export function formatDateTime(iso: string): string {
  const date = toZonedDate(iso)
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: STUDIO_TIMEZONE,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatDate(iso: string): string {
  const date = toZonedDate(iso)
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: STUDIO_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function formatTime(iso: string): string {
  const date = toZonedDate(iso)
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: STUDIO_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatWeekday(iso: string): string {
  const date = toZonedDate(iso)
  return format(date, 'EEEE', { locale: ptBR })
}

export function formatDuration(minutes: number): string {
  if (minutes % 60 === 0) return `${minutes / 60}h`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h${m}min` : `${m}min`
}

/**
 * Convert an HTML <input type="time"> value ("HH:mm") to the LocalTime
 * format the backend expects ("HH:mm:ss").
 */
export function toLocalTimeString(time: string): string {
  // already "HH:mm" → pad to "HH:mm:00"
  if (/^\d{2}:\d{2}$/.test(time)) return `${time}:00`
  return time
}

/**
 * Convert the backend LocalTime ("08:00:00") to an <input type="time">
 * value ("08:00").
 */
export function fromLocalTimeString(time: string): string {
  return time.slice(0, 5)
}
