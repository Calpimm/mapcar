import type { Db } from '@mapcar/db'
import { type LngLat, routeKey, type World, type WorldRoute } from '@mapcar/sim'

export const HOME_CITY = 'Gazimağusa'

export async function loadWorld(db: Db): Promise<World> {
  const [places, jobs, carModels, routes] = await Promise.all([
    db.place.findMany({ where: { active: true } }),
    db.job.findMany({ where: { active: true } }),
    db.carModel.findMany({ where: { active: true } }),
    db.route.findMany(),
  ])
  const map = new Map<string, WorldRoute>()
  for (const r of routes)
    map.set(routeKey(r.fromPlaceId, r.toPlaceId), {
      fromPlaceId: r.fromPlaceId,
      toPlaceId: r.toPlaceId,
      geometry: r.geometry as LngLat[],
      distanceM: r.distanceM,
      durationS: r.durationS,
    })
  return {
    homeCity: HOME_CITY,
    places: places.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category,
      city: p.city,
      lat: p.lat,
      lng: p.lng,
      priceLevel: p.priceLevel,
      quality: p.quality,
      openHour: p.openHour,
      closeHour: p.closeHour,
    })),
    jobs: jobs.map((j) => ({
      id: j.id,
      slug: j.slug,
      title: j.title,
      placeId: j.placeId,
      hourlyWage: j.hourlyWage,
      shiftStart: j.shiftStart,
      shiftEnd: j.shiftEnd,
      workDays: j.workDays,
      minLevel: j.minLevel,
    })),
    carModels: carModels.map((c) => ({
      id: c.id,
      slug: c.slug,
      brand: c.brand,
      model: c.model,
      year: c.year,
      price: c.price,
      fuelPer100Km: c.fuelPer100Km,
      tankLiters: c.tankLiters,
      comfort: c.comfort,
      cruiseKmh: c.cruiseKmh,
      color: c.color,
    })),
    routes: map,
  }
}
