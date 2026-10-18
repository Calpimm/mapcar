import { describe, expect, it } from 'vitest'
import { advance, createInitialState, DEFAULT_SETTINGS, type Effect, MIN_PER_DAY } from '../src'
import { makeWorld } from './fixture'

function run(days: number, seed = 42) {
  const world = makeWorld()
  let state = createInitialState(world, {
    name: 'Deniz',
    homePlaceId: 'home',
    jobId: 'barista',
    carModelId: 'corolla',
    seed,
  })
  const effects: Effect[] = []
  const target = state.clock + days * MIN_PER_DAY
  let ticks = 0
  while (state.clock < target && ticks++ < 200_000) {
    const r = advance(state, world, 1, DEFAULT_SETTINGS)
    state = r.state
    effects.push(...r.effects)
    for (const k of Object.values(state.needs)) {
      expect(k).toBeGreaterThanOrEqual(0)
      expect(k).toBeLessThanOrEqual(100)
    }
  }
  return { state, effects, world }
}

describe('simülasyon motoru', () => {
  it('deterministiktir', () => {
    const a = run(2, 7)
    const b = run(2, 7)
    expect(a.state).toEqual(b.state)
  })

  it('5 günde düzenli bir hayat yaşar', () => {
    const { state, effects } = run(5)
    const events = effects.filter((e) => e.kind === 'event')
    const starts = events.filter((e) => e.type === 'activity_start').map((e) => e.data?.action)

    expect(starts.filter((a) => a === 'work').length).toBeGreaterThanOrEqual(4)
    expect(starts.filter((a) => a === 'sleep').length).toBeGreaterThanOrEqual(4)
    const meals =
      starts.filter((a) => a === 'eat' || a === 'eat_home').length +
      events.filter((e) => e.type === 'meal').length
    expect(meals).toBeGreaterThanOrEqual(8)
    expect(effects.some((e) => e.kind === 'review')).toBe(true)
    expect(effects.filter((e) => e.kind === 'day_end').length).toBe(5)
    expect(state.stats.totalEarned).toBeGreaterThan(8000)
    expect(state.stats.totalDistanceKm).toBeGreaterThan(5)
    expect(state.needs.hunger).toBeGreaterThan(5)
  })

  it('rota yoksa need_route ister, sonra düz çizgiye düşer', () => {
    const { effects, world } = run(1)
    expect(effects.some((e) => e.kind === 'need_route')).toBe(true)
    expect(world.routes.size).toBeGreaterThan(0)
  })

  it('yeterince para olunca araba alır ve yeni hedef koyar', () => {
    const world = makeWorld()
    const state = createInitialState(world, {
      name: 'Deniz',
      homePlaceId: 'home',
      jobId: 'barista',
      carModelId: 'corolla',
      money: 80_000,
    })
    let s = state
    const effects: Effect[] = []
    for (let i = 0; i < 3000 && !effects.some((e) => e.kind === 'car_bought'); i++) {
      const r = advance(s, world, 1, DEFAULT_SETTINGS)
      s = r.state
      effects.push(...r.effects)
    }
    const bought = effects.find((e) => e.kind === 'car_bought')
    expect(bought).toBeDefined()
    expect(s.car?.modelId).toBe('punto')
    expect(s.goals.find((g) => g.kind === 'buy_car' && g.status === 'done')).toBeDefined()
  })

  it('girdi durumunu değiştirmez', () => {
    const world = makeWorld()
    const s = createInitialState(world, {
      name: 'D',
      homePlaceId: 'home',
      jobId: 'barista',
      carModelId: 'corolla',
    })
    const copy = structuredClone(s)
    advance(s, world, 30, DEFAULT_SETTINGS)
    expect(s).toEqual(copy)
  })
})
