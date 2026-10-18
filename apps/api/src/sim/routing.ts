import type { Db } from '@mapcar/db'
import { type LngLat, routeKey, straightRoute, type World, type WorldRoute } from '@mapcar/sim'
import type { FastifyBaseLogger } from 'fastify'

interface OsrmResponse {
  code: string
  routes?: { distance: number; duration: number; geometry: { coordinates: LngLat[] } }[]
}

/**
 * Gerçek yol rotalarını OSRM'den çeker ve veritabanında önbellekler.
 * Ortak demo sunucusunun kullanım kuralı gereği istekler sıraya alınır (~1 istek/sn).
 */
export class RouteService {
  private queue: { from: string; to: string }[] = []
  private inflight = new Set<string>()
  private running = false

  constructor(
    private readonly db: Db,
    private readonly world: World,
    private readonly log: FastifyBaseLogger,
    private readonly osrmUrl: string | undefined,
    private readonly onRoute: (route: WorldRoute) => void,
  ) {}

  request(from: string, to: string) {
    const key = routeKey(from, to)
    if (this.world.routes.has(key) || this.inflight.has(key)) return
    this.inflight.add(key)
    this.queue.push({ from, to })
    void this.drain()
  }

  private async drain() {
    if (this.running) return
    this.running = true
    try {
      while (this.queue.length) {
        const job = this.queue.shift()!
        const key = routeKey(job.from, job.to)
        try {
          const route = await this.resolve(job.from, job.to)
          this.world.routes.set(key, route)
          this.onRoute(route)
        } catch (err) {
          this.log.warn({ err, key }, 'rota alınamadı')
        } finally {
          this.inflight.delete(key)
        }
        if (this.osrmUrl && this.queue.length) await new Promise((r) => setTimeout(r, 1100))
      }
    } finally {
      this.running = false
    }
  }

  private async resolve(fromId: string, toId: string): Promise<WorldRoute> {
    const from = this.world.places.find((p) => p.id === fromId)
    const to = this.world.places.find((p) => p.id === toId)
    if (!from || !to) throw new Error('yer bulunamadı')

    let route: WorldRoute | null = null
    let source = 'straight'
    if (this.osrmUrl) {
      try {
        route = await this.fetchOsrm(from.lng, from.lat, to.lng, to.lat, fromId, toId)
        source = 'osrm'
      } catch (err) {
        this.log.warn({ err }, 'OSRM başarısız, düz çizgiye düşülüyor')
      }
    }
    route ??= straightRoute(from, to)

    await this.db.route.upsert({
      where: { fromPlaceId_toPlaceId: { fromPlaceId: fromId, toPlaceId: toId } },
      create: {
        fromPlaceId: fromId,
        toPlaceId: toId,
        geometry: route.geometry,
        distanceM: route.distanceM,
        durationS: route.durationS,
        source,
      },
      update: {
        geometry: route.geometry,
        distanceM: route.distanceM,
        durationS: route.durationS,
        source,
      },
    })
    return route
  }

  private async fetchOsrm(
    lng1: number,
    lat1: number,
    lng2: number,
    lat2: number,
    fromPlaceId: string,
    toPlaceId: string,
  ): Promise<WorldRoute> {
    const url = `${this.osrmUrl}/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'user-agent': 'mapcar-sim (github.com/Calpimm/mapcar)' },
    })
    if (!res.ok) throw new Error(`OSRM ${res.status}`)
    const body = (await res.json()) as OsrmResponse
    const r = body.routes?.[0]
    if (body.code !== 'Ok' || !r) throw new Error(`OSRM ${body.code}`)
    // Başlangıç ve bitişi tam olarak mekana bağla (yol ağına yapışma farkını kapatır)
    const geometry: LngLat[] = [[lng1, lat1], ...r.geometry.coordinates, [lng2, lat2]]
    return { fromPlaceId, toPlaceId, geometry, distanceM: r.distance, durationS: r.duration }
  }
}
