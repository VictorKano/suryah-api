import { useCallback, useEffect, useState } from 'react'
import { getOccupancyReport } from '../../api/reports'
import { getErrorMessage } from '../../api/client'
import { FullPageSpinner } from '../../components/Spinner'
import { ErrorBanner } from '../../components/ErrorBanner'
import type { OccupancyReport } from '../../types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function pct(value: number): string {
  if (isNaN(value)) return '—'
  return `${value.toFixed(1)}%`
}

function rateColor(rate: number): string {
  if (isNaN(rate)) return 'bg-sage-200'
  if (rate >= 80) return 'bg-green-500'
  if (rate >= 50) return 'bg-sage-500'
  if (rate >= 25) return 'bg-amber-400'
  return 'bg-red-400'
}

function BarChart({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-sage-100">
        <div
          className={`h-full rounded-full transition-all ${rateColor(value)}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs text-sage-500">{pct(value)}</span>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  sub,
  color = 'text-sage-800',
}: {
  label: string
  value: string
  sub?: string
  color?: string
}) {
  return (
    <div className="rounded-xl border border-sage-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-sage-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-sage-400">{sub}</p>}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { label: 'Últimos 30 dias', value: 30 },
  { label: 'Últimos 60 dias', value: 60 },
  { label: 'Últimos 90 dias', value: 90 },
]

export function ReportsAdmin() {
  const [days, setDays] = useState(30)
  const [report, setReport] = useState<OccupancyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (d: number) => {
    setLoading(true)
    setError(null)
    try {
      setReport(await getOccupancyReport(d))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(days)
  }, [days, load])

  const maxOccupancy = report
    ? Math.max(...report.byClassType.map((r) => r.occupancyRate), 1)
    : 100

  const maxWeeklyConfirmed = report
    ? Math.max(...report.weeklyTrend.map((w) => w.confirmed), 1)
    : 1

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-sage-800">Relatório de Ocupação</h1>
        <div className="flex gap-1 rounded-lg border border-sage-200 bg-sage-50 p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                days === opt.value
                  ? 'bg-white text-sage-800 shadow-sm'
                  : 'text-sage-500 hover:text-sage-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <FullPageSpinner />
      ) : !report ? null : (
        <div className="space-y-8">
          {/* ── Summary cards ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Sessões realizadas"
              value={String(report.summary.totalSessions)}
            />
            <SummaryCard
              label="Reservas confirmadas"
              value={String(report.summary.totalConfirmed)}
              sub={`${report.summary.totalWaitlist} na lista de espera`}
            />
            <SummaryCard
              label="Taxa de ocupação"
              value={pct(report.summary.occupancyRate)}
              sub={`${report.summary.totalConfirmed} / ${report.summary.totalCapacity} vagas`}
              color={
                report.summary.occupancyRate >= 75
                  ? 'text-green-600'
                  : report.summary.occupancyRate >= 50
                  ? 'text-sage-700'
                  : 'text-amber-600'
              }
            />
            <SummaryCard
              label="Taxa de presença"
              value={pct(report.summary.attendanceRate)}
              sub={
                isNaN(report.summary.attendanceRate)
                  ? 'Nenhum check-in registrado'
                  : `${report.summary.totalAttended} presentes`
              }
              color={
                isNaN(report.summary.attendanceRate)
                  ? 'text-sage-400'
                  : report.summary.attendanceRate >= 75
                  ? 'text-green-600'
                  : 'text-amber-600'
              }
            />
          </div>

          {/* ── By class type + by day of week ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Class type */}
            <div className="rounded-xl border border-sage-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-sage-800">Ocupação por Tipo de Aula</h2>
              {report.byClassType.length === 0 ? (
                <p className="text-sm text-sage-400">Sem dados no período.</p>
              ) : (
                <div className="space-y-3">
                  {report.byClassType.map((ct) => (
                    <div key={ct.classTypeName}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium text-sage-700">{ct.classTypeName}</span>
                        <span className="text-sage-400">
                          {ct.confirmed}/{ct.capacity} · {ct.sessions} sessões
                        </span>
                      </div>
                      <BarChart value={ct.occupancyRate} max={maxOccupancy} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Day of week */}
            <div className="rounded-xl border border-sage-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-sage-800">Ocupação por Dia da Semana</h2>
              {report.byDayOfWeek.length === 0 ? (
                <p className="text-sm text-sage-400">Sem dados no período.</p>
              ) : (
                <div className="space-y-3">
                  {report.byDayOfWeek.map((d) => (
                    <div key={d.dayOfWeek}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium text-sage-700 capitalize">{d.dayOfWeek}</span>
                        <span className="text-sage-400">{d.confirmed} confirmados</span>
                      </div>
                      <BarChart value={d.occupancyRate} max={100} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── By hour + top students ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Hour heatmap */}
            <div className="rounded-xl border border-sage-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-sage-800">Horários Mais Populares</h2>
              {report.byHour.length === 0 ? (
                <p className="text-sm text-sage-400">Sem dados no período.</p>
              ) : (
                <div className="space-y-2">
                  {report.byHour.map((h) => (
                    <div key={h.hour} className="flex items-center gap-3">
                      <span className="w-14 text-right text-xs font-mono text-sage-500">
                        {String(h.hour).padStart(2, '0')}:00
                      </span>
                      <div className="flex flex-1 items-center gap-2">
                        <div className="h-6 flex-1 overflow-hidden rounded bg-sage-100">
                          <div
                            className="flex h-full items-center justify-end pr-1.5 text-xs font-medium text-white"
                            style={{
                              width: `${Math.max(4, (h.confirmed / Math.max(...report.byHour.map((x) => x.confirmed), 1)) * 100)}%`,
                              backgroundColor: h.occupancyRate >= 75 ? '#5d845d' : h.occupancyRate >= 50 ? '#7fa17f' : '#a8c2a8',
                            }}
                          >
                            {h.confirmed > 0 ? h.confirmed : ''}
                          </div>
                        </div>
                        <span className="w-12 text-right text-xs text-sage-400">
                          {pct(h.occupancyRate)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top students */}
            <div className="rounded-xl border border-sage-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-sage-800">Alunos Mais Ativos</h2>
              {report.topStudents.length === 0 ? (
                <p className="text-sm text-sage-400">Sem dados no período.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-sage-100">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-sage-100 bg-sage-50 text-xs text-sage-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">Aluno</th>
                        <th className="px-3 py-2 font-medium text-center">Reservas</th>
                        <th className="px-3 py-2 font-medium text-center">Presenças</th>
                        <th className="px-3 py-2 font-medium text-center">Cancelamentos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sage-50">
                      {report.topStudents.map((s, i) => (
                        <tr key={s.studentId} className="text-sage-700">
                          <td className="px-3 py-2">
                            <span className="mr-2 text-xs text-sage-400">#{i + 1}</span>
                            {s.studentName}
                          </td>
                          <td className="px-3 py-2 text-center font-medium">{s.confirmed}</td>
                          <td className="px-3 py-2 text-center">
                            {s.attended > 0 ? (
                              <span className="text-green-600">{s.attended}</span>
                            ) : (
                              <span className="text-sage-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {s.cancellations > 0 ? (
                              <span className="text-amber-600">{s.cancellations}</span>
                            ) : (
                              <span className="text-sage-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── Weekly trend ── */}
          <div className="rounded-xl border border-sage-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-sage-800">Tendência Semanal de Reservas</h2>
            {report.weeklyTrend.length === 0 ? (
              <p className="text-sm text-sage-400">Sem dados no período.</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex min-w-max items-end gap-2 pb-6 pt-2">
                  {report.weeklyTrend.map((w) => {
                    const confirmedH = Math.round(
                      (w.confirmed / maxWeeklyConfirmed) * 120,
                    )
                    const cancelH = Math.round(
                      (w.cancellations / Math.max(...report.weeklyTrend.map((x) => x.cancellations), 1)) * 40,
                    )
                    const label = new Date(w.weekStart + 'T12:00:00').toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                    })
                    return (
                      <div key={w.weekStart} className="flex flex-col items-center gap-1">
                        <span className="text-xs font-medium text-sage-600">{w.confirmed}</span>
                        <div className="flex items-end gap-0.5">
                          <div
                            className="w-6 rounded-t bg-sage-500 transition-all"
                            style={{ height: `${confirmedH}px` }}
                            title={`Confirmadas: ${w.confirmed}`}
                          />
                          <div
                            className="w-6 rounded-t bg-amber-300 transition-all"
                            style={{ height: `${cancelH}px` }}
                            title={`Canceladas: ${w.cancellations}`}
                          />
                        </div>
                        <span className="text-xs text-sage-400">{label}</span>
                      </div>
                    )
                  })}
                </div>
                {/* Legend */}
                <div className="flex items-center gap-4 text-xs text-sage-500">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-sage-500" />
                    Confirmadas
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-300" />
                    Canceladas
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
