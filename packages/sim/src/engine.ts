import {
  FUEL_PRICE_PER_L,
  GROCERY_COST,
  GROCERY_MEALS,
  LEVEL_XP,
  levelFor,
  resaleValue,
  serviceCost,
  visitCost,
  WEEKLY_RENT,
} from './economy'
import { cumulative, haversine, pointAlong } from './geo'
import { Rng } from './rng'
import { dishFor, reviewComment, thoughts } from './text'
import { atHourToday, dayOf, dayOfWeek, hourOf, isOpenAt, isWeekend, MIN_PER_DAY } from './time'
import {
  type ActionKind,
  type Activity,
  type AgentState,
  type Effect,
  type EventType,
  type GoalState,
  type LngLat,
  type Needs,
  type PlaceCategory,
  type PlanItem,
  routeKey,
  type SimSettings,
  type TxCategory,
  type World,
  type WorldCarModel,
  type WorldJob,
  type WorldPlace,
  type WorldRoute,
} from './types'

// ---------------------------------------------------------------------------
// Dünya indeksleri (her World nesnesi için bir kez hesaplanır)
// ---------------------------------------------------------------------------

interface WorldIndex {
  places: Map<string, WorldPlace>
  jobs: Map<string, WorldJob>
  cars: Map<string, WorldCarModel>
  byCategory: Map<PlaceCategory, WorldPlace[]>
}

const indexCache = new WeakMap<World, WorldIndex>()
const cumCache = new WeakMap<LngLat[], number[]>()

export function indexWorld(world: World): WorldIndex {
  let idx = indexCache.get(world)
  if (!idx) {
    const byCategory = new Map<PlaceCategory, WorldPlace[]>()
    for (const p of world.places) {
      const list = byCategory.get(p.category) ?? []
      list.push(p)
      byCategory.set(p.category, list)
    }
    idx = {
      places: new Map(world.places.map((p) => [p.id, p])),
      jobs: new Map(world.jobs.map((j) => [j.id, j])),
      cars: new Map(world.carModels.map((c) => [c.id, c])),
      byCategory,
    }
    indexCache.set(world, idx)
  }
  return idx
}

/** Dünya verisi yerinde değiştirildiğinde (ör. admin düzenlemesi) çağrılmalı */
export function invalidateWorldIndex(world: World) {
  indexCache.delete(world)
}

const cumOf = (line: LngLat[]) => {
  let c = cumCache.get(line)
  if (!c) {
    c = cumulative(line)
    cumCache.set(line, c)
  }
  return c
}

export function straightRoute(from: WorldPlace, to: WorldPlace): WorldRoute {
  const a: LngLat = [from.lng, from.lat]
  const b: LngLat = [to.lng, to.lat]
  const distanceM = haversine(a, b)
  return {
    fromPlaceId: from.id,
    toPlaceId: to.id,
    geometry: [a, b],
    distanceM,
    durationS: distanceM / (40 / 3.6),
  }
}

// ---------------------------------------------------------------------------
// Sabitler
// ---------------------------------------------------------------------------

const MEAL_CATEGORIES: PlaceCategory[] = ['RESTAURANT', 'FAST_FOOD', 'CAFE']
const REVIEWABLE: ActionKind[] = ['eat', 'socialize', 'explore', 'beach', 'trip', 'shop', 'gym']
const EXPLORABLE: PlaceCategory[] = ['LANDMARK', 'BEACH', 'PARK']

export const ACTION_LABEL: Record<ActionKind, string> = {
  sleep: 'Uyuyor',
  work: 'Çalışıyor',
  eat: 'Yemek yiyor',
  eat_home: 'Evde yemek yapıyor',
  socialize: 'Sohbet ediyor',
  explore: 'Geziyor',
  beach: 'Denizin tadını çıkarıyor',
  trip: 'Gezide',
  study: 'Kendini geliştiriyor',
  gym: 'Spor yapıyor',
  shop: 'Alışveriş yapıyor',
  groceries: 'Market alışverişinde',
  refuel: 'Benzin alıyor',
  service: 'Araba serviste',
  buy_car: 'Galeride pazarlık yapıyor',
  relax: 'Dinleniyor',
}

export const PURPOSE_LABEL: Record<ActionKind, string> = {
  sleep: 'Eve, uyumaya',
  work: 'İşe gidiyor',
  eat: 'Yemeğe gidiyor',
  eat_home: 'Eve, yemek yapmaya',
  socialize: 'Buluşmaya gidiyor',
  explore: 'Gezmeye gidiyor',
  beach: 'Denize gidiyor',
  trip: 'Hafta sonu kaçamağı',
  study: 'Çalışmaya gidiyor',
  gym: 'Spora gidiyor',
  shop: 'Alışverişe gidiyor',
  groceries: 'Markete gidiyor',
  refuel: 'Benzinliğe gidiyor',
  service: 'Servise gidiyor',
  buy_car: 'Galeriye gidiyor',
  relax: 'Eve dönüyor',
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v))

export const moodOf = (n: Needs) => n.hunger * 0.25 + n.energy * 0.25 + n.fun * 0.3 + n.social * 0.2

// ---------------------------------------------------------------------------
// Başlangıç durumu
// ---------------------------------------------------------------------------

export interface InitialOptions {
  name: string
  homePlaceId: string
  jobId: string | null
  carModelId: string | null
  seed?: number
  money?: number
}

