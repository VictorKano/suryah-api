import api from './client'
import type { PlanRequest, PlanResponse } from '../types'

export async function listPlans(): Promise<PlanResponse[]> {
  const res = await api.get<PlanResponse[]>('/api/plans')
  return res.data
}

export async function createPlan(data: PlanRequest): Promise<PlanResponse> {
  const res = await api.post<PlanResponse>('/api/plans', data)
  return res.data
}

export async function updatePlan(id: number, data: PlanRequest): Promise<PlanResponse> {
  const res = await api.put<PlanResponse>(`/api/plans/${id}`, data)
  return res.data
}

export async function setPlanActive(id: number, active: boolean): Promise<PlanResponse> {
  const res = await api.patch<PlanResponse>(`/api/plans/${id}/active`, { active })
  return res.data
}
