import api from './client'
import type {
  FixedEnrollmentRequest,
  FixedEnrollmentResponse,
} from '../types'

export async function listFixedEnrollments(
  recurringClassId: number,
): Promise<FixedEnrollmentResponse[]> {
  const res = await api.get<FixedEnrollmentResponse[]>(
    `/api/recurring-classes/${recurringClassId}/fixed-enrollments`,
  )
  return res.data
}

export async function createFixedEnrollment(
  recurringClassId: number,
  data: FixedEnrollmentRequest,
): Promise<FixedEnrollmentResponse> {
  const res = await api.post<FixedEnrollmentResponse>(
    `/api/recurring-classes/${recurringClassId}/fixed-enrollments`,
    data,
  )
  return res.data
}

export async function deleteFixedEnrollment(id: number): Promise<void> {
  await api.delete(`/api/fixed-enrollments/${id}`)
}