export function createInitialState(world: World, opts: InitialOptions): AgentState {
  const idx = indexWorld(world)
  const home = idx.places.get(opts.homePlaceId)
  if (!home) throw new Error(`Ev bulunamadı: ${opts.homePlaceId}`)
  const carModel = opts.carModelId ? idx.cars.get(opts.carModelId) : undefined
  const state: AgentState = {
    version: 1,
    name: opts.name,
    rng: opts.seed ?? 20260105,
    clock: 6 * 60 + 40,
    day: 0,
    money: opts.money ?? 6000,
    needs: { hunger: 72, energy: 88, fun: 60, social: 50 },
    pantry: 3,
    homePlaceId: home.id,
    jobId: opts.jobId,
    career: { level: 0, xp: 0 },
    car: carModel
      ? {
          ownedCarId: null,
          modelId: carModel.id,
          fuel: carModel.tankLiters * 0.45,
          condition: 58,
          odometerKm: 0,
          purchasePrice: carModel.price,
        }
      : null,
    position: [home.lng, home.lat],
    heading: 0,
    activity: { kind: 'idle', placeId: home.id },
    workedToday: false,
    lastTripWeek: -1,
    plan: { day: -1, items: [] },
    goals: [],
    memory: {},
    stats: {
      dayEarned: 0,
      daySpent: 0,
      dayDistanceKm: 0,
      totalDistanceKm: 0,
      totalEarned: 0,
      totalSpent: 0,
      meals: 0,
      reviews: 0,
    },
    lastThoughtAt: -1e9,
    seq: 0,
  }
  const sim = new Simulation(state, world, [])
  sim.ensureGoals()
  sim.makePlan()
  state.rng = sim.rng.state
  return state
}

// ---------------------------------------------------------------------------
// İlerletme
// ---------------------------------------------------------------------------

export interface AdvanceResult {
  state: AgentState
  effects: Effect[]
  simMinutes: number
}

/** Durumu `realSeconds` gerçek saniye kadar ilerletir. Girdi durumu değiştirilmez. */
export function advance(
  prev: AgentState,
  world: World,
  realSeconds: number,
  settings: SimSettings,
): AdvanceResult {
  const state = structuredClone(prev)
  const effects: Effect[] = []
  const sim = new Simulation(state, world, effects)
  const start = state.clock
  let budget = realSeconds
  let guard = 0
  while (budget > 1e-9 && guard++ < 50_000) {
    const slow = state.activity.kind === 'driving' || state.activity.kind === 'waiting_route'
    const rate = slow ? settings.driveRate : settings.activityRate
    const dt = Math.min(1, budget * rate)
    budget -= dt / rate
    sim.step(dt)
  }
  state.rng = sim.rng.state
  return { state, effects, simMinutes: state.clock - start }
}

interface Option {
  action: ActionKind
  place: WorldPlace
  score: number
}

class Simulation {
  readonly rng: Rng
  readonly idx: WorldIndex

  constructor(
    readonly s: AgentState,
    readonly world: World,
    readonly effects: Effect[],
  ) {
    this.rng = new Rng(s.rng)
    this.idx = indexWorld(world)
  }

  // ----- yardımcılar -------------------------------------------------------

  private get here(): WorldPlace | null {
    const a = this.s.activity
    const id = a.kind === 'idle' ? a.placeId : a.kind === 'at' ? a.placeId : null
    return id ? (this.idx.places.get(id) ?? null) : null
  }

  private get job() {
    return this.s.jobId ? (this.idx.jobs.get(this.s.jobId) ?? null) : null
  }

  private get carModel() {
    return this.s.car ? (this.idx.cars.get(this.s.car.modelId) ?? null) : null
  }

  private get home() {
    return this.idx.places.get(this.s.homePlaceId)!
  }

  private get city() {
    return this.here?.city ?? this.world.homeCity
  }

  private emit(
    type: EventType,
    message: string,
    placeId: string | null,
    data?: Record<string, unknown>,
  ) {
    this.effects.push({
      kind: 'event',
      type,
      message,
      placeId,
      at: this.s.clock,
      position: [...this.s.position] as LngLat,
      data,
    })
  }

  private tx(amount: number, category: TxCategory, description: string, placeId: string | null) {
    if (amount === 0) return
    this.s.money += amount
    if (amount > 0) {
      this.s.stats.dayEarned += amount
      this.s.stats.totalEarned += amount
    } else {
      this.s.stats.daySpent -= amount
      this.s.stats.totalSpent -= amount
    }
    this.effects.push({
      kind: 'transaction',
      amount,
      category,
      description,
      placeId,
      balance: this.s.money,
      at: this.s.clock,
    })
  }

  private nextId(prefix: string) {
    this.s.seq += 1
    return `${prefix}-${this.s.seq}`
  }

  private distanceKm(p: WorldPlace) {
    return haversine(this.s.position, [p.lng, p.lat]) / 1000
  }

  private open(p: WorldPlace) {
    return isOpenAt(p.openHour, p.closeHour, this.s.clock)
  }

  private placesOf(categories: PlaceCategory[], sameCity = true) {
    const out: WorldPlace[] = []
    for (const c of categories)
      for (const p of this.idx.byCategory.get(c) ?? [])
        if ((!sameCity || p.city === this.city) && this.open(p)) out.push(p)
    return out
  }

  private nearest(categories: PlaceCategory[]) {
    let best: WorldPlace | null = null
    let bestD = Number.POSITIVE_INFINITY
    for (const p of this.placesOf(categories, false)) {
      const d = this.distanceKm(p)
      if (d < bestD) {
        bestD = d
        best = p
      }
    }
    return best
  }

