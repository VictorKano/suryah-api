import { useCallback, useEffect, useState } from 'react'
import { getRevenueReport } from '../../api/revenue'
import { getErrorMessage } from '../../api/client'
import { FullPageSpinner } from '../../components/Spinner'
import { ErrorBanner } from '../../components/ErrorBanner'
import type { RevenueReport } from '../../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

function pct(a: number, b: number): string {
  if (b === 0) return '—'
  return `${Math.round((a / b) * 100)}%`
}

const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function formatPeriod(period: string): string {
  if (period.length === 4) return period
  if (period.length === 7) {
    const [year, month] = period.split('-')
    return `${MONTH_ABBR[Number(month) - 1]}/${year.slice(2)}`
  }
  const [, month, day] = period.split('-')
  return `${day}/${month}`
}

const GROUP_OPTIONS: Array<{ label: string; value: 'day' | 'month' | 'year' }> = [
  { label: 'Por dia',  value: 'day'   },
  { label: 'Por mês',  value: 'month' },
  { label: 'Por ano',  value: 'year'  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-semibold text-sage-800">{children}</h2>
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-xs text-sage-400">{children}</p>
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RevenueAdmin() {
  const today = new Date()
  const firstOfYear = `${today.getFullYear()}-01-01`
  const todayStr = today.toISOString().slice(0, 10)

  const [from, setFrom] = useState(firstOfYear)
  const [to, setTo] = useState(todayStr)
  const [groupBy, setGroupBy] = useState<'day' | 'month' | 'year'>('month')
  const [report, setReport] = useState<RevenueReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setReport(await getRevenueReport({ from, to, groupBy }))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [from, to, groupBy])

  useEffect(() => { load() }, [load])

  if (loading) return <FullPageSpinner />

  const maxRevenue    = report ? Math.max(...report.series.map((s) => s.revenue), 1) : 1
  const maxBar        = report ? Math.max(...report.series.map((s) => s.attended + s.absent), 1) : 1
  const maxSubRev     = report ? Math.max(...(report.subscriptionSeries ?? []).map((s) => s.total), 1) : 1
  const totalRevenue  = (report?.summary.confirmedRevenue ?? 0) + (report?.subscriptionSummary.totalCollected ?? 0)

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sage-800">Faturamento</h1>
          <p className="mt-0.5 text-sm text-sage-500">
            Receita por sessão (Wellhub, TotalPass, Avulso) e receita de assinaturas (Mensal, Semestral, Anual).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-sage-400">De</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-sage-200 px-3 py-1.5 text-sm text-sage-800 outline-none focus:border-sage-500" />
            <label className="text-xs text-sage-400">até</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-sage-200 px-3 py-1.5 text-sm text-sage-800 outline-none focus:border-sage-500" />
          </div>
          <div className="flex gap-1 rounded-lg border border-sage-200 bg-sage-50 p-1">
            {GROUP_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setGroupBy(opt.value)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition ${groupBy === opt.value ? 'bg-white text-sage-800 shadow-sm' : 'text-sage-500 hover:text-sage-700'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />

      {!report ? null : (
        <div className="space-y-10">

          {/* ══ RESUMO GERAL ══════════════════════════════════════════════════ */}
          <div className="rounded-xl border border-sage-200 bg-sage-50 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-sage-500">Resumo geral do período</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-sage-500">Receita total</p>
                <p className="mt-1 text-3xl font-bold text-sage-800">{fmt(totalRevenue)}</p>
                <p className="mt-0.5 text-xs text-sage-400">Por sessão + assinaturas</p>
              </div>
              <div>
                <p className="text-sm text-sage-500">Por sessão</p>
                <p className="mt-1 text-2xl font-bold text-green-600">{fmt(report.summary.confirmedRevenue)}</p>
                <p className="mt-0.5 text-xs text-sage-400">{report.summary.totalAttended} presenças confirmadas</p>
              </div>
              <div>
                <p className="text-sm text-sage-500">Assinaturas recebidas</p>
                <p className="mt-1 text-2xl font-bold text-violet-600">{fmt(report.subscriptionSummary.totalCollected)}</p>
                <p className="mt-0.5 text-xs text-sage-400">{report.subscriptionSummary.totalPayments} pagamento{report.subscriptionSummary.totalPayments !== 1 ? 's' : ''} registrado{report.subscriptionSummary.totalPayments !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          {/* ══ SEÇÃO 1 — POR SESSÃO ═════════════════════════════════════════ */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
              <h2 className="text-lg font-semibold text-sage-800">Receita por sessão</h2>
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Wellhub · TotalPass · Avulso</span>
            </div>

            {/* Summary cards */}
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-sage-100 bg-white p-5 shadow-sm">
                <p className="text-sm text-sage-500">Confirmada</p>
                <p className="mt-1 text-2xl font-bold text-green-600">{fmt(report.summary.confirmedRevenue)}</p>
                <p className="mt-0.5 text-xs text-sage-400">{report.summary.totalAttended} presenças marcadas</p>
              </div>
              <div className="rounded-xl border border-sage-100 bg-white p-5 shadow-sm">
                <p className="text-sm text-sage-500">Potencial</p>
                <p className="mt-1 text-2xl font-bold text-sage-700">{fmt(report.summary.potentialRevenue)}</p>
                <p className="mt-0.5 text-xs text-sage-400">{report.summary.totalPending} presenças pendentes</p>
              </div>
              <div className="rounded-xl border border-sage-100 bg-white p-5 shadow-sm">
                <p className="text-sm text-sage-500">Perdido por falta</p>
                <p className="mt-1 text-2xl font-bold text-red-500">{fmt(report.summary.lostRevenue)}</p>
                <p className="mt-0.5 text-xs text-sage-400">
                  {report.summary.totalAbsent} faltas · {pct(report.summary.totalAttended, report.summary.totalAttended + report.summary.totalAbsent)} presença
                </p>
              </div>
            </div>

            {report.series.length === 0 ? (
              <div className="rounded-xl border border-dashed border-sage-200 py-10 text-center text-sm text-sage-400">
                Nenhuma presença registrada no período.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Receita por período */}
                <div className="rounded-xl border border-sage-100 bg-white p-5 shadow-sm">
                  <SectionTitle>Receita por período</SectionTitle>
                  <SubTitle>Valor total confirmado (presenças marcadas × valor do plano) em cada período.</SubTitle>
                  <div className="overflow-x-auto">
                    <div className="flex min-w-max items-end gap-2 pb-6 pt-2">
                      {report.series.map((s) => {
                        const h = Math.round((s.revenue / maxRevenue) * 140)
                        return (
                          <div key={s.period} className="flex flex-col items-center gap-1">
                            <span className="text-xs font-medium text-sage-700">{fmt(s.revenue)}</span>
                            <div className="w-10 rounded-t bg-green-500 transition-all" style={{ height: `${Math.max(4, h)}px` }}
                              title={`${formatPeriod(s.period)}: ${fmt(s.revenue)}`} />
                            <span className="text-xs text-sage-400">{formatPeriod(s.period)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Presenças vs faltas */}
                <div className="rounded-xl border border-sage-100 bg-white p-5 shadow-sm">
                  <SectionTitle>Presenças vs Faltas</SectionTitle>
                  <SubTitle>Comparativo de alunos que compareceram (verde) versus faltaram (vermelho).</SubTitle>
                  <div className="overflow-x-auto">
                    <div className="flex min-w-max items-end gap-2 pb-6 pt-2">
                      {report.series.map((s) => {
                        const hA = Math.round((s.attended / maxBar) * 120)
                        const hF = Math.round((s.absent   / maxBar) * 120)
                        return (
                          <div key={s.period} className="flex flex-col items-center gap-1">
                            <div className="flex items-end gap-0.5">
                              <div className="w-5 rounded-t bg-sage-500" style={{ height: `${Math.max(2, hA)}px` }}
                                title={`${formatPeriod(s.period)} — Presenças: ${s.attended}`} />
                              <div className="w-5 rounded-t bg-red-300" style={{ height: `${Math.max(2, hF)}px` }}
                                title={`${formatPeriod(s.period)} — Faltas: ${s.absent}`} />
                            </div>
                            <span className="text-xs text-sage-400">{formatPeriod(s.period)}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-sage-500">
                      <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-sage-500" />Presenças</span>
                      <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-300" />Faltas</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Por plano + top alunos */}
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-sage-100 bg-white p-5 shadow-sm">
                <SectionTitle>Por Plano (por sessão)</SectionTitle>
                <SubTitle>Receita gerada por cada plano de sessão no período.</SubTitle>
                {report.byPlan.length === 0 ? (
                  <p className="text-sm text-sage-400">Sem dados.</p>
                ) : (
                  <div className="space-y-3">
                    {report.byPlan.map((p) => {
                      const maxPlan = Math.max(...report.byPlan.map((x) => x.revenue), 1)
                      const w = Math.round((p.revenue / maxPlan) * 100)
                      return (
                        <div key={p.planName}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="font-medium text-sage-700">{p.planName}</span>
                            <span className="text-sage-500">
                              {p.attended} pres · {p.absent} falt · <span className="font-semibold text-green-600">{fmt(p.revenue)}</span>
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-sage-100">
                            <div className="h-full rounded-full bg-green-500" style={{ width: `${w}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-sage-100 bg-white p-5 shadow-sm">
                <SectionTitle>Top 10 Alunos (por sessão)</SectionTitle>
                <SubTitle>Alunos que mais geraram receita por presença no período.</SubTitle>
                {report.topStudents.length === 0 ? (
                  <p className="text-sm text-sage-400">Sem dados.</p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-sage-100">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-sage-100 bg-sage-50 text-xs text-sage-500">
                        <tr>
                          <th className="px-3 py-2 font-medium">Aluno</th>
                          <th className="px-3 py-2 font-medium">Plano</th>
                          <th className="px-3 py-2 font-medium text-right">Receita</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sage-50">
                        {report.topStudents.map((s, i) => (
                          <tr key={s.studentId} className="text-sage-700">
                            <td className="px-3 py-2">
                              <span className="mr-1 text-xs text-sage-400">#{i + 1}</span>
                              {s.studentName}
                              <span className="ml-1 text-xs text-sage-400">({s.attended} pres.)</span>
                            </td>
                            <td className="px-3 py-2 text-sage-500">{s.planName}</td>
                            <td className="px-3 py-2 text-right font-semibold text-green-600">{fmt(s.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ══ SEÇÃO 2 — ASSINATURAS ════════════════════════════════════════ */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-violet-500" />
              <h2 className="text-lg font-semibold text-sage-800">Receita de assinaturas</h2>
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">Mensal · Semestral · Anual</span>
            </div>

            {(!report.subscriptionSeries || report.subscriptionSeries.length === 0) ? (
              <div className="rounded-xl border border-dashed border-sage-200 py-10 text-center text-sm text-sage-400">
                Nenhum pagamento de assinatura registrado no período.
                <p className="mt-1 text-xs">Use a tela de Alunos → editar → seção "Pagamentos" para registrar mensalidades.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Resumo de assinaturas */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-sage-100 bg-white p-5 shadow-sm">
                    <p className="text-sm text-sage-500">Total recebido</p>
                    <p className="mt-1 text-2xl font-bold text-violet-600">{fmt(report.subscriptionSummary.totalCollected)}</p>
                    <p className="mt-0.5 text-xs text-sage-400">{report.subscriptionSummary.totalPayments} pagamento{report.subscriptionSummary.totalPayments !== 1 ? 's' : ''} registrado{report.subscriptionSummary.totalPayments !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="rounded-xl border border-sage-100 bg-white p-5 shadow-sm">
                    <p className="text-sm text-sage-500">Ticket médio</p>
                    <p className="mt-1 text-2xl font-bold text-sage-700">
                      {report.subscriptionSummary.totalPayments > 0
                        ? fmt(report.subscriptionSummary.totalCollected / report.subscriptionSummary.totalPayments)
                        : '—'}
                    </p>
                    <p className="mt-0.5 text-xs text-sage-400">Valor médio por pagamento registrado</p>
                  </div>
                </div>

                {/* Gráfico de assinaturas por período */}
                <div className="rounded-xl border border-sage-100 bg-white p-5 shadow-sm">
                  <SectionTitle>Recebimentos por período</SectionTitle>
                  <SubTitle>Valor total das assinaturas recebidas em cada período.</SubTitle>
                  <div className="overflow-x-auto">
                    <div className="flex min-w-max items-end gap-2 pb-6 pt-2">
                      {report.subscriptionSeries.map((s) => {
                        const h = Math.round((s.total / maxSubRev) * 140)
                        return (
                          <div key={s.period} className="flex flex-col items-center gap-1">
                            <span className="text-xs font-medium text-violet-700">{fmt(s.total)}</span>
                            <div className="w-10 rounded-t bg-violet-500 transition-all" style={{ height: `${Math.max(4, h)}px` }}
                              title={`${formatPeriod(s.period)}: ${fmt(s.total)} (${s.payments} pag.)`} />
                            <span className="text-xs text-sage-400">{formatPeriod(s.period)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Por plano de assinatura */}
                {report.subscriptionByPlan && report.subscriptionByPlan.length > 0 && (
                  <div className="rounded-xl border border-sage-100 bg-white p-5 shadow-sm">
                    <SectionTitle>Por Plano (assinatura)</SectionTitle>
                    <SubTitle>Receita de assinaturas por tipo de plano no período.</SubTitle>
                    <div className="space-y-3">
                      {report.subscriptionByPlan.map((p) => {
                        const maxP = Math.max(...report.subscriptionByPlan.map((x) => x.total), 1)
                        const w = Math.round((p.total / maxP) * 100)
                        return (
                          <div key={p.planName}>
                            <div className="mb-1 flex justify-between text-sm">
                              <span className="font-medium text-sage-700">{p.planName}</span>
                              <span className="text-sage-500">
                                {p.payments} pag. · <span className="font-semibold text-violet-600">{fmt(p.total)}</span>
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-sage-100">
                              <div className="h-full rounded-full bg-violet-500" style={{ width: `${w}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
