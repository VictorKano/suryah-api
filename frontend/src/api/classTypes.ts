import api from './client'
import type { ClassTypeRequest, ClassTypeResponse } from '../types'

export async function listClassTypes(): Promise<ClassTypeResponse[]> {
  const res = await api.get<ClassTypeResponse[]>('/api/class-types')
  return res.data
}

export async function createClassType(
  data: ClassTypeRequest,
): Promise<ClassTypeResponse> {
  const res = await api.post<ClassTypeResponse>('/api/class-types', data)
  return res.data
}

export async function updateClassType(
  id: number,
  data: ClassTypeRequest,
): Promise<ClassTypeResponse> {
  const res = await api.put<ClassTypeResponse>(`/api/class-types/${id}`, data)
  return res.data
}

export async function deleteClassType(id: number): Promise<void> {
  await api.delete(`/api/class-types/${id}`)
}