  /** Mekan tercihi: öğrenilmiş puan + yenilik - fiyat - mesafe */
  private placeValue(p: WorldPlace, action: ActionKind) {
    const mem = this.s.memory[p.id]
    const expected = mem ? mem.avgRating : 3.3
    const novelty = mem ? 0 : 0.55
    const recency = mem && this.s.clock - mem.lastVisit < MIN_PER_DAY * 1.5 ? -0.7 : 0
    const cost = visitCost(p.category, p.priceLevel, action)
    const affordability = -(cost / Math.max(this.s.money, 200)) * 6
    const distance = -this.distanceKm(p) * 0.06
    return expected + novelty + recency + affordability + distance + this.rng.range(-0.35, 0.35)
  }

  private bestPlace(places: WorldPlace[], action: ActionKind) {
    let best: WorldPlace | null = null
    let bestV = Number.NEGATIVE_INFINITY
    for (const p of places) {
      const cost = visitCost(p.category, p.priceLevel, action)
      if (cost > this.s.money - 300) continue
      const v = this.placeValue(p, action)
      if (v > bestV) {
        bestV = v
        best = p
      }
    }
    return best ? { place: best, value: bestV } : null
  }

  // ----- adım ---------------------------------------------------------------

  step(dt: number) {
    const s = this.s
    s.clock += dt
    const day = dayOf(s.clock)
    if (day !== s.day) this.rollDay(day)
    this.decay(dt)

    const a = s.activity
    switch (a.kind) {
      case 'idle':
        this.decide()
        break
      case 'waiting_route':
        this.tryDepart(a)
        break
      case 'driving':
        this.drive(a, dt)
        break
      case 'stopped':
        if (s.clock >= a.until) {
          s.activity = a.resume
          this.emit('thought', 'Tekrar yola koyuldu.', null)
        }
        break
      case 'at':
        for (const [k, v] of Object.entries(a.gains) as [keyof Needs, number][])
          s.needs[k] = clamp(s.needs[k] + v * dt)
        if (a.action === 'work' && !a.lunch && s.needs.hunger < 30) {
          a.lunch = true
          this.tx(-220, 'FOOD', 'Öğle arası', a.placeId)
          s.needs.hunger = clamp(s.needs.hunger + 45)
          this.emit('meal', 'Öğle arasında ayaküstü bir tost yedi.', a.placeId)
        }
        if (a.action === 'work' || a.action === 'study') {
          const perf = 0.55 + (0.45 * (s.needs.energy + s.needs.fun)) / 200
          s.career.xp += (dt / 60) * perf * (a.action === 'study' ? 1.6 : 1)
        }
        if (s.clock >= a.endsAt) this.finish(a)
        break
    }
  }

  private decay(dt: number) {
    const a = this.s.activity
    const n = this.s.needs
    const sleeping = a.kind === 'at' && a.action === 'sleep'
    const working = a.kind === 'at' && (a.action === 'work' || a.action === 'study')
    const driving = a.kind === 'driving'
    const comfort = this.carModel?.comfort ?? 0.3
    n.hunger = clamp(n.hunger - 0.088 * dt * (sleeping ? 0.35 : 1))
    n.energy = clamp(n.energy + (sleeping ? 0.2 : -(0.052 + (working ? 0.028 : 0))) * dt)
    n.fun = clamp(
      n.fun -
        (0.042 + (working ? 0.03 : 0)) * dt * (sleeping ? 0.15 : 1) +
        (driving ? comfort * 0.05 * dt : 0),
    )
    n.social = clamp(n.social - 0.032 * dt * (sleeping ? 0.15 : 1))
  }

  private rollDay(day: number) {
    const s = this.s
    this.effects.push({
      kind: 'day_end',
      day: s.day,
      money: s.money,
      earned: s.stats.dayEarned,
      spent: s.stats.daySpent,
      distanceKm: s.stats.dayDistanceKm,
      mood: moodOf(s.needs),
      at: s.clock,
    })
    s.day = day
    s.workedToday = false
    s.stats.dayEarned = 0
    s.stats.daySpent = 0
    s.stats.dayDistanceKm = 0
    if (dayOfWeek(s.clock) === 1) this.tx(-WEEKLY_RENT, 'RENT', 'Haftalık kira', s.homePlaceId)
    this.ensureGoals()
    this.makePlan()
  }

  // ----- karar --------------------------------------------------------------

