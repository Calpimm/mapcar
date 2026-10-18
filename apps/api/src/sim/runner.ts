import { randomUUID } from 'node:crypto'
import type { FeedEvent, LiveSnapshot, Route, SimSettings, StreamMessage } from '@mapcar/contracts'
import { type Db, type Prisma, seedData } from '@mapcar/db'
import {
  type AgentState,
  advance,
  createInitialState,
  describeActivity,
  type Effect,
  indexWorld,
  invalidateWorldIndex,
  LEVEL_XP,
  moodOf,
  routeKey,
  toDate,
  type World,
} from '@mapcar/sim'
import type { FastifyBaseLogger } from 'fastify'
import { RouteService } from './routing'
import { loadWorld } from './world'

type Listener = (msg: StreamMessage) => void

const SAVE_EVERY_TICKS = 5

export class SimRunner {
  world!: World
  state!: AgentState
  agentId!: string
  settings: SimSettings = { paused: false, driveRate: 0.35, activityRate: 8 }

  private routes!: RouteService
  private listeners = new Set<Listener>()
  private timer: NodeJS.Timeout | null = null
  private ticks = 0
  private currentRouteKey: string | null = null
  private writeChain: Promise<void> = Promise.resolve()
  private bio = ''

  constructor(
    private readonly db: Db,
    private readonly log: FastifyBaseLogger,
    private readonly opts: { osrmUrl?: string; tickMs: number },
  ) {}

  // ----- yaşam döngüsü -------------------------------------------------------

  async init() {
    this.world = await loadWorld(this.db)
    if (!this.world.places.length) throw new Error('Dünya boş. Önce `pnpm db:seed` çalıştırın.')
    this.routes = new RouteService(this.db, this.world, this.log, this.opts.osrmUrl, (route) => {
      if (this.currentRouteKey === routeKey(route.fromPlaceId, route.toPlaceId))
        this.broadcastRoute()
    })
    const settings = await this.db.simSettings.upsert({ where: { id: 1 }, create: {}, update: {} })
    this.settings = {
      paused: settings.paused,
      driveRate: settings.driveRate,
      activityRate: settings.activityRate,
    }

    const agent = await this.db.agent.findFirst({ orderBy: { createdAt: 'asc' } })
    if (agent) {
      this.agentId = agent.id
      this.bio = agent.bio
      this.state = agent.state as unknown as AgentState
    } else {
      await this.bootstrap()
    }
    this.log.info({ agent: this.state.name, day: this.state.day }, 'simülasyon hazır')
  }

  start() {
    if (this.timer) return
    this.timer = setInterval(() => this.tick(), this.opts.tickMs)
  }

