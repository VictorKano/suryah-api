import { useCallback, useEffect, useState } from 'react'
import { cancelBooking, listMyBookings } from '../api/bookings'
import { getErrorMessage } from '../api/client'
import { FullPageSpinner, Spinner } from '../components/Spinner'
import { ErrorBanner } from '../components/ErrorBanner'
import { BookingStatusBadge } from '../components/Badge'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import { formatDateTime } from '../utils/format'
import type { BookingResponse } from '../types'

export function MyBookings() {
  const { toast } = useToast()
  const [bookings, setBookings] = useState<BookingResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listMyBookings()
      setBookings(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleCancel = async (id: number) => {
    setCancelling(true)
    setActionError(null)
    const booking = bookings.find((b) => b.id === id)
    try {
      await cancelBooking(id)
      setCancelId(null)
      await load()
      toast(`Reserva cancelada — ${booking?.classTypeName ?? ''}`, 'info')
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <FullPageSpinner />

  // Split into upcoming active and cancelled for clarity
  const active = bookings.filter((b) => b.status !== 'CANCELLED')
  const cancelled = bookings.filter((b) => b.status === 'CANCELLED')

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-sage-800">Minhas Reservas</h1>
        <button
          onClick={load}
          className="rounded-lg border border-sage-200 px-3 py-1.5 text-sm text-sage-600 transition hover:bg-sage-50"
        >
          Atualizar
        </button>
      </div>

      <ErrorBanner message={error} />

      {active.length === 0 && !error && cancelled.length === 0 && (
        <div className="rounded-xl border border-dashed border-sage-200 py-16 text-center text-sage-400">
          Você ainda não tem reservas.
        </div>
      )}

      {active.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-sage-500">
            Ativas
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {active.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between rounded-xl border border-sage-100 bg-white p-4 shadow-sm"
              >
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="font-semibold text-sage-800">
                      {booking.classTypeName}
                    </h3>
                    <BookingStatusBadge status={booking.status} />
                  </div>
                  <p className="text-sm text-sage-500">
                    {formatDateTime(booking.startDateTime)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActionError(null)
                    setCancelId(booking.id)
                  }}
                  disabled={new Date(booking.startDateTime).getTime() - Date.now() < 12 * 60 * 60 * 1000}
                  title={
                    new Date(booking.startDateTime).getTime() - Date.now() < 12 * 60 * 60 * 1000
                      ? 'Cancelamento não permitido com menos de 12h de antecedência'
                      : 'Cancelar reserva'
                  }
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Cancelar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {cancelled.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-sage-400">
            Canceladas
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {cancelled.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between rounded-xl border border-sage-50 bg-sage-50/50 p-4 opacity-70"
              >
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="font-semibold text-sage-700">
                      {booking.classTypeName}
                    </h3>
                    <BookingStatusBadge status={booking.status} />
                  </div>
                  <p className="text-sm text-sage-400">
                    {formatDateTime(booking.startDateTime)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        open={cancelId !== null}
        onClose={() => {
          setCancelId(null)
          setActionError(null)
        }}
        title="Cancelar reserva"
      >
        <ErrorBanner message={actionError} />
        <p className="mb-6 text-sage-600">
          Tem certeza que deseja cancelar esta reserva?
          <span className="mt-2 block text-sm text-amber-600">
            Cancelamentos só são permitidos com mais de 12 horas de antecedência.
            Se sua reserva estiver confirmada, o primeiro aluno na lista de
            espera será promovido automaticamente.
          </span>
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => {
              setCancelId(null)
              setActionError(null)
            }}
            className="rounded-lg px-4 py-2 text-sm text-sage-600 hover:bg-sage-50"
          >
            Voltar
          </button>
          <button
            onClick={() => cancelId && handleCancel(cancelId)}
            disabled={cancelling}
            className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60"
          >
            {cancelling && <Spinner />}
            Cancelar reserva
          </button>
        </div>
      </Modal>
    </div>
  )
}