  private decide() {
    const s = this.s
    const n = s.needs
    const h = hourOf(s.clock)
    const dow = dayOfWeek(s.clock)
    const job = this.job
    const night = h >= 22.5 || h < 6
    const options: Option[] = []
    const add = (action: ActionKind, place: WorldPlace | null | undefined, score: number) => {
      if (place && score > 0) options.push({ action, place, score })
    }
    const shiftSoon =
      job?.workDays.includes(dow) &&
      !s.workedToday &&
      h < job.shiftEnd - 1 &&
      h >= job.shiftStart - 2

    // Uyku
    let sleep = 0
    if (night) sleep = 1.3 + (100 - n.energy) / 100
    else if (n.energy < 18) sleep = 1.6
    else if (n.energy < 40 && h >= 20) sleep = 1.1
    if (shiftSoon && n.energy > 12) sleep = 0
    add('sleep', this.home, sleep)

    // İş
    if (
      job?.workDays.includes(dow) &&
      !s.workedToday &&
      h >= job.shiftStart - 0.75 &&
      h < job.shiftEnd - 1
    )
      add('work', this.idx.places.get(job.placeId), 3)

    // Yemek
    if (n.hunger < 62) {
      const urgency = (100 - n.hunger) / 100
      const base = 0.5 + urgency * 2.3 + (n.hunger < 14 ? 1 : 0)
      const out = this.bestPlace(this.placesOf(MEAL_CATEGORIES), 'eat')
      if (out) add('eat', out.place, base + 0.15 * (out.value - 3))
      if (s.pantry > 0) {
        const thrifty = s.money < 2500 ? 0.6 : 0
        const lazy = this.here?.id === s.homePlaceId ? 0.3 : 0
        add('eat_home', this.home, base - 0.35 + thrifty + lazy)
      }
    }

    // Sosyallik
    if (n.social < 55 && !night) {
      const cats: PlaceCategory[] = h >= 19 ? ['BAR', 'CAFE'] : ['CAFE']
      const out = this.bestPlace(this.placesOf(cats), 'socialize')
      if (out)
        add('socialize', out.place, 0.3 + ((100 - n.social) / 100) * 1.5 + 0.1 * (out.value - 3))
    }

    // Eğlence
    if (n.fun < 60 && !night) {
      const urgency = 0.3 + ((100 - n.fun) / 100) * 1.4 + (isWeekend(s.clock) ? 0.3 : 0)
      const spot = this.bestPlace(this.placesOf(['LANDMARK', 'PARK']), 'explore')
      if (spot && h >= 8 && h < 20) add('explore', spot.place, urgency + 0.1 * (spot.value - 3))
      const beach = this.bestPlace(this.placesOf(['BEACH']), 'beach')
      if (beach && h >= 9 && h < 19)
        add('beach', beach.place, urgency + 0.05 + 0.1 * (beach.value - 3))
      const mall = this.bestPlace(this.placesOf(['MALL']), 'shop')
      if (mall && s.money > 6000) add('shop', mall.place, urgency - 0.25)
      const gym = this.bestPlace(this.placesOf(['GYM']), 'gym')
      if (gym && n.energy > 55) add('gym', gym.place, urgency - 0.2)
    }

    // Hafta sonu kaçamağı
    const week = Math.floor(s.day / 7)
    if (
      isWeekend(s.clock) &&
      h >= 8 &&
      h < 11.5 &&
      s.lastTripWeek !== week &&
      s.money > 5000 &&
      n.energy > 50
    ) {
      const planned = s.plan.items.find((i) => i.action === 'trip' && i.status === 'pending')
      const target = planned?.placeId ? this.idx.places.get(planned.placeId) : this.pickTrip()
      add('trip', target, 2.1)
    }

    // Kendini geliştirme
    if (
      h >= 18.5 &&
      h < 23 &&
      n.energy > 38 &&
      n.fun > 28 &&
      s.career.level < LEVEL_XP.length - 1
    ) {
      const atCafe = n.social < 50 ? this.bestPlace(this.placesOf(['CAFE']), 'study') : null
      add('study', atCafe?.place ?? this.home, 0.75)
    }

    // Araba bakımı
    const model = this.carModel
    if (s.car && model) {
      const ratio = s.car.fuel / model.tankLiters
      if (ratio < 0.35) add('refuel', this.nearest(['GAS_STATION']), ratio < 0.18 ? 3.2 : 0.8)
      if (s.car.condition < 40)
        add('service', this.nearest(['MECHANIC']), s.car.condition < 18 ? 2.7 : 0.9)
    }

    // Market
    if (s.pantry < 2 && s.money > GROCERY_COST + 500)
      add(
        'groceries',
        this.bestPlace(this.placesOf(['MARKET']), 'groceries')?.place,
        0.65 + (s.money < 3000 ? 0.4 : 0),
      )

    // Hedef: yeni araba
    const carGoal = s.goals.find((g) => g.kind === 'buy_car' && g.status === 'active')
    if (
      carGoal?.targetAmount &&
      s.money >= carGoal.targetAmount * 0.85 + 4000 - this.tradeInValue()
    ) {
      const dealer = this.bestPlace(this.placesOf(['CAR_DEALER']), 'buy_car')
      add('buy_car', dealer?.place, 2.4)
    }

    // Varsayılan: evde dinlen
    add('relax', this.home, this.here?.id === s.homePlaceId ? 0.25 : h >= 21 ? 0.7 : 0.2)

    let best = options[0]!
    for (const o of options) {
      o.score += this.rng.range(0, 0.12)
      if (o.score > best.score) best = o
    }
    this.maybeThink()
    this.begin(best.action, best.place)
  }

  private pickTrip(): WorldPlace | null {
    const far = this.world.places.filter(
      (p) =>
        p.city !== this.world.homeCity && (p.category === 'LANDMARK' || p.category === 'BEACH'),
    )
    if (!far.length) return null
    const unseen = far.filter((p) => !this.s.memory[p.id])
    return this.rng.pick(unseen.length ? unseen : far)
  }

  private maybeThink() {
    const s = this.s
    if (s.clock - s.lastThoughtAt < 180 || !this.rng.chance(0.25)) return
    const n = s.needs
    const pool =
      n.hunger < 25
        ? thoughts.hungry
        : n.energy < 25
          ? thoughts.tired
          : n.fun < 25
            ? thoughts.bored
            : n.social < 25
              ? thoughts.lonely
              : s.money < 1500
                ? thoughts.broke
                : s.money > 40_000
                  ? thoughts.rich
                  : null
    if (!pool) return
    s.lastThoughtAt = s.clock
    this.emit('thought', this.rng.pick(pool), null)
  }

