import axios, { AxiosError, type AxiosInstance } from 'axios'
import type { ApiError } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

/**
 * Central Axios instance.
 *
 * - A request interceptor attaches the JWT from localStorage as a Bearer token.
 * - A response interceptor surfaces a clean error message and, on 401, clears
 *   the token and redirects to /login (so expired/invalid sessions don't get
 *   stuck on a blank page).
 */
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('suryah_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError | { message?: string }>) => {
    // On 401, the token is missing/expired — clear and redirect.
    if (error.response?.status === 401) {
      localStorage.removeItem('suryah_token')
      localStorage.removeItem('suryah_role')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?expired=1'
      }
    }
    return Promise.reject(error)
  },
)

/**
 * Extract a human-readable error message from any Axios error.
 * Maps common backend English messages to Portuguese.
 */
const ERROR_MAP: Record<string, string> = {
  'Class session not found': 'Sessão de aula não encontrada.',
  'Student not found': 'Aluno não encontrado.',
  'Class type not found': 'Tipo de aula não encontrado.',
  'Recurring class not found': 'Aula recorrente não encontrada.',
  'Booking not found': 'Reserva não encontrada.',
  'Fixed enrollment not found': 'Matrícula fixa não encontrada.',
  'Cannot book a session that is not ACTIVE': 'Não é possível reservar uma sessão que não está ativa.',
  'Student already has a CONFIRMED booking': 'Você já tem uma reserva confirmada para esta aula.',
  'Student already has a WAITLIST booking': 'Você já está na lista de espera para esta aula.',
  'Booking does not belong to this student': 'Esta reserva não pertence a você.',
  'Booking is already cancelled': 'Esta reserva já está cancelada.',
  'Student is already enrolled as a fixed student': 'Aluno já está matriculado como fixo nesta aula.',
  'Recurring class is not active': 'Esta aula recorrente está inativa.',
  'Student is not active': 'Este aluno está inativo.',
  'Class type is not active': 'Este tipo de aula está inativo.',
  'Class type with this name already exists': 'Já existe um tipo de aula com este nome.',
  'A recurring class already exists for this day': 'Já existe uma aula recorrente para este dia, horário e tipo.',
  'Not authenticated': 'Você não está autenticado.',
  'Invalid authentication principal': 'Sessão inválida. Faça login novamente.',
  'Not Found': 'Recurso não encontrado.',
  'Internal Server Error': 'Erro interno do servidor. Tente novamente.',
}

function translateError(message: string): string {
  for (const [key, translation] of Object.entries(ERROR_MAP)) {
    if (message.includes(key)) return translation
  }
  return message
}

export function getErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiError | { message?: string; detail?: string } | undefined
    if (data) {
      if ('message' in data && typeof data.message === 'string' && data.message) {
        return translateError(data.message)
      }
      if ('detail' in data && typeof data.detail === 'string' && data.detail) {
        return translateError(data.detail)
      }
    }
    if (error.response?.status === 500) {
      return 'Erro interno do servidor. Tente novamente.'
    }
    if (error.response?.status === 403) {
      return 'Você não tem permissão para realizar esta ação.'
    }
    if (error.response?.status === 404) {
      return 'Recurso não encontrado.'
    }
    if (error.response) {
      return `Erro ${error.response.status}: ${error.response.statusText}`
    }
    if (error.request) {
      return 'Não foi possível conectar ao servidor. Verifique sua conexão.'
    }
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

export default api
