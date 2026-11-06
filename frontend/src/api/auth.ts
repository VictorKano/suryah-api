import api from './client'
import type {
  LoginRequest,
  RegisterRequest,
  StudentResponse,
  TokenResponse,
} from '../types'

export async function register(
  data: RegisterRequest,
): Promise<StudentResponse> {
  const res = await api.post<StudentResponse>('/api/auth/register', data)
  return res.data
}

export async function login(data: LoginRequest): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>('/api/auth/login', data)
  return res.data
}