  private begin(action: ActionKind, place: WorldPlace) {
    const s = this.s
    const here = this.here
    if (here?.id === place.id) {
      this.startAt(action, place)
      return
    }
    const from = here ?? this.home
    s.activity = {
      kind: 'waiting_route',
      action,
      fromPlaceId: from.id,
      toPlaceId: place.id,
      since: s.clock,
    }
    if (!this.world.routes.has(routeKey(from.id, place.id)))
      this.effects.push({ kind: 'need_route', fromPlaceId: from.id, toPlaceId: place.id })
    this.tryDepart(s.activity)
  }

  private tryDepart(a: Extract<Activity, { kind: 'waiting_route' }>) {
    const key = routeKey(a.fromPlaceId, a.toPlaceId)
    let route = this.world.routes.get(key)
    if (!route && this.s.clock - a.since > 4) {
      route = straightRoute(this.idx.places.get(a.fromPlaceId)!, this.idx.places.get(a.toPlaceId)!)
      this.world.routes.set(key, route)
    }
    if (!route) return
    const model = this.carModel
    const base = route.durationS > 0 ? route.distanceM / (route.durationS / 60) : 600
    const factor = model ? clamp(model.cruiseKmh / 70, 0.85, 1.2) : 0.15
    const to = this.idx.places.get(a.toPlaceId)!
    this.s.activity = {
      kind: 'driving',
      action: a.action,
      fromPlaceId: a.fromPlaceId,
      toPlaceId: a.toPlaceId,
      distanceM: route.distanceM,
      progressM: 0,
      speed: base * factor,
      startedAt: this.s.clock,
    }
    this.emit('depart', `${PURPOSE_LABEL[a.action]}`, to.id, {
      distanceKm: Math.round(route.distanceM / 100) / 10,
      action: a.action,
    })
  }

  private drive(a: Extract<Activity, { kind: 'driving' }>, dt: number) {
    const s = this.s
    const meters = Math.min(a.speed * dt, a.distanceM - a.progressM)
    a.progressM += meters
    const km = meters / 1000
    s.stats.dayDistanceKm += km
    s.stats.totalDistanceKm += km
    const model = this.carModel
    if (s.car && model) {
      s.car.fuel = Math.max(0, s.car.fuel - (km * model.fuelPer100Km) / 100)
      s.car.condition = clamp(s.car.condition - km * 0.011)
      s.car.odometerKm += km
    }
    const route = this.world.routes.get(routeKey(a.fromPlaceId, a.toPlaceId))
    if (route) {
      const pos = pointAlong(
        route.geometry,
        cumOf(route.geometry),
        (a.progressM / a.distanceM) * route.distanceM,
      )
      s.position = pos.point
      s.heading = pos.bearing
    }

    if (a.progressM >= a.distanceM - 0.5) {
      const to = this.idx.places.get(a.toPlaceId)!
      s.position = [to.lng, to.lat]
      this.startAt(a.action, to)
      return
    }

    // Yolda başa gelenler
    if (s.car && model && s.car.fuel <= 0) {
      this.tx(-650, 'REPAIR', 'Yol yardımı: benzin bitti', null)
      s.car.fuel = 6
      this.stop('Benzin bitti! Yol yardımı bekleniyor.', 35, a)
    } else if (this.rng.chance(dt * 0.0004)) {
      this.tx(-450, 'REPAIR', 'Lastik değişimi', null)
      this.stop('Lastik patladı, yedek lastiği takıyor.', 20, a)
    } else if (s.car && s.car.condition < 20 && this.rng.chance(dt * 0.004)) {
      this.tx(-900, 'REPAIR', 'Yolda arıza', null)
      this.stop('Araba yolda kaldı! Motoru soğutuyor.', 45, a)
    }
  }

  private stop(reason: string, minutes: number, resume: Extract<Activity, { kind: 'driving' }>) {
    this.s.activity = { kind: 'stopped', reason, until: this.s.clock + minutes, resume }
    this.emit('incident', reason, null)
  }

  // ----- etkinlikler --------------------------------------------------------

