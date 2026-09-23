const sessionKey = 'career-quest-employee-session';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export const getSession = () => sessionStorage.getItem(sessionKey);
export const setSession = (token: string) => sessionStorage.setItem(sessionKey, token);
export const clearSession = () => sessionStorage.removeItem(sessionKey);
export const session = { get: getSession, set: setSession, clear: clearSession };

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept-Language', 'ru');
  const token = getSession();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body) headers.set('Content-Type', 'application/json');
  const method = (options.method ?? 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)
    && !['/auth/login', '/recommendations'].includes(path.split('?')[0])
    && !headers.has('Idempotency-Key')) {
    headers.set('Idempotency-Key', crypto.randomUUID());
  }
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, { ...options, headers });
  } catch {
    throw new Error('Нет соединения с сервером. Повторите попытку.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string; code?: string } | null;
    throw new ApiError(response.status, body?.message
      ?? (response.status === 401 ? 'Войдите в систему.' : 'Не удалось выполнить запрос. Повторите попытку.'), body?.code);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export interface Page<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

/** Retains first-page metadata, including career frameworks and requirements. */
export async function allPages<T, P extends Page<T> = Page<T>>(path: string): Promise<P> {
  const separator = path.includes('?') ? '&' : '?';
  const first = await api<P>(`${path}${separator}offset=0&limit=100`);
  const items = [...first.items];
  while (items.length < first.total) {
    const next = await api<Page<T>>(`${path}${separator}offset=${items.length}&limit=100`);
    if (!next.items.length) throw new Error('Список изменился во время загрузки. Обновите страницу.');
    items.push(...next.items);
  }
  return { ...first, items };
}
