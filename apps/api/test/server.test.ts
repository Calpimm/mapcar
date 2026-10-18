import type { Db } from '@mapcar/db'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Env } from '../src/env'
import { buildServer } from '../src/server'
import type { SimRunner } from '../src/sim/runner'

const TOKEN = 'test-token-0123456789-0123456789-abcdef'

const env: Env = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://x:y@localhost:5432/z',
  API_PORT: 0,
  API_HOST: '127.0.0.1',
  API_CORS_ORIGINS: ['http://localhost:3010'],
  ADMIN_API_TOKEN: TOKEN,
  OSRM_URL: undefined,
  SIM_TICK_MS: 1000,
}

const settings = { paused: false, driveRate: 0.35, activityRate: 8 }
const sim = {
  agentId: 'agent-1',
  state: { day: 3, memory: {} },
  settings,
  clientCount: 0,
  updateSettings: vi.fn(async (next: Partial<typeof settings>) => ({ ...settings, ...next })),
  adjust: vi.fn(async () => {}),
  subscribe: vi.fn(() => () => {}),
} as unknown as SimRunner

let app: Awaited<ReturnType<typeof buildServer>>

beforeAll(async () => {
  app = await buildServer({ env, db: {} as Db, createSim: () => sim, logger: false })
  await app.ready()
})
afterAll(() => app.close())

const auth = { authorization: `Bearer ${TOKEN}` }

describe('api', () => {
  it('sağlık kontrolü', async () => {
    const res = await app.inject('/health')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true, day: 3 })
  })

  it('admin uçları token ister', async () => {
    expect(
      (await app.inject({ method: 'PATCH', url: '/v1/admin/settings', payload: {} })).statusCode,
    ).toBe(401)
    const wrong = await app.inject({
      method: 'PATCH',
      url: '/v1/admin/settings',
      payload: {},
      headers: { authorization: 'Bearer yanlis' },
    })
    expect(wrong.statusCode).toBe(401)
  })

  it('ayar girdisini doğrular', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/admin/settings',
      payload: { driveRate: 999 },
      headers: auth,
    })
    expect(res.statusCode).toBe(400)
    expect(sim.updateSettings).not.toHaveBeenCalled()
  })

  it('geçerli ayarı uygular', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/admin/settings',
      payload: { paused: true },
      headers: auth,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ paused: true })
    expect(sim.updateSettings).toHaveBeenCalledWith({ paused: true })
  })

  it('müdahale hatasını 400 olarak döner', async () => {
    vi.mocked(sim.adjust).mockRejectedValueOnce(new Error('Yer bulunamadı'))
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/agent/adjust',
      payload: { teleportPlaceId: 'yok' },
      headers: auth,
    })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ message: 'Yer bulunamadı' })
  })

  it('OpenAPI dokümanı yayınlanır', async () => {
    const res = await app.inject('/docs/openapi.json')
    expect(res.statusCode).toBe(200)
    expect(Object.keys(res.json().paths)).toContain('/v1/live')
  })
})
