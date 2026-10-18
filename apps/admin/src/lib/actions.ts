'use server'

import { createHash, timingSafeEqual } from 'node:crypto'
import {
  type AgentAdjust,
  agentAdjust,
  type CarModelInput,
  carModelInput,
  type JobInput,
  jobInput,
  type PlaceInput,
  placeInput,
  type SimSettings,
  simSettings,
} from '@mapcar/contracts'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { z } from 'zod'
import { adminApi } from './api'
import { env } from './env'
import { createSession, SESSION_COOKIE, SESSION_DAYS, verifySession } from './session'

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fields?: Record<string, string> }

const digest = (s: string) => createHash('sha256').update(s).digest()

export async function login(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const password = String(form.get('password') ?? '')
  if (!timingSafeEqual(digest(password), digest(env().ADMIN_PASSWORD))) {
    await new Promise((r) => setTimeout(r, 600))
    return { ok: false, error: 'Şifre hatalı' }
  }
  const jar = await cookies()
  jar.set(SESSION_COOKIE, await createSession(env().ADMIN_SESSION_SECRET), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 86400,
  })
  const next = String(form.get('next') ?? '/')
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/')
}

export async function logout() {
  ;(await cookies()).delete(SESSION_COOKIE)
  redirect('/login')
}

/**
 * Server action'lar herhangi bir sayfa adresine POST ile çağrılabilir (ör. /login),
 * bu yüzden proxy'ye güvenmeden her action oturumu kendisi doğrular.
 */
async function requireAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!(await verifySession(token, env().ADMIN_SESSION_SECRET)))
    throw new Error('Oturum süresi doldu, tekrar giriş yapın')
}

/** Doğrula, çağır, hatayı kullanıcı diline çevir */
async function run<S extends z.ZodType>(
  schema: S,
  input: unknown,
  call: (data: z.infer<S>) => Promise<unknown>,
  paths: string[],
): Promise<ActionResult> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[issue.path.join('.')] ??= issue.message
    return { ok: false, error: 'Bazı alanlar hatalı', fields }
  }
  try {
    await requireAdmin()
    await call(parsed.data)
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
  for (const p of paths) revalidatePath(p)
  return { ok: true }
}

export const updateSettings = async (input: Partial<SimSettings>) =>
  run(simSettings.partial(), input, (json) => adminApi('/settings', { method: 'PATCH', json }), [
    '/',
  ])

export const adjustAgent = async (input: AgentAdjust) =>
  run(agentAdjust, input, (json) => adminApi('/agent/adjust', { method: 'POST', json }), ['/'])

export async function resetAgent(): Promise<ActionResult> {
  try {
    await requireAdmin()
    await adminApi('/agent/reset', { method: 'POST' })
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function clearRoutes(): Promise<ActionResult> {
  try {
    await requireAdmin()
    await adminApi('/routes', { method: 'DELETE' })
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
  revalidatePath('/')
  return { ok: true }
}

export const savePlace = async (id: string | null, input: PlaceInput) =>
  run(
    placeInput,
    input,
    (json) =>
      adminApi(id ? `/places/${encodeURIComponent(id)}` : '/places', {
        method: id ? 'PUT' : 'POST',
        json,
      }),
    ['/yerler'],
  )

async function remove(path: string, revalidate: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    await adminApi(path, { method: 'DELETE' })
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
  revalidatePath(revalidate)
  return { ok: true }
}

export const deletePlace = async (id: string) =>
  remove(`/places/${encodeURIComponent(id)}`, '/yerler')

export const saveCar = async (id: string | null, input: CarModelInput) =>
  run(
    carModelInput,
    input,
    (json) =>
      adminApi(id ? `/cars/${encodeURIComponent(id)}` : '/cars', {
        method: id ? 'PUT' : 'POST',
        json,
      }),
    ['/arabalar'],
  )

export const deleteCar = async (id: string) =>
  remove(`/cars/${encodeURIComponent(id)}`, '/arabalar')

export const saveJob = async (id: string | null, input: JobInput) =>
  run(
    jobInput,
    input,
    (json) =>
      adminApi(id ? `/jobs/${encodeURIComponent(id)}` : '/jobs', {
        method: id ? 'PUT' : 'POST',
        json,
      }),
    ['/isler'],
  )

export const deleteJob = async (id: string) => remove(`/jobs/${encodeURIComponent(id)}`, '/isler')
