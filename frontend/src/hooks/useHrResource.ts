import { useEffect, useState } from 'react'
import { useApiSession } from '../context/useApiSession'
import { apiRequest } from '../services/api'
import type { Page } from '../types/hr'

export type HrResource<T> = { data?: T; error?: unknown; loading: boolean }

export function useHrResource<T>(path: string | null, revision = 0, allPages = false): HrResource<T> {
  const { token } = useApiSession()
  const key = JSON.stringify([path, token, revision, allPages])
  const [state, setState] = useState<{ key: string; data?: T; error?: unknown }>({ key: '' })

  useEffect(() => {
    if (!path) return
    const controller = new AbortController()
    const load = async () => {
      let result: T = await apiRequest<T>(path, { token, signal: controller.signal })
      if (allPages) {
        const first = result as T & Page<unknown>
        const items = [...first.items]
        let offset = first.offset + first.items.length
        while (offset < first.total) {
          const url = new URL(path, 'http://localhost')
          url.searchParams.set('offset', String(offset))
          const next = await apiRequest<Page<unknown>>(url.pathname + url.search, { token, signal: controller.signal })
          if (!next.items.length) throw new Error('Не удалось загрузить полный список.')
          items.push(...next.items)
          offset += next.items.length
        }
        result = { ...first, items }
      }
      if (!controller.signal.aborted) setState({ key, data: result })
    }
    void load().catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ key, error })
    })
    return () => controller.abort()
  }, [allPages, key, path, token])

  if (!path) return { loading: false }
  return state.key === key ? { ...state, loading: false } : { loading: true }
}
