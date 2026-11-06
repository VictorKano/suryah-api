// ── Enums (mirror the backend @Enumerated(STRING) values) ──────────────────────

export type Role = 'STUDENT' | 'ADMIN'

export type PlanType = 'PRIVATE' | 'TOTALPASS' | 'WELLHUB'

export type ClassStatus = 'ACTIVE' | 'CANCELLED'

export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'WAITLIST'

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY'

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  name: string
  email: string
  phone?: string
  age?: number
  password: string
  planType: PlanType
}

export interface LoginRequest {
  email: string
  password: string
}

export interface StudentResponse {
  id: number
  name: string
  email: string
  phone: string | null
  age: number | null
  planType: PlanType
  role: Role
}

export interface UpdateProfileRequest {
  name?: string
  email?: string
  phone?: string
  age?: number | null
  planType?: PlanType
  currentPassword?: string
  newPassword?: string
}

export interface TokenResponse {
  token: string
  role: Role
}

// ── Class Types ───────────────────────────────────────────────────────────────

export interface ClassTypeRequest {
  name: string
  description?: string
}

export interface ClassTypeResponse {
  id: number
  name: string
  description: string | null
}

// ── Recurring Classes ─────────────────────────────────────────────────────────

export interface RecurringClassRequest {
  dayOfWeek: DayOfWeek
  startTime: string // "HH:mm:ss" or "HH:mm"
  durationMin: number
  classTypeId: number
  capacity: number
}

export interface RecurringClassResponse {
  id: number
  dayOfWeek: DayOfWeek
  startTime: string // "08:00:00"
  durationMin: number
  classTypeName: string
  capacity: number
  active: boolean
}

export interface GenerateSessionsRequest {
  from: string // ISO date "2026-11-02"
  to: string // ISO date "2026-11-15"
}

export interface GenerationSummary {
  sessionsCreated: number
  sessionsSkipped: number
  fixedBookingsCreated: number
}

// ── Class Sessions ────────────────────────────────────────────────────────────

export interface ClassSessionResponse {
  id: number
  classTypeName: string
  startDateTime: string // ISO-8601 offset datetime
  durationMin: number
  capacity: number
  confirmedCount: number
  availableSpots: number
  myBookingStatus: string | null // "CONFIRMED" | "WAITLIST" | null
}

export interface ClassSessionUpdateRequest {
  capacity?: number | null
  status?: ClassStatus | null
}

// ── Bookings ──────────────────────────────────────────────────────────────────

export interface BookingResponse {
  id: number
  classSessionId: number
  classTypeName: string
  startDateTime: string
  status: BookingStatus
  createdAt: string
}

export interface SessionBookingResponse {
  bookingId: number
  studentId: number
  studentName: string
  studentEmail: string
  status: BookingStatus
  attended: boolean | null
  createdAt: string
}

// ── Fixed Enrollments ─────────────────────────────────────────────────────────

export interface FixedEnrollmentRequest {
  studentId: number
}

export interface FixedEnrollmentResponse {
  id: number
  studentId: number
  studentName: string
  recurringClassId: number
  active: boolean
  createdAt: string
}

// ── Students (admin listing) ──────────────────────────────────────────────────

export interface StudentSummary {
  id: number
  name: string
  email: string
}

export interface StudentDetail {
  id: number
  name: string
  email: string
  phone: string | null
  age: number | null
  planType: PlanType
  active: boolean
  createdAt: string
}

export interface AdminUpdateStudentRequest {
  name?: string
  email?: string
  phone?: string
  age?: number | null
  planType?: PlanType
}

export interface StudentBookingEntry {
  bookingId: number
  sessionId: number
  classTypeName: string
  startDateTime: string
  status: BookingStatus
  attended: boolean | null
  createdAt: string
}

// ── Reports ───────────────────────────────────────────────────────────────────

export interface OccupancyReport {
  summary: {
    totalSessions: number
    totalCapacity: number
    totalConfirmed: number
    totalWaitlist: number
    totalCancellations: number
    totalAttended: number
    occupancyRate: number
    attendanceRate: number // NaN if no check-ins recorded
  }
  byClassType: Array<{
    classTypeName: string
    sessions: number
    capacity: number
    confirmed: number
    occupancyRate: number
  }>
  byDayOfWeek: Array<{
    dayOfWeek: string
    sessions: number
    confirmed: number
    occupancyRate: number
  }>
  byHour: Array<{
    hour: number
    sessions: number
    confirmed: number
    occupancyRate: number
  }>
  topStudents: Array<{
    studentId: number
    studentName: string
    confirmed: number
    attended: number
    cancellations: number
  }>
  weeklyTrend: Array<{
    weekStart: string
    confirmed: number
    cancellations: number
  }>
}

// ── Errors ────────────────────────────────────────────────────────────────────

export interface ApiError {
  error: string
  message: string
  status: number
}