  private startAt(action: ActionKind, place: WorldPlace) {
    const s = this.s
    const rng = this.rng
    const h = hourOf(s.clock)
    let duration = 60
    let gains: Partial<Needs> = {}
    let cost = visitCost(place.category, place.priceLevel, action)
    let category: TxCategory = 'LEISURE'
    let message: string = ACTION_LABEL[action]
    let dish: string | null = null

    switch (action) {
      case 'sleep': {
        const needed = (100 - s.needs.energy) / 0.2 + 30
        let wake = s.clock + clamp(needed, 150, 600)
        const night = h >= 21 || h < 5
        if (night)
          wake = Math.max(wake, atHourToday(h >= 21 ? s.clock + MIN_PER_DAY : s.clock, 6.5))
        wake = Math.min(wake, s.clock + 600)
        const job = this.job
        if (job) {
          const tomorrow = h > 12 ? s.clock + MIN_PER_DAY : s.clock
          const dow = dayOfWeek(tomorrow)
          const shift = atHourToday(tomorrow, job.shiftStart - 1.3)
          if (job.workDays.includes(dow) && shift > s.clock + 240) wake = Math.min(wake, shift)
        }
        duration = wake - s.clock
        message = 'Eve döndü, uykuya daldı.'
        cost = 0
        break
      }
      case 'work': {
        const job = this.job!
        const end = atHourToday(s.clock, job.shiftEnd)
        duration = Math.max(30, end - s.clock)
        const late = h - job.shiftStart
        message =
          late > 0.25 ? `Vardiyaya ${Math.round(late * 60)} dk geç kaldı.` : 'Vardiyaya başladı.'
        cost = 0
        gains = { social: 0.02 }
        break
      }
      case 'eat': {
        dish = dishFor(rng, place.category)
        duration = rng.int(40, 75)
        gains = { hunger: 85 / duration, social: 0.05, fun: 0.04 }
        category = 'FOOD'
        message = dish
          ? `${dish[0]!.toLocaleUpperCase('tr')}${dish.slice(1)} sipariş etti.`
          : 'Yemek yiyor.'
        break
      }
      case 'eat_home': {
        duration = rng.int(35, 55)
        gains = { hunger: 70 / duration }
        s.pantry -= 1
        cost = 0
        message = 'Evde kendine yemek hazırladı.'
        break
      }
      case 'socialize': {
        dish = dishFor(rng, place.category)
        duration = rng.int(70, 150)
        gains = { social: 70 / duration, fun: 25 / duration, hunger: 0.03 }
        message = 'Arkadaşlarıyla buluştu.'
        break
      }
      case 'explore': {
        duration = rng.int(60, 150)
        gains = { fun: 65 / duration, energy: -0.02 }
        message = 'Etrafı keşfediyor.'
        break
      }
      case 'beach': {
        duration = rng.int(100, 220)
        gains = { fun: 80 / duration, social: 0.06, energy: 0.02 }
        message = 'Havlusunu serdi, denize girdi.'
        break
      }
      case 'trip': {
        duration = rng.int(150, 270)
        gains = { fun: 95 / duration, social: 0.08 }
        s.lastTripWeek = Math.floor(s.day / 7)
        message = `${place.city} kaçamağı başladı!`
        break
      }
      case 'shop': {
        duration = rng.int(60, 120)
        gains = { fun: 45 / duration, social: 0.08 }
        message = 'Vitrinleri geziyor.'
        break
      }
      case 'gym': {
        duration = rng.int(50, 80)
        gains = { fun: 35 / duration, energy: -0.12 }
        message = 'Antrenmana başladı.'
        break
      }
      case 'study': {
        duration = rng.int(60, 120)
        gains = { fun: -0.05 }
        cost = place.category === 'CAFE' ? visitCost('CAFE', place.priceLevel, 'socialize') : 0
        message = rng.pick([
          'React kursuna devam ediyor.',
          'Algoritma soruları çözüyor.',
          'Yan projesine kod yazıyor.',
          'TypeScript dokümantasyonu okuyor.',
        ])
        break
      }
      case 'groceries': {
        duration = 30
        cost = GROCERY_COST
        category = 'GROCERY'
        message = 'Haftalık market alışverişi yapıyor.'
        break
      }
      case 'refuel': {
        duration = 10
        const model = this.carModel!
        const liters = model.tankLiters - s.car!.fuel
        const affordable = Math.min(liters, Math.max(0, (s.money - 100) / FUEL_PRICE_PER_L))
        cost = Math.round(affordable * FUEL_PRICE_PER_L)
        s.car!.fuel += affordable
        category = 'FUEL'
        message = `${affordable.toFixed(1)} litre benzin aldı.`
        break
      }
      case 'service': {
        duration = 120
        cost = Math.min(serviceCost(s.car!.condition), Math.max(0, s.money - 200))
        category = 'REPAIR'
        message = 'Arabayı servise bıraktı.'
        break
      }
      case 'buy_car': {
        duration = 60
        cost = 0
        message = 'Galeride arabalara bakıyor.'
        break
      }
      case 'relax': {
        duration = rng.int(40, 90)
        gains = { fun: 0.08, energy: 0.04 }
        cost = 0
        message = 'Evde biraz kafa dinliyor.'
        break
      }
    }

    if (cost > s.money) cost = Math.max(0, Math.floor(s.money))
    if (cost > 0) this.tx(-cost, category, `${place.name}`, place.id)

    s.position = [place.lng, place.lat]
    s.activity = {
      kind: 'at',
      action,
      placeId: place.id,
      startedAt: s.clock,
      endsAt: s.clock + duration,
      spent: cost,
      gains,
      dish,
    }
    this.markPlan(action, place.id)
    this.emit('activity_start', message, place.id, { action, cost, dish })
  }

  private finish(a: Extract<Activity, { kind: 'at' }>) {
    const s = this.s
    const place = this.idx.places.get(a.placeId)!
    switch (a.action) {
      case 'work':
        this.finishWork(a)
        break
      case 'eat':
        s.stats.meals += 1
        break
      case 'eat_home':
        s.stats.meals += 1
        break
      case 'groceries':
        s.pantry += GROCERY_MEALS
        break
      case 'service':
        s.car!.condition = 100
        this.emit('service', 'Araba servisten pırıl pırıl çıktı.', place.id)
        break
      case 'buy_car':
        this.purchaseCar(place)
        break
      case 'refuel':
        this.emit('refuel', 'Depo doldu, yola devam.', place.id)
        break
      case 'study': {
        const before = s.career.level
        this.checkLevel()
        if (s.career.level === before && this.rng.chance(0.2))
          this.emit('thought', 'Bugün yeni bir şey öğrendim, iyi hissediyorum.', place.id)
        break
      }
    }
    if (REVIEWABLE.includes(a.action)) this.review(a, place)
    this.updateGoals()
    s.activity = { kind: 'idle', placeId: place.id }
  }

