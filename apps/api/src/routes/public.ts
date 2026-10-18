import {
  feedEvent,
  finance,
  garage,
  liveSnapshot,
  type Place,
  page,
  placeDetail,
  review,
  route,
  world,
} from '@mapcar/contracts'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

const pageQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().optional(),
})

const iso = (d: Date) => d.toISOString()

export const publicRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db, sim } = app

  async function ratings() {
    const rows = await db.review.groupBy({
      by: ['placeId'],
      where: { agentId: sim.agentId },
      _avg: { rating: true },
      _count: { _all: true },
    })
    return new Map(rows.map((r) => [r.placeId, { rating: r._avg.rating, count: r._count._all }]))
  }

  function toPlace(
    p: {
      id: string
      slug: string
      name: string
      category: Place['category']
      description: string
      city: string
      lat: number
      lng: number
      priceLevel: number
      openHour: number
      closeHour: number
    },
    r?: { rating: number | null; count: number },
  ): Place {
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category,
      description: p.description,
      city: p.city,
      lat: p.lat,
      lng: p.lng,
      priceLevel: p.priceLevel,
      openHour: p.openHour,
      closeHour: p.closeHour,
      rating: r?.rating ?? null,
      reviewCount: r?.count ?? 0,
      visits: sim.state.memory[p.id]?.visits ?? 0,
    }
  }

  app.get(
    '/live',
    { schema: { tags: ['canlı'], summary: 'Anlık durum', response: { 200: liveSnapshot } } },
    async () => sim.snapshot(),
  )

  app.get(
    '/live/route',
    {
      schema: {
        tags: ['canlı'],
        summary: 'Şu an sürülen rota',
        response: { 200: route.nullable() },
      },
    },
    async () => sim.routePayload(),
  )

  app.get(
    '/world',
    { schema: { tags: ['dünya'], summary: 'Tüm yerler ve puanları', response: { 200: world } } },
    async () => {
      const [places, r] = await Promise.all([
        db.place.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
        ratings(),
      ])
      const cities = [...new Set(places.map((p) => p.city))].sort((a, b) =>
        a.localeCompare(b, 'tr'),
      )
      return {
        places: places.map((p) => toPlace(p, r.get(p.id))),
        cities,
        homeCity: sim.world.homeCity,
      }
    },
  )

  app.get(
    '/places/:slug',
    {
      schema: {
        tags: ['dünya'],
        summary: 'Yer detayı ve yorumları',
        params: z.object({ slug: z.string() }),
        response: { 200: placeDetail, 404: z.object({ message: z.string() }) },
      },
    },
    async (req, reply) => {
      const p = await db.place.findUnique({ where: { slug: req.params.slug } })
      if (!p) return reply.code(404).send({ message: 'Yer bulunamadı' })
      const [reviews, agg, spent] = await Promise.all([
        db.review.findMany({
          where: { placeId: p.id, agentId: sim.agentId },
          orderBy: { simTime: 'desc' },
          take: 50,
        }),
        db.review.groupBy({
          by: ['rating'],
          where: { placeId: p.id, agentId: sim.agentId },
          _count: { _all: true },
        }),
        db.transaction.aggregate({
          where: { placeId: p.id, agentId: sim.agentId, amount: { lt: 0 } },
          _sum: { amount: true },
        }),
      ])
      const histogram = [0, 0, 0, 0, 0]
      let total = 0
      let count = 0
      for (const g of agg) {
        histogram[g.rating - 1] = g._count._all
        total += g.rating * g._count._all
        count += g._count._all
      }
      const placeRef = { id: p.id, slug: p.slug, name: p.name, category: p.category, city: p.city }
      return {
        place: toPlace(p, { rating: count ? total / count : null, count }),
        reviews: reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          spent: r.spent,
          simTime: iso(r.simTime),
          place: placeRef,
        })),
        ratingHistogram: histogram,
        totalSpent: -(spent._sum.amount ?? 0),
      }
    },
  )

  app.get(
    '/reviews',
    {
      schema: {
        tags: ['günlük'],
        summary: 'Son yorumlar',
        querystring: pageQuery,
        response: { 200: page(review) },
      },
    },
    async (req) => {
      const { limit, cursor } = req.query
      const rows = await db.review.findMany({
        where: { agentId: sim.agentId },
        orderBy: [{ simTime: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          place: { select: { id: true, slug: true, name: true, category: true, city: true } },
        },
      })
      const items = rows.slice(0, limit)
      return {
        items: items.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          spent: r.spent,
          simTime: iso(r.simTime),
          place: r.place,
        })),
        nextCursor: rows.length > limit ? items[items.length - 1]!.id : null,
      }
    },
  )

  app.get(
    '/events',
    {
      schema: {
        tags: ['günlük'],
        summary: 'Olay akışı (günlük)',
        querystring: pageQuery.extend({ type: z.string().optional() }),
        response: { 200: page(feedEvent) },
      },
    },
    async (req) => {
      const { limit, cursor, type } = req.query
      const rows = await db.event.findMany({
        where: { agentId: sim.agentId, ...(type ? { type: { in: type.split(',') } } : {}) },
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
          simTime: iso(e.simTime),
        })),
        nextCursor: rows.length > limit ? items[items.length - 1]!.id : null,
      }
    },
  )

  app.get(
    '/finance',
    { schema: { tags: ['istatistik'], summary: 'Para durumu', response: { 200: finance } } },
    async () => {
      const agentId = sim.agentId
      const [days, byCategory, recent] = await Promise.all([
        db.dailySnapshot.findMany({ where: { agentId }, orderBy: { day: 'asc' }, take: 365 }),
        db.transaction.groupBy({ by: ['category'], where: { agentId }, _sum: { amount: true } }),
        db.transaction.findMany({
          where: { agentId },
          orderBy: [{ simTime: 'desc' }, { id: 'desc' }],
          take: 40,
          include: { place: { select: { name: true } } },
        }),
      ])
      return {
        days: days.map((d) => ({
          day: d.day,
          date: iso(d.date),
          money: d.money,
          earned: d.earned,
          spent: d.spent,
          distanceKm: d.distanceKm,
          mood: d.mood,
        })),
        byCategory: byCategory.map((c) => ({ category: c.category, total: c._sum.amount ?? 0 })),
        recent: recent.map((t) => ({
          id: t.id,
          amount: t.amount,
          category: t.category,
          description: t.description,
          balance: t.balance,
          simTime: iso(t.simTime),
          placeName: t.place?.name ?? null,
        })),
      }
    },
  )

  app.get(
    '/garage',
    {
      schema: {
        tags: ['istatistik'],
        summary: 'Araba geçmişi ve galeri',
        response: { 200: garage },
      },
    },
    async () => {
      const [owned, dealer] = await Promise.all([
        db.ownedCar.findMany({
          where: { agentId: sim.agentId },
          orderBy: { purchasedAt: 'desc' },
          include: { carModel: true },
        }),
        db.carModel.findMany({ where: { active: true }, orderBy: { price: 'asc' } }),
      ])
      const strip = <T extends { createdAt: Date; updatedAt: Date; active: boolean }>({
        createdAt,
        updatedAt,
        active,
        ...rest
      }: T) => rest
      const live = sim.state.car
      return {
        owned: owned.map((o) => ({
          id: o.id,
          model: strip(o.carModel),
          purchasePrice: o.purchasePrice,
          salePrice: o.salePrice,
          odometerKm: live?.ownedCarId === o.id ? live.odometerKm : o.odometerKm,
          purchasedAt: iso(o.purchasedAt),
          soldAt: o.soldAt ? iso(o.soldAt) : null,
        })),
        dealer: dealer.map(strip),
      }
    },
  )
}
