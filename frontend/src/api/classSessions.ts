import api from './client'
import type {
  ClassSessionResponse,
  ClassSessionUpdateRequest,
} from '../types'

export async function listClassSessions(
  from?: string,
  to?: string,
): Promise<ClassSessionResponse[]> {
  const params: Record<string, string> = {}
  if (from) params.from = from
  if (to) params.to = to
  const res = await api.get<ClassSessionResponse[]>('/api/class-sessions', {
    params,
  })
  return res.data
}

export async function getClassSession(
  id: number,
): Promise<ClassSessionResponse> {
  const res = await api.get<ClassSessionResponse>(`/api/class-sessions/${id}`)
  return res.data
}

export async function updateClassSession(
  id: number,
  data: ClassSessionUpdateRequest,
): Promise<ClassSessionResponse> {
  const res = await api.put<ClassSessionResponse>(
    `/api/class-sessions/${id}`,
    data,
  )
  return res.data
}

export async function createAdHocSession(data: {
  classTypeId: number
  startDateTime: string
  durationMin: number
  capacity: number
}): Promise<ClassSessionResponse> {
  const res = await api.post<ClassSessionResponse>('/api/class-sessions', data)
  return res.data
}