  private finishWork(a: Extract<Activity, { kind: 'at' }>) {
    const s = this.s
    const job = this.job
    if (!job) return
    const hours = Math.min((s.clock - a.startedAt) / 60, job.shiftEnd - job.shiftStart)
    const pay = Math.round(hours * job.hourlyWage)
    s.workedToday = true
    this.tx(pay, 'SALARY', `${job.title} maaşı (${hours.toFixed(1)} saat)`, job.placeId)
    this.emit(
      'work_done',
      `Vardiya bitti, ${pay.toLocaleString('tr-TR')} ₺ kazandı.`,
      job.placeId,
      { pay },
    )
    if (this.rng.chance(0.04)) {
      const bonus = Math.round(job.hourlyWage * this.rng.range(3, 8))
      this.tx(bonus, 'BONUS', 'Performans primi', job.placeId)
      this.emit(
        'incident',
        `Patron çok memnun kaldı: ${bonus.toLocaleString('tr-TR')} ₺ prim!`,
        job.placeId,
      )
    }
    this.checkLevel()
  }

  private checkLevel() {
    const s = this.s
    const level = levelFor(s.career.xp)
    if (level <= s.career.level) return
    s.career.level = level
    this.emit('promotion', `Seviye atladı! Artık seviye ${level}.`, null, { level })
    const current = this.job
    const better = this.world.jobs
      .filter((j) => j.minLevel <= level && j.hourlyWage > (current?.hourlyWage ?? 0))
      .sort((x, y) => y.hourlyWage - x.hourlyWage)[0]
    if (better) {
      s.jobId = better.id
      this.effects.push({ kind: 'job', jobId: better.id, at: s.clock })
      const place = this.idx.places.get(better.placeId)
      this.emit('job_change', `Yeni iş: ${better.title} (${place?.name ?? ''})`, better.placeId, {
        jobId: better.id,
        wage: better.hourlyWage,
      })
    }
  }

  private tradeInValue() {
    const car = this.s.car
    return car ? resaleValue(car.purchasePrice, car.condition, car.odometerKm) : 0
  }

  private purchaseCar(dealer: WorldPlace) {
    const s = this.s
    const goal = s.goals.find((g) => g.kind === 'buy_car' && g.status === 'active')
    const model = goal?.carModelId ? this.idx.cars.get(goal.carModelId) : null
    if (!goal || !model) return
    const trade = this.tradeInValue()
    if (s.money + trade < model.price) {
      this.emit('thought', 'Param henüz yetmiyor, biraz daha biriktirmeliyim.', dealer.id)
      return
    }
    const old = s.car
    const oldModel = this.carModel
    if (old && trade > 0)
      this.tx(trade, 'CAR_SALE', `${oldModel?.brand} ${oldModel?.model} takas`, dealer.id)
    this.tx(-model.price, 'CAR_PURCHASE', `${model.year} ${model.brand} ${model.model}`, dealer.id)
    this.effects.push({
      kind: 'car_bought',
      carModelId: model.id,
      price: model.price,
      previousOwnedCarId: old?.ownedCarId ?? null,
      salePrice: trade,
      odometerKm: old?.odometerKm ?? 0,
      at: s.clock,
    })
    s.car = {
      ownedCarId: null,
      modelId: model.id,
      fuel: model.tankLiters * 0.6,
      condition: 100,
      odometerKm: 0,
      purchasePrice: model.price,
    }
    s.needs.fun = clamp(s.needs.fun + 35)
    this.emit(
      'car_bought',
      `Yeni arabası hayırlı olsun: ${model.year} ${model.brand} ${model.model}!`,
      dealer.id,
      {
        carModelId: model.id,
      },
    )
    goal.status = 'done'
    goal.progress = goal.target
    this.effects.push({ kind: 'goal', goal: { ...goal }, at: s.clock })
    this.emit('goal_done', `Hedef tamamlandı: ${goal.title}`, dealer.id)
    this.ensureGoals()
  }

  private review(a: Extract<Activity, { kind: 'at' }>, place: WorldPlace) {
    const s = this.s
    const rng = this.rng
    const mem = s.memory[place.id]
    const first = !mem
    const mood = moodOf(s.needs)
    const raw =
      1 +
      place.quality * 4 +
      rng.gaussian() * 0.5 +
      (mood - 60) / 90 -
      (a.spent > s.money * 0.25 && a.spent > 400 ? 0.4 : 0)
    const rating = Math.round(clamp(raw, 1, 5))
    s.memory[place.id] = {
      visits: (mem?.visits ?? 0) + 1,
      avgRating: mem ? (mem.avgRating * mem.visits + rating) / (mem.visits + 1) : rating,
      lastVisit: s.clock,
    }
    if (!first && !rng.chance(0.45)) return
    const comment = reviewComment(rng, rating, a.dish ?? null)
    s.stats.reviews += 1
    this.effects.push({
      kind: 'review',
      placeId: place.id,
      rating,
      comment,
      spent: a.spent,
      at: s.clock,
    })
    this.emit('review', comment, place.id, { rating })
  }

  // ----- hedefler & plan ----------------------------------------------------

