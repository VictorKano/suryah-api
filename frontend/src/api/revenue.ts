import api from './client'
import type { RevenueReport } from '../types'

export async function getRevenueReport(params: {
  from?: string
  to?: string
  groupBy?: 'day' | 'month' | 'year'
}): Promise<RevenueReport> {
  const res = await api.get<RevenueReport>('/api/reports/revenue', { params })
  return res.data
}
