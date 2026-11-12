import api from './client'
import type { SubscriptionPaymentRequest, SubscriptionPaymentResponse } from '../types'

export async function listSubscriptionPayments(
  studentId: number,
): Promise<SubscriptionPaymentResponse[]> {
  const res = await api.get<SubscriptionPaymentResponse[]>(
    `/api/admin/students/${studentId}/subscription-payments`,
  )
  return res.data
}

export async function createSubscriptionPayment(
  studentId: number,
  data: SubscriptionPaymentRequest,
): Promise<SubscriptionPaymentResponse> {
  const res = await api.post<SubscriptionPaymentResponse>(
    `/api/admin/students/${studentId}/subscription-payments`,
    data,
  )
  return res.data
}

export async function deleteSubscriptionPayment(id: number): Promise<void> {
  await api.delete(`/api/admin/subscription-payments/${id}`)
}