  async stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    await this.save()
    await this.writeChain
  }

  private async bootstrap() {
    const cfg = seedData.agent
    const [home, job, car] = await Promise.all([
      this.db.place.findUniqueOrThrow({ where: { slug: cfg.home } }),
      this.db.job.findUnique({ where: { slug: cfg.job } }),
      this.db.carModel.findUnique({ where: { slug: cfg.car } }),
    ])
    const state = createInitialState(this.world, {
      name: cfg.name,
      homePlaceId: home.id,
      jobId: job?.id ?? null,
      carModelId: car?.id ?? null,
      seed: Math.floor(Math.random() * 2 ** 31),
    })
    const agent = await this.db.agent.create({
      data: {
        name: cfg.name,
        bio: cfg.bio,
        jobId: job?.id,
        state: state as unknown as Prisma.InputJsonValue,
        simTime: toDate(state.clock),
      },
    })
    if (car && state.car) {
      const owned = await this.db.ownedCar.create({
        data: {
          agentId: agent.id,
          carModelId: car.id,
          purchasePrice: car.price,
          purchasedAt: toDate(state.clock),
        },
      })
      state.car.ownedCarId = owned.id
    }
    this.agentId = agent.id
    this.bio = agent.bio
    this.state = state
    this.ticks = 0
    // createInitialState içindeki hedefleri kaydet
    await this.db.goal.createMany({
      data: state.goals.map((g) => ({
        id: this.goalDbId(g.id),
        agentId: agent.id,
        kind: g.kind,
        title: g.title,
        targetAmount: g.targetAmount,
        createdAt: toDate(g.createdAt),
      })),
    })
    await this.save()
  }

  // ----- tick ----------------------------------------------------------------

  private tick() {
    if (this.settings.paused) return
    let result: ReturnType<typeof advance>
    try {
      result = advance(this.state, this.world, this.opts.tickMs / 1000, this.settings)
    } catch (err) {
      this.log.error({ err }, 'simülasyon adımı başarısız')
      return
    }
    this.state = result.state
    this.ticks++

    const feed: FeedEvent[] = []
    for (const e of result.effects) {
      if (e.kind === 'need_route') this.routes.request(e.fromPlaceId, e.toPlaceId)
      if (e.kind === 'event') feed.push(this.toFeed(e))
    }
    this.enqueue(result.effects, feed)

    const key = this.activeRouteKey()
    if (key !== this.currentRouteKey) {
      this.currentRouteKey = key
      this.broadcastRoute()
    }
    for (const f of feed) this.broadcast({ type: 'event', data: f })
    this.broadcast({ type: 'snapshot', data: this.snapshot() })

    if (this.ticks % SAVE_EVERY_TICKS === 0) void this.save()
  }

  private activeRouteKey() {
    const a = this.state.activity
    const d = a.kind === 'driving' ? a : a.kind === 'stopped' ? a.resume : null
    return d ? routeKey(d.fromPlaceId, d.toPlaceId) : null
  }

  // ----- kalıcılık -------------------------------------------------------------

  private goalDbId(id: string) {
    return `${this.agentId}:${id}`
  }

  private save() {
    const { agentId, state } = this
    return this.chain(async () => {
      await this.db.agent.update({
        where: { id: agentId },
        data: {
          state: state as unknown as Prisma.InputJsonValue,
          simTime: toDate(state.clock),
          jobId: state.jobId,
        },
      })
    })
  }

  private chain(fn: () => Promise<void>) {
    this.writeChain = this.writeChain
      .then(fn)
      .catch((err) => this.log.error({ err }, 'kayıt hatası'))
    return this.writeChain
  }

  private enqueue(effects: Effect[], feed: FeedEvent[]) {
    if (!effects.length) return
    const agentId = this.agentId
    this.chain(async () => {
      const events: Prisma.EventCreateManyInput[] = []
      const txs: Prisma.TransactionCreateManyInput[] = []
      const reviews: Prisma.ReviewCreateManyInput[] = []
      let feedIdx = 0
      for (const e of effects) {
        switch (e.kind) {
          case 'event': {
            const f = feed[feedIdx++]!
            events.push({
              id: f.id,
              agentId,
              type: e.type,
              message: e.message,
              placeId: e.placeId,
              data: (e.data ?? undefined) as Prisma.InputJsonValue | undefined,
              lng: e.position[0],
              lat: e.position[1],
              simTime: toDate(e.at),
            })
            break
          }
          case 'transaction':
            txs.push({
              agentId,
              amount: Math.round(e.amount),
              category: e.category,
              description: e.description,
              placeId: e.placeId,
              balance: Math.round(e.balance),
              simTime: toDate(e.at),
            })
            break
          case 'review':
            reviews.push({
              agentId,
              placeId: e.placeId,
              rating: e.rating,
              comment: e.comment,
              spent: Math.round(e.spent),
              simTime: toDate(e.at),
            })
            break
          case 'car_bought':
            await this.recordCarPurchase(e)
            break
          case 'job':
            await this.db.agent.update({ where: { id: agentId }, data: { jobId: e.jobId } })
            break
          case 'goal': {
            const id = this.goalDbId(e.goal.id)
            const status = e.goal.status === 'done' ? 'DONE' : 'ACTIVE'
            await this.db.goal.upsert({
              where: { id },
              create: {
                id,
                agentId,
                kind: e.goal.kind,
                title: e.goal.title,
                targetAmount: e.goal.targetAmount,
                status,
                createdAt: toDate(e.goal.createdAt),
                completedAt: status === 'DONE' ? toDate(e.at) : null,
              },
              update: { status, completedAt: status === 'DONE' ? toDate(e.at) : null },
            })
            break
          }
          case 'day_end':
            await this.db.dailySnapshot.upsert({
              where: { agentId_day: { agentId, day: e.day } },
              create: {
                agentId,
                day: e.day,
                date: toDate(e.day * 1440),
                money: Math.round(e.money),
                earned: Math.round(e.earned),
                spent: Math.round(e.spent),
                distanceKm: e.distanceKm,
                mood: e.mood,
              },
              update: {},
            })
            break
        }
      }
      if (events.length) await this.db.event.createMany({ data: events })
      if (txs.length) await this.db.transaction.createMany({ data: txs })
      if (reviews.length) await this.db.review.createMany({ data: reviews })
    })
  }

  private async recordCarPurchase(e: Extract<Effect, { kind: 'car_bought' }>) {
    const when = toDate(e.at)
    if (e.previousOwnedCarId)
      await this.db.ownedCar.update({
        where: { id: e.previousOwnedCarId },
        data: { soldAt: when, salePrice: e.salePrice, odometerKm: e.odometerKm },
      })
    const owned = await this.db.ownedCar.create({
      data: {
        agentId: this.agentId,
        carModelId: e.carModelId,
        purchasePrice: e.price,
        purchasedAt: when,
      },
    })
    // Durum bu arada ilerlemiş olabilir; aynı araba hâlâ bizdeyse kimliğini ata.
    if (this.state.car && this.state.car.modelId === e.carModelId && !this.state.car.ownedCarId)
      this.state.car.ownedCarId = owned.id
  }

  // ----- yayın -------------------------------------------------------------------

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    listener({ type: 'route', data: this.routePayload() })
    listener({ type: 'snapshot', data: this.snapshot() })
    return () => this.listeners.delete(listener)
  }

  get clientCount() {
    return this.listeners.size
  }

  private broadcast(msg: StreamMessage) {
    for (const l of this.listeners) {
      try {
        l(msg)
      } catch (err) {
        this.log.debug({ err }, 'dinleyici hatası')
      }
    }
  }

  private broadcastRoute() {
    this.broadcast({ type: 'route', data: this.routePayload() })
  }

  routePayload(): Route | null {
    const key = this.currentRouteKey ?? this.activeRouteKey()
    if (!key) return null
    const r = this.world.routes.get(key)
    return r ? { key, geometry: r.geometry, distanceM: r.distanceM } : null
  }

  private toFeed(e: Extract<Effect, { kind: 'event' }>): FeedEvent {
    const place = e.placeId ? indexWorld(this.world).places.get(e.placeId) : undefined
    return {
      id: randomUUID(),
      type: e.type,
      message: e.message,
      placeId: e.placeId,
      placeName: place?.name ?? null,
      data: e.data ?? null,
      simTime: toDate(e.at).toISOString(),
    }
  }

  snapshot(): LiveSnapshot {
    const s = this.state
    const idx = indexWorld(this.world)
    const job = s.jobId ? idx.jobs.get(s.jobId) : undefined
    const jobPlace = job ? idx.places.get(job.placeId) : undefined
    const carModel = s.car ? idx.cars.get(s.car.modelId) : undefined
    const view = describeActivity(s, this.world)
    const a = s.activity
    const action =
      a.kind === 'driving' || a.kind === 'at' || a.kind === 'waiting_route'
        ? a.action
        : a.kind === 'stopped'
          ? a.resume.action
          : null
    const level = s.career.level
    return {
      paused: this.settings.paused,
      clock: s.clock,
      date: toDate(s.clock).toISOString(),
      day: s.day,
      agent: {
        name: s.name,
        bio: this.bio,
        money: Math.round(s.money),
        needs: s.needs,
        mood: moodOf(s.needs),
        pantry: s.pantry,
        level,
        xp: s.career.xp,
        levelXp: LEVEL_XP[level] ?? 0,
        nextLevelXp: LEVEL_XP[level + 1] ?? null,
        job:
          job && jobPlace
            ? {
                title: job.title,
                placeId: job.placeId,
                placeName: jobPlace.name,
                hourlyWage: job.hourlyWage,
              }
            : null,
      },
      car:
        s.car && carModel
          ? {
              model: carModel,
              fuelPct: s.car.fuel / carModel.tankLiters,
              condition: s.car.condition,
              odometerKm: s.car.odometerKm,
            }
          : null,
      position: s.position,
      heading: s.heading,
      activity: {
        ...view,
        action,
        speedKmh: a.kind === 'driving' ? (a.speed * 60) / 1000 : null,
      },
      routeKey: this.currentRouteKey,
      plan: s.plan.items,
      goals: s.goals.map(({ id, kind, title, progress, target, status }) => ({
        id,
        kind,
        title,
        progress,
        target,
        status,
      })),
      stats: s.stats,
    }
  }

  // ----- admin ---------------------------------------------------------------------

  async updateSettings(next: Partial<SimSettings>) {
    const saved = await this.db.simSettings.update({ where: { id: 1 }, data: next })
    this.settings = {
      paused: saved.paused,
      driveRate: saved.driveRate,
      activityRate: saved.activityRate,
    }
    this.broadcast({ type: 'snapshot', data: this.snapshot() })
    return this.settings
  }

  async reloadWorld() {
    const routes = this.world.routes
    const fresh = await loadWorld(this.db)
    for (const [k, v] of routes) if (!fresh.routes.has(k)) fresh.routes.set(k, v)
    // Aynı nesneyi koru (RouteService referans tutuyor)
    this.world.places = fresh.places
    this.world.jobs = fresh.jobs
    this.world.carModels = fresh.carModels
    for (const [k, v] of fresh.routes) this.world.routes.set(k, v)
    invalidateWorldIndex(this.world)
  }

  async adjust(input: {
    money?: number
    needs?: Partial<AgentState['needs']>
    teleportPlaceId?: string
    reason?: string
  }) {
    const s = structuredClone(this.state)
    const effects: Effect[] = []
    const note = (message: string, placeId: string | null = null) =>
      effects.push({
        kind: 'event',
        type: 'incident',
        message,
        placeId,
        at: s.clock,
        position: [...s.position] as [number, number],
      })

    if (input.money) {
      s.money += input.money
      const reason =
        input.reason ?? (input.money > 0 ? 'Gökten para yağdı' : 'Beklenmedik bir masraf çıktı')
      effects.push({
        kind: 'transaction',
        amount: input.money,
        category: 'GIFT',
        description: reason,
        placeId: null,
        balance: s.money,
        at: s.clock,
      })
      note(
        `${reason}: ${input.money > 0 ? '+' : '−'}${Math.abs(input.money).toLocaleString('tr-TR')} ₺`,
      )
    }
    if (input.needs) {
      Object.assign(s.needs, input.needs)
      note('Garip bir his... bir anda bambaşka hissetti.')
    }
    if (input.teleportPlaceId) {
      const p = indexWorld(this.world).places.get(input.teleportPlaceId)
      if (!p) throw new Error('Yer bulunamadı')
      s.position = [p.lng, p.lat]
      s.activity = { kind: 'idle', placeId: p.id }
      note('Göz açıp kapayıncaya kadar kendini burada buldu.', p.id)
      this.currentRouteKey = null
      this.broadcastRoute()
    }
    this.state = s
    const feed = effects.flatMap((e) => (e.kind === 'event' ? [this.toFeed(e)] : []))
    this.enqueue(effects, feed)
    for (const f of feed) this.broadcast({ type: 'event', data: f })
    await this.save()
    this.broadcast({ type: 'snapshot', data: this.snapshot() })
  }

  async reset() {
    const wasRunning = !!this.timer
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    await this.writeChain
    await this.db.agent.deleteMany({})
    await this.bootstrap()
    this.currentRouteKey = null
    this.broadcastRoute()
    this.broadcast({ type: 'snapshot', data: this.snapshot() })
    if (wasRunning) this.start()
  }

  async clearRoutes() {
    await this.db.route.deleteMany({})
    this.world.routes.clear()
  }
}
