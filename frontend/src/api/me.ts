import api from './client'
import type { StudentResponse, UpdateProfileRequest } from '../types'

export async function getMe(): Promise<StudentResponse> {
  const res = await api.get<StudentResponse>('/api/me')
  return res.data
}

export async function updateMe(
  data: UpdateProfileRequest,
): Promise<StudentResponse> {
  const res = await api.put<StudentResponse>('/api/me', data)
  return res.data
}
