import type {
  BookingStatus,
  ClassStatus,
  DayOfWeek,
  PlanType,
  Role,
} from '../types'

// ── Display labels (pt-BR) ────────────────────────────────────────────────────

export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: 'Aluno',
  ADMIN: 'Administrador',
}

export const PLAN_LABELS: Record<PlanType, string> = {
  PRIVATE: 'Particular',
  TOTALPASS: 'TotalPass',
  WELLHUB: 'Wellhub',
}

export const PLAN_OPTIONS: PlanType[] = ['PRIVATE', 'TOTALPASS', 'WELLHUB']

export const CLASS_STATUS_LABELS: Record<ClassStatus, string> = {
  ACTIVE: 'Ativa',
  CANCELLED: 'Cancelada',
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
  WAITLIST: 'Lista de Espera',
}

// Tailwind classes for status badges
export const BOOKING_STATUS_STYLES: Record<BookingStatus, string> = {
  CONFIRMED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-700',
  WAITLIST: 'bg-amber-100 text-amber-800',
}

export const CLASS_STATUS_STYLES: Record<ClassStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-700',
}

export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Segunda',
  TUESDAY: 'Terça',
  WEDNESDAY: 'Quarta',
  THURSDAY: 'Quinta',
  FRIDAY: 'Sexta',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
}

export const DAY_OF_WEEK_OPTIONS: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]

// Studio timezone — matches backend application.yml jackson.time-zone
export const STUDIO_TIMEZONE = 'America/Sao_Paulo'
