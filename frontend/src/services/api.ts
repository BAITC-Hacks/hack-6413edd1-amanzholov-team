const sessionKey = 'career-quest-hr-session'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}

export const session = {
  get: () => sessionStorage.getItem(sessionKey),
  set: (token: string) => sessionStorage.setItem(sessionKey, token),
  clear: () => sessionStorage.removeItem(sessionKey),
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Accept-Language', 'ru')
  if (session.get()) headers.set('Authorization', `Bearer ${session.get()}`)
  if (options.body) headers.set('Content-Type', 'application/json')
  let response: Response
  try { response = await fetch(`/api/v1${path}`, { ...options, headers }) }
  catch { throw new Error('Нет соединения с сервером. Повторите попытку.') }
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { message?: string } | null
    throw new ApiError(response.status, response.status === 403
      ? 'Нет доступа к HR-кабинету. Войдите под учётной записью с правами HR.'
      : error?.message ?? 'Сервер недоступен. Повторите попытку позже.')
  }
  return response.json() as Promise<T>
}
