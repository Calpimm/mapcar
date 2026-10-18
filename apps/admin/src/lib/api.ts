import 'server-only'
import { apiBase, env } from './env'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export async function adminApi<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = init
  const res = await fetch(`${apiBase()}/v1/admin${path}`, {
    ...rest,
    cache: 'no-store',
    headers: {
      authorization: `Bearer ${env().ADMIN_API_TOKEN}`,
      ...(json !== undefined ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null
    throw new ApiError(res.status, body?.message ?? `API hatası (${res.status})`)
  }
  return res.json() as Promise<T>
}
