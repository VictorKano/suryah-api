import api from './client'
import type { StudentSummary, StudentDetail, AdminUpdateStudentRequest, StudentBookingEntry } from '../types'

export async function listStudents(search?: string): Promise<StudentSummary[]> {
  const params: Record<string, string> = {}
  if (search) params.search = search
  const res = await api.get<StudentSummary[]>('/api/students', { params })
  return res.data
}

export async function listStudentDetails(search?: string): Promise<StudentDetail[]> {
  const params: Record<string, string> = {}
  if (search) params.search = search
  const res = await api.get<StudentDetail[]>('/api/students/details', { params })
  return res.data
}

export async function updateStudent(
  id: number,
  data: AdminUpdateStudentRequest,
): Promise<StudentDetail> {
  const res = await api.patch<StudentDetail>(`/api/students/${id}`, data)
  return res.data
}

export async function setStudentActive(
  id: number,
  active: boolean,
): Promise<StudentDetail> {
  const res = await api.patch<StudentDetail>(`/api/students/${id}/active`, { active })
  return res.data
}

export async function getStudentBookingHistory(
  id: number,
): Promise<StudentBookingEntry[]> {
  const res = await api.get<StudentBookingEntry[]>(`/api/students/${id}/bookings`)
  return res.data
}