  ensureGoals() {
    const s = this.s
    const has = (kind: GoalState['kind']) =>
      s.goals.some((g) => g.kind === kind && g.status === 'active')
    const push = (g: Omit<GoalState, 'id' | 'status' | 'createdAt'>) => {
      const goal: GoalState = {
        ...g,
        id: this.nextId('goal'),
        status: 'active',
        createdAt: s.clock,
      }
      s.goals.push(goal)
      this.effects.push({ kind: 'goal', goal: { ...goal }, at: s.clock })
      this.emit('goal_new', `Yeni hedef: ${goal.title}`, null)
    }

    if (!has('buy_car')) {
      const current = this.carModel
      const income = (this.job?.hourlyWage ?? 300) * 8 * 5
      const upgrades = this.world.carModels
        .filter(
          (m) =>
            m.id !== current?.id &&
            m.price > (current?.price ?? 0) &&
            m.comfort >= (current?.comfort ?? 0),
        )
        .sort((x, y) => x.price - y.price)
      const next = upgrades.find((m) => m.price <= income * 9) ?? upgrades[0]
      if (next)
        push({
          kind: 'buy_car',
          title: `${next.year} ${next.brand} ${next.model} satın al`,
          targetAmount: next.price,
          carModelId: next.id,
          progress: s.money,
          target: next.price,
        })
    }

    if (!has('career') && s.career.level < LEVEL_XP.length - 1) {
      const nextLevel = s.career.level + 1
      const job = this.world.jobs
        .filter((j) => j.minLevel === nextLevel)
        .sort((x, y) => y.hourlyWage - x.hourlyWage)[0]
      push({
        kind: 'career',
        title: job ? `Terfi: ${job.title}` : `Kariyer seviyesi ${nextLevel}`,
        targetAmount: null,
        carModelId: null,
        progress: s.career.xp,
        target: LEVEL_XP[nextLevel]!,
      })
    }

    if (!has('explore') && !s.goals.some((g) => g.kind === 'explore')) {
      const total = this.world.places.filter((p) => EXPLORABLE.includes(p.category)).length
      push({
        kind: 'explore',
        title: "KKTC'nin bütün güzel köşelerini gez",
        targetAmount: null,
        carModelId: null,
        progress: 0,
        target: total,
      })
    }
    this.updateGoals()
  }

  private updateGoals() {
    const s = this.s
    for (const g of s.goals) {
      if (g.status !== 'active') continue
      if (g.kind === 'buy_car') g.progress = Math.max(0, s.money + this.tradeInValue())
      if (g.kind === 'career') {
        g.progress = s.career.xp
        if (s.career.xp >= g.target) this.completeGoal(g)
      }
      if (g.kind === 'explore') {
        g.progress = Object.keys(s.memory).filter((id) => {
          const p = this.idx.places.get(id)
          return p && EXPLORABLE.includes(p.category)
        }).length
        if (g.progress >= g.target) this.completeGoal(g)
      }
    }
  }

  private completeGoal(g: GoalState) {
    g.status = 'done'
    g.progress = g.target
    this.effects.push({ kind: 'goal', goal: { ...g }, at: this.s.clock })
    this.emit('goal_done', `Hedef tamamlandı: ${g.title}`, null)
    if (g.kind === 'career') this.ensureGoals()
  }

  makePlan() {
    const s = this.s
    const items: PlanItem[] = []
    const job = this.job
    const dow = dayOfWeek(s.clock)
    const working = !!job && job.workDays.includes(dow)
    const item = (hour: number, action: ActionKind, label: string, placeId: string | null = null) =>
      items.push({ id: this.nextId('plan'), hour, action, label, placeId, status: 'pending' })

    if (working && job) {
      const workPlace = this.idx.places.get(job.placeId)
      item(job.shiftStart - 1.2, 'eat', 'Kahvaltı')
      item(job.shiftStart, 'work', `${job.title} @ ${workPlace?.name ?? 'iş'}`, job.placeId)
      item(job.shiftEnd + 0.5, 'eat', 'Akşam yemeği')
      if (s.career.level < LEVEL_XP.length - 1) item(20, 'study', 'Akşam: kendini geliştir')
    } else {
      item(9, 'eat', 'Geç kahvaltı')
      if (isWeekend(s.clock) && s.lastTripWeek !== Math.floor(s.day / 7)) {
        const trip = this.pickTrip()
        if (trip) item(9.5, 'trip', `Kaçamak: ${trip.name}, ${trip.city}`, trip.id)
      } else item(11, 'explore', 'Mağusa turu')
      item(15, 'beach', 'Deniz keyfi')
      item(20, 'socialize', 'Arkadaşlarla buluş')
    }
    const model = this.carModel
    if (s.car && model && s.car.fuel / model.tankLiters < 0.4) item(17.5, 'refuel', 'Depoyu doldur')
    if (s.pantry < 3) item(18, 'groceries', 'Market alışverişi')
    const carGoal = s.goals.find((g) => g.kind === 'buy_car' && g.status === 'active')
    if (carGoal?.targetAmount && s.money + this.tradeInValue() >= carGoal.targetAmount + 4000)
      item(12, 'buy_car', `Galeriye uğra: ${carGoal.title}`)
    item(23, 'sleep', 'Uyku')
    items.sort((a, b) => a.hour - b.hour)
    s.plan = { day: s.day, items }
  }

  private markPlan(action: ActionKind, placeId: string) {
    const h = hourOf(this.s.clock)
    const family = (a: ActionKind) =>
      a === 'eat_home' ? 'eat' : a === 'beach' || a === 'explore' ? 'fun' : a
    for (const it of this.s.plan.items) {
      if (it.status !== 'pending') continue
      if (it.hour < h - 3.5) it.status = 'skipped'
    }
    const match = this.s.plan.items.find(
      (it) =>
        it.status === 'pending' &&
        family(it.action) === family(action) &&
        it.hour <= h + 2.5 &&
        (!it.placeId || it.placeId === placeId || it.action !== 'trip'),
    )
    if (match) match.status = 'done'
  }
}
