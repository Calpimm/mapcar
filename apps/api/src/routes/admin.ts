import {
  adminCarModel,
  adminJob,
  adminOverview,
  adminPlace,
  agentAdjust,
  carModelInput,
  feedEvent,
  jobInput,
  page,
  placeInput,
  simSettings,
} from '@mapcar/contracts'
import { Prisma } from '@mapcar/db'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { bearerGuard } from '../lib/auth'

const idParam = z.object({ id: z.string() })
const message = z.object({ message: z.string() })
const ok = z.object({ ok: z.literal(true) })

export const adminRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db, sim } = app
  app.addHook('onRequest', bearerGuard(app.env.ADMIN_API_TOKEN))
  app.addHook('onRoute', (opts) => {
    opts.schema = { ...opts.schema, tags: ['admin'], security: [{ admin: [] }] }
  })

  // Benzersizlik ihlallerini anlaşılır bir 409'a çevir
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002')
        return reply.code(409).send({ message: 'Bu slug zaten kullanılıyor' })
      if (err.code === 'P2025') return reply.code(404).send({ message: 'Kayıt bulunamadı' })
      if (err.code === 'P2003')
        return reply.code(409).send({ message: 'Bu kayıt başka kayıtlarda kullanılıyor' })
    }
    reply.send(err)
  })

  // ----- genel bakış & ayarlar ------------------------------------------------

  app.get('/overview', { schema: { response: { 200: adminOverview } } }, async () => {
    const agentId = sim.agentId
    const [places, cars, jobs, events, reviews, transactions, routes] = await Promise.all([
      db.place.count(),
      db.carModel.count(),
      db.job.count(),
      db.event.count({ where: { agentId } }),
      db.review.count({ where: { agentId } }),
      db.transaction.count({ where: { agentId } }),
      db.route.count(),
    ])
    return {
      settings: sim.settings,
      counts: { places, cars, jobs, events, reviews, transactions, routes },
      live: sim.snapshot(),
      clients: sim.clientCount,
    }
  })

  app.patch(
    '/settings',
    { schema: { body: simSettings.partial(), response: { 200: simSettings } } },
    async (req) => sim.updateSettings(req.body),
  )

  app.post(
    '/agent/adjust',
    { schema: { body: agentAdjust, response: { 200: ok, 400: message } } },
    async (req, reply) => {
      try {
        await sim.adjust(req.body)
        return { ok: true as const }
      } catch (err) {
        return reply.code(400).send({ message: (err as Error).message })
      }
    },
  )

  app.post('/agent/reset', { schema: { response: { 200: ok } } }, async () => {
    await sim.reset()
    return { ok: true as const }
  })

  app.delete('/routes', { schema: { response: { 200: ok } } }, async () => {
    await sim.clearRoutes()
    return { ok: true as const }
  })

  app.get(
    '/events',
    {
      schema: {
        querystring: z.object({
          limit: z.coerce.number().int().min(1).max(200).default(50),
          cursor: z.string().optional(),
          type: z.string().optional(),
        }),
        response: { 200: page(feedEvent) },
      },
    },
    async (req) => {
      const { limit, cursor, type } = req.query
      const rows = await db.event.findMany({
        where: { agentId: sim.agentId, ...(type ? { type } : {}) },
        orderBy: [{ simTime: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: { place: { select: { name: true } } },
      })
      const items = rows.slice(0, limit)
      return {
        items: items.map((e) => ({
          id: e.id,
          type: e.type,
          message: e.message,
          placeId: e.placeId,
          placeName: e.place?.name ?? null,
          data: (e.data as Record<string, unknown> | null) ?? null,
          simTime: e.simTime.toISOString(),
        })),
        nextCursor: rows.length > limit ? items[items.length - 1]!.id : null,
      }
    },
  )

  // ----- yerler ------------------------------------------------------------------

  const toAdminPlace = (
    p: Prisma.PlaceGetPayload<{ include: { _count: { select: { reviews: true } } } }>,
  ) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    description: p.description,
    city: p.city,
    lat: p.lat,
    lng: p.lng,
    priceLevel: p.priceLevel,
    quality: p.quality,
    openHour: p.openHour,
    closeHour: p.closeHour,
    active: p.active,
    reviewCount: p._count.reviews,
  })
  const placeInclude = { _count: { select: { reviews: true } } } as const

  app.get('/places', { schema: { response: { 200: z.array(adminPlace) } } }, async () =>
    (
      await db.place.findMany({
        orderBy: [{ city: 'asc' }, { name: 'asc' }],
        include: placeInclude,
      })
    ).map(toAdminPlace),
  )

  app.post(
    '/places',
    { schema: { body: placeInput, response: { 201: adminPlace } } },
    async (req, reply) => {
      const p = await db.place.create({ data: req.body, include: placeInclude })
      await sim.reloadWorld()
      return reply.code(201).send(toAdminPlace(p))
    },
  )

  app.put(
    '/places/:id',
    { schema: { params: idParam, body: placeInput, response: { 200: adminPlace } } },
    async (req) => {
      const p = await db.place.update({
        where: { id: req.params.id },
        data: req.body,
        include: placeInclude,
      })
      // Yer taşındıysa eski rotalar geçersiz
      await db.route.deleteMany({ where: { OR: [{ fromPlaceId: p.id }, { toPlaceId: p.id }] } })
      for (const key of [...sim.world.routes.keys()])
        if (key.includes(p.id)) sim.world.routes.delete(key)
      await sim.reloadWorld()
      return toAdminPlace(p)
    },
  )

  app.delete(
    '/places/:id',
    { schema: { params: idParam, response: { 200: ok, 409: message } } },
    async (req, reply) => {
      const id = req.params.id
      const s = sim.state
      const a = s.activity
      const busy =
        s.homePlaceId === id ||
        (a.kind === 'idle' && a.placeId === id) ||
        (a.kind === 'at' && a.placeId === id) ||
        ((a.kind === 'driving' || a.kind === 'waiting_route') &&
          (a.toPlaceId === id || a.fromPlaceId === id))
      if (busy)
        return reply
          .code(409)
          .send({ message: 'Deniz şu an bu yeri kullanıyor; önce pasife alın.' })
      await db.place.delete({ where: { id } })
      await sim.reloadWorld()
      return { ok: true as const }
    },
  )

  // ----- arabalar ------------------------------------------------------------------

  const stripCar = ({ createdAt, updatedAt, ...c }: Prisma.CarModelGetPayload<object>) => c

  app.get('/cars', { schema: { response: { 200: z.array(adminCarModel) } } }, async () =>
    (await db.carModel.findMany({ orderBy: { price: 'asc' } })).map(stripCar),
  )
  app.post(
    '/cars',
    { schema: { body: carModelInput, response: { 201: adminCarModel } } },
    async (req, reply) => {
      const c = await db.carModel.create({ data: req.body })
      await sim.reloadWorld()
      return reply.code(201).send(stripCar(c))
    },
  )
  app.put(
    '/cars/:id',
    { schema: { params: idParam, body: carModelInput, response: { 200: adminCarModel } } },
    async (req) => {
      const c = await db.carModel.update({ where: { id: req.params.id }, data: req.body })
      await sim.reloadWorld()
      return stripCar(c)
    },
  )
  app.delete(
    '/cars/:id',
    { schema: { params: idParam, response: { 200: ok, 409: message } } },
    async (req, reply) => {
      if (sim.state.car?.modelId === req.params.id)
        return reply.code(409).send({ message: 'Deniz şu an bu arabayı kullanıyor.' })
      await db.carModel.delete({ where: { id: req.params.id } })
      await sim.reloadWorld()
      return { ok: true as const }
    },
  )

  // ----- işler -------------------------------------------------------------------------

  const toAdminJob = (
    j: Prisma.JobGetPayload<{ include: { place: { select: { name: true } } } }>,
  ) => {
    const { createdAt, updatedAt, place, ...rest } = j
    return { ...rest, placeName: place.name }
  }
  const jobInclude = { place: { select: { name: true } } } as const

  app.get('/jobs', { schema: { response: { 200: z.array(adminJob) } } }, async () =>
    (
      await db.job.findMany({
        orderBy: [{ minLevel: 'asc' }, { hourlyWage: 'asc' }],
        include: jobInclude,
      })
    ).map(toAdminJob),
  )
  app.post(
    '/jobs',
    { schema: { body: jobInput, response: { 201: adminJob } } },
    async (req, reply) => {
      const j = await db.job.create({ data: req.body, include: jobInclude })
      await sim.reloadWorld()
      return reply.code(201).send(toAdminJob(j))
    },
  )
  app.put(
    '/jobs/:id',
    { schema: { params: idParam, body: jobInput, response: { 200: adminJob } } },
    async (req) => {
      const j = await db.job.update({
        where: { id: req.params.id },
        data: req.body,
        include: jobInclude,
      })
      await sim.reloadWorld()
      return toAdminJob(j)
    },
  )
  app.delete(
    '/jobs/:id',
    { schema: { params: idParam, response: { 200: ok, 409: message } } },
    async (req, reply) => {
      if (sim.state.jobId === req.params.id)
        return reply.code(409).send({ message: 'Deniz şu an bu işte çalışıyor.' })
      await db.job.delete({ where: { id: req.params.id } })
      await sim.reloadWorld()
      return { ok: true as const }
    },
  )
}
