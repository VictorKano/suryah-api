import api from './client'
import type { BookingResponse, SessionBookingResponse } from '../types'

export async function bookSession(
  classSessionId: number,
): Promise<BookingResponse> {
  const res = await api.post<BookingResponse>(
    `/api/class-sessions/${classSessionId}/bookings`,
  )
  return res.data
}

export async function cancelBooking(bookingId: number): Promise<void> {
  await api.delete(`/api/bookings/${bookingId}`)
}

export async function listMyBookings(): Promise<BookingResponse[]> {
  const res = await api.get<BookingResponse[]>('/api/bookings')
  return res.data
}

export async function listSessionBookings(
  sessionId: number,
): Promise<SessionBookingResponse[]> {
  const res = await api.get<SessionBookingResponse[]>(
    `/api/class-sessions/${sessionId}/bookings`,
  )
  return res.data
}

export async function markAttendance(
  bookingId: number,
  attended: boolean | null,
): Promise<SessionBookingResponse> {
  const res = await api.patch<SessionBookingResponse>(
    `/api/bookings/${bookingId}/attendance`,
    { attended },
  )
  return res.data
}
