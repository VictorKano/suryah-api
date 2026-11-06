import api from './client'
import type { OccupancyReport } from '../types'

export async function getOccupancyReport(days: number): Promise<OccupancyReport> {
  const res = await api.get<OccupancyReport>('/api/reports/occupancy', {
    params: { days },
  })
  return res.data
}
