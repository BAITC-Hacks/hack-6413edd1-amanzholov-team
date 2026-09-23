export type JsonRecord = Record<string, unknown>

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  code?: string
  requestId?: string

  constructor(message: string, status: number, code?: string, requestId?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.requestId = requestId
  }
}

type ApiOptions = Omit<RequestInit, 'body'> & { token?: string | null; body?: unknown }

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, body, headers: suppliedHeaders, ...init } = options
  const headers = new Headers(suppliedHeaders)
  headers.set('Accept', 'application/json')
  headers.set('Accept-Language', 'ru')
  if (body !== undefined) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (body !== undefined && init.method && init.method !== 'GET') headers.set('Idempotency-Key', crypto.randomUUID())

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new ApiError('Не удалось подключиться к API. Проверьте, запущен ли backend на localhost:8000.', 0)
  }

  const payload = await response.json().catch(() => null) as JsonRecord | null
  if (!response.ok) {
    const detail = payload?.detail
    const apiDetail = detail && typeof detail === 'object' ? detail as JsonRecord : payload
    const message = typeof apiDetail?.message === 'string' ? apiDetail.message : `Запрос завершился с ошибкой (${response.status}).`
    throw new ApiError(message, response.status, typeof apiDetail?.code === 'string' ? apiDetail.code : undefined, typeof apiDetail?.request_id === 'string' ? apiDetail.request_id : undefined)
  }
  return payload as T
}

export function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
}

export function asItems(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) return value.map(asRecord)
  const data = asRecord(value)
  return Array.isArray(data.items) ? data.items.map(asRecord) : []
}

export function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const sessionKey = 'career-quest-hr-session'
export const session = {
  get: () => sessionStorage.getItem(sessionKey),
  set: (token: string) => sessionStorage.setItem(sessionKey, token),
  clear: () => sessionStorage.removeItem(sessionKey),
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { body, ...init } = options
  return apiRequest<T>(path, {
    ...init,
    token: session.get(),
    body: typeof body === 'string' ? JSON.parse(body) : body ?? undefined,
  })
}
