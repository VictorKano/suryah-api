import api from './client'
import type {
  GenerateSessionsRequest,
  GenerationSummary,
  RecurringClassRequest,
  RecurringClassResponse,
} from '../types'

export async function listRecurringClasses(): Promise<RecurringClassResponse[]> {
  const res = await api.get<RecurringClassResponse[]>('/api/recurring-classes')
  return res.data
}

export async function createRecurringClass(
  data: RecurringClassRequest,
): Promise<RecurringClassResponse> {
  const res = await api.post<RecurringClassResponse>(
    '/api/recurring-classes',
    data,
  )
  return res.data
}

export async function updateRecurringClass(
  id: number,
  data: RecurringClassRequest,
): Promise<RecurringClassResponse> {
  const res = await api.put<RecurringClassResponse>(
    `/api/recurring-classes/${id}`,
    data,
  )
  return res.data
}

export async function deleteRecurringClass(id: number): Promise<void> {
  await api.delete(`/api/recurring-classes/${id}`)
}

export async function setRecurringClassActive(
  id: number,
  active: boolean,
): Promise<RecurringClassResponse> {
  const res = await api.patch<RecurringClassResponse>(
    `/api/recurring-classes/${id}/active`,
    { active },
  )
  return res.data
}

export async function generateSessions(
  data: GenerateSessionsRequest,
): Promise<GenerationSummary> {
  const res = await api.post<GenerationSummary>(
    '/api/recurring-classes/generate',
    data,
  )
  return res.data
}
