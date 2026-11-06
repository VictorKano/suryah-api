import { Link } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { listClassTypes } from '../../api/classTypes'
import { listRecurringClasses } from '../../api/recurringClasses'
import { listClassSessions } from '../../api/classSessions'
import { listStudentDetails } from '../../api/students'
import { generateSessions } from '../../api/recurringClasses'
import { getErrorMessage } from '../../api/client'
import { ErrorBanner } from '../../components/ErrorBanner'
import { Spinner } from '../../components/Spinner'
import { useToast } from '../../components/Toast'

export function AdminDashboard() {
  const { toast } = useToast()
  const [stats, setStats] = useState({
    classTypes: 0,
    recurringClasses: 0,
    upcomingSessions: 0,
    totalStudents: 0,
  })
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [types, recurring, sessions, students] = await Promise.all([
        listClassTypes(),
        listRecurringClasses(),
        listClassSessions(),
        listStudentDetails(),
      ])
      setStats({
        classTypes: types.length,
        recurringClasses: recurring.length,
        upcomingSessions: sessions.length,
        totalStudents: students.filter((s) => s.active).length,
      })
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleGenerateNextMonth = async () => {
    setGenerating(true)
    try {
      const from = new Date()
      const to = new Date()
      to.setDate(to.getDate() + 28) // 4 semanas
      const toIso = (d: Date) => d.toISOString().slice(0, 10)
      const result = await generateSessions({ from: toIso(from), to: toIso(to) })
      await load()
      toast(
        `Geração concluída: ${result.sessionsCreated} sessões criadas, ${result.fixedBookingsCreated} reservas fixas.`,
      )
    } catch (err) {
      toast(getErrorMessage(err), 'error')
    } finally {
      setGenerating(false)
    }
  }

  const cards = [
    { label: 'Alunos Ativos', value: stats.totalStudents, to: '/admin/students' },
    { label: 'Tipos de Aula', value: stats.classTypes, to: '/admin/class-types' },
    { label: 'Aulas Recorrentes', value: stats.recurringClasses, to: '/admin/recurring-classes' },
    { label: 'Sessões Próximas', value: stats.upcomingSessions, to: '/admin/sessions' },
  ]

  const quickLinks = [
    {
      to: '/admin/generate',
      bg: 'bg-sage-600 text-white hover:bg-sage-700',
      title: 'Gerar Sessões',
      desc: 'Criar aulas a partir das aulas recorrentes para um período.',
    },
    {
      to: '/admin/students',
      bg: 'border border-sage-200 bg-white hover:border-sage-300 hover:shadow-md',
      title: 'Ver Alunos',
      desc: 'Lista completa com telefone, plano, idade e status.',
      titleClass: 'text-sage-800',
      descClass: 'text-sage-500',
    },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-sage-800">Painel</h1>

      <ErrorBanner message={error} />

      <div className="grid gap-4 sm:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="block rounded-xl border border-sage-100 bg-white p-6 shadow-sm transition hover:border-sage-300 hover:shadow-md"
          >
            <p className="text-sm text-sage-500">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-sage-700">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {/* Gerar próximas 4 semanas — atalho rápido */}
        <button
          onClick={handleGenerateNextMonth}
          disabled={generating}
          className="flex flex-col items-start rounded-xl bg-sage-600 p-6 text-left text-white shadow-sm transition hover:bg-sage-700 disabled:opacity-60"
        >
          <div className="flex items-center gap-2">
            {generating && <Spinner className="text-sage-100" />}
            <h3 className="font-semibold">Gerar próximas 4 semanas</h3>
          </div>
          <p className="mt-1 text-sm text-sage-100">
            Cria sessões a partir de hoje até {(() => { const d = new Date(); d.setDate(d.getDate() + 28); return d.toLocaleDateString('pt-BR') })()}.
          </p>
        </button>

        {quickLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`block rounded-xl p-6 shadow-sm transition ${link.bg}`}
          >
            <h3 className={`font-semibold ${link.titleClass ?? 'text-white'}`}>{link.title}</h3>
            <p className={`mt-1 text-sm ${link.descClass ?? 'text-sage-100'}`}>{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
