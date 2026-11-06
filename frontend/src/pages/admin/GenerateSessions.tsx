import { useState, type FormEvent } from 'react'
import { generateSessions } from '../../api/recurringClasses'
import { getErrorMessage } from '../../api/client'
import { Spinner } from '../../components/Spinner'
import { ErrorBanner } from '../../components/ErrorBanner'
import type { GenerationSummary } from '../../types'

export function GenerateSessionsAdmin() {
  const today = new Date().toISOString().slice(0, 10)
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerationSummary | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const summary = await generateSessions({ from, to })
      setResult(summary)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-2 text-2xl font-bold text-sage-800">Gerar Sessões</h1>
      <p className="mb-6 text-sm text-sage-500">
        Cria aulas concretas a partir das aulas recorrentes ativas para o
        período selecionado. Alunos fixos recebem reserva automática. A
        operação é idempotente — executar novamente para o mesmo período não
        cria duplicatas.
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl bg-white p-6 shadow-sm"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-sage-700">
              De
            </label>
            <input
              type="date"
              required
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 outline-none focus:border-sage-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-sage-700">
              Até
            </label>
            <input
              type="date"
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 outline-none focus:border-sage-500"
            />
          </div>
        </div>

        <ErrorBanner message={error} />

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-sage-600 px-4 py-2.5 font-medium text-white transition hover:bg-sage-700 disabled:opacity-60"
        >
          {loading && <Spinner />}
          Gerar Sessões
        </button>
      </form>

      {result && (
        <div className="mt-6 rounded-xl border border-sage-200 bg-sage-50 p-6">
          <h2 className="mb-4 font-semibold text-sage-800">
            Geração concluída
          </h2>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sage-500">Sessões criadas</dt>
              <dd className="font-medium text-sage-800">
                {result.sessionsCreated}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sage-500">Sessões ignoradas (já existiam)</dt>
              <dd className="font-medium text-sage-800">
                {result.sessionsSkipped}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sage-500">Reservas de alunos fixos</dt>
              <dd className="font-medium text-sage-800">
                {result.fixedBookingsCreated}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  )
}
