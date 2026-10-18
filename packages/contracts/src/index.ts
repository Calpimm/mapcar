import { z } from 'zod'

// ---------------------------------------------------------------------------
// Temel parçalar
// ---------------------------------------------------------------------------

export const placeCategory = z.enum([
  'HOME',
  'WORK',
  'RESTAURANT',
  'CAFE',
  'FAST_FOOD',
  'BAR',
  'BEACH',
  'LANDMARK',
  'PARK',
  'MARKET',
  'MALL',
  'GAS_STATION',
  'CAR_DEALER',
  'MECHANIC',
  'GYM',
])
export type PlaceCategory = z.infer<typeof placeCategory>

export const txCategory = z.enum([
  'SALARY',
  'BONUS',
  'FOOD',
  'GROCERY',
  'FUEL',
  'LEISURE',
  'CAR_PURCHASE',
  'CAR_SALE',
  'REPAIR',
  'RENT',
  'GIFT',
])
export type TxCategory = z.infer<typeof txCategory>

const lngLat = z.tuple([z.number(), z.number()])

export const needs = z.object({
  hunger: z.number(),
  energy: z.number(),
  fun: z.number(),
  social: z.number(),
})

export const place = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  category: placeCategory,
  description: z.string(),
  city: z.string(),
  lat: z.number(),
  lng: z.number(),
  priceLevel: z.number().int(),
  openHour: z.number().int(),
  closeHour: z.number().int(),
  rating: z.number().nullable(),
  reviewCount: z.number().int(),
  visits: z.number().int(),
})
export type Place = z.infer<typeof place>

export const carModel = z.object({
  id: z.string(),
  slug: z.string(),
  brand: z.string(),
  model: z.string(),
  year: z.number().int(),
  price: z.number().int(),
  fuelPer100Km: z.number(),
  tankLiters: z.number(),
  comfort: z.number(),
  cruiseKmh: z.number().int(),
  color: z.string(),
})
export type CarModel = z.infer<typeof carModel>

export const planItem = z.object({
  id: z.string(),
  hour: z.number(),
  action: z.string(),
  label: z.string(),
  placeId: z.string().nullable(),
  status: z.enum(['pending', 'done', 'skipped']),
})

export const goal = z.object({
  id: z.string(),
  kind: z.enum(['buy_car', 'career', 'explore']),
  title: z.string(),
  progress: z.number(),
  target: z.number(),
  status: z.enum(['active', 'done']),
})
export type Goal = z.infer<typeof goal>

// ---------------------------------------------------------------------------
// Canlı durum
// ---------------------------------------------------------------------------

export const liveSnapshot = z.object({
  paused: z.boolean(),
  clock: z.number(),
  date: z.string(),
  day: z.number().int(),
  agent: z.object({
    name: z.string(),
    bio: z.string(),
    money: z.number(),
    needs,
    mood: z.number(),
    pantry: z.number().int(),
    level: z.number().int(),
    xp: z.number(),
    levelXp: z.number(),
    nextLevelXp: z.number().nullable(),
    job: z
      .object({
        title: z.string(),
        placeId: z.string(),
        placeName: z.string(),
        hourlyWage: z.number(),
      })
      .nullable(),
  }),
  car: z
    .object({
      model: carModel,
      fuelPct: z.number(),
      condition: z.number(),
      odometerKm: z.number(),
    })
    .nullable(),
  position: lngLat,
  heading: z.number(),
  activity: z.object({
    kind: z.enum(['idle', 'waiting_route', 'driving', 'stopped', 'at']),
    action: z.string().nullable(),
    label: z.string(),
    placeId: z.string().nullable(),
    placeName: z.string().nullable(),
    progress: z.number().nullable(),
    endsAt: z.number().nullable(),
    speedKmh: z.number().nullable(),
  }),
  routeKey: z.string().nullable(),
  plan: z.array(planItem),
  goals: z.array(goal),
  stats: z.object({
    dayEarned: z.number(),
    daySpent: z.number(),
    dayDistanceKm: z.number(),
    totalDistanceKm: z.number(),
    totalEarned: z.number(),
    totalSpent: z.number(),
    meals: z.number(),
    reviews: z.number(),
  }),
})
export type LiveSnapshot = z.infer<typeof liveSnapshot>

export const route = z.object({
  key: z.string(),
  geometry: z.array(lngLat),
  distanceM: z.number(),
})
export type Route = z.infer<typeof route>

export const feedEvent = z.object({
  id: z.string(),
  type: z.string(),
  message: z.string(),
  placeId: z.string().nullable(),
  placeName: z.string().nullable(),
  data: z.record(z.string(), z.unknown()).nullable(),
  simTime: z.string(),
})
export type FeedEvent = z.infer<typeof feedEvent>

/** SSE mesajları */
export type StreamMessage =
  | { type: 'snapshot'; data: LiveSnapshot }
  | { type: 'route'; data: Route | null }
  | { type: 'event'; data: FeedEvent }

// ---------------------------------------------------------------------------
// REST yanıtları
// ---------------------------------------------------------------------------

export const world = z.object({
  places: z.array(place),
  cities: z.array(z.string()),
  homeCity: z.string(),
})
export type WorldResponse = z.infer<typeof world>

export const review = z.object({
  id: z.string(),
  rating: z.number().int(),
  comment: z.string(),
  spent: z.number().int(),
  simTime: z.string(),
  place: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    category: placeCategory,
    city: z.string(),
  }),
})
export type Review = z.infer<typeof review>

export const placeDetail = z.object({
  place,
  reviews: z.array(review),
  ratingHistogram: z.array(z.number().int()).length(5),
  totalSpent: z.number().int(),
})
export type PlaceDetail = z.infer<typeof placeDetail>

export const page = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), nextCursor: z.string().nullable() })

export const transaction = z.object({
  id: z.string(),
  amount: z.number().int(),
  category: txCategory,
  description: z.string(),
  balance: z.number().int(),
  simTime: z.string(),
  placeName: z.string().nullable(),
})
export type Transaction = z.infer<typeof transaction>

export const finance = z.object({
  days: z.array(
    z.object({
      day: z.number().int(),
      date: z.string(),
      money: z.number().int(),
      earned: z.number().int(),
      spent: z.number().int(),
      distanceKm: z.number(),
      mood: z.number(),
    }),
  ),
  byCategory: z.array(z.object({ category: txCategory, total: z.number().int() })),
  recent: z.array(transaction),
})
export type Finance = z.infer<typeof finance>

export const garage = z.object({
  owned: z.array(
    z.object({
      id: z.string(),
      model: carModel,
      purchasePrice: z.number().int(),
      salePrice: z.number().int().nullable(),
      odometerKm: z.number(),
      purchasedAt: z.string(),
      soldAt: z.string().nullable(),
    }),
  ),
  dealer: z.array(carModel),
})
export type Garage = z.infer<typeof garage>

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const simSettings = z.object({
  paused: z.boolean(),
  driveRate: z.number().min(0.05).max(10),
  activityRate: z.number().min(0.5).max(120),
})
export type SimSettings = z.infer<typeof simSettings>

export const adminOverview = z.object({
  settings: simSettings,
  counts: z.object({
    places: z.number().int(),
    cars: z.number().int(),
    jobs: z.number().int(),
    events: z.number().int(),
    reviews: z.number().int(),
    transactions: z.number().int(),
    routes: z.number().int(),
  }),
  live: liveSnapshot.nullable(),
  clients: z.number().int(),
})
export type AdminOverview = z.infer<typeof adminOverview>

export const placeInput = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Sadece küçük harf, rakam ve tire'),
  name: z.string().min(2),
  category: placeCategory,
  description: z.string().default(''),
  city: z.string().min(2),
  lat: z.number().min(34.5).max(35.8),
  lng: z.number().min(32.2).max(34.7),
  priceLevel: z.number().int().min(1).max(4),
  quality: z.number().min(0).max(1),
  openHour: z.number().int().min(0).max(24),
  closeHour: z.number().int().min(0).max(24),
  active: z.boolean().default(true),
})
export type PlaceInput = z.infer<typeof placeInput>

export const adminPlace = placeInput.extend({ id: z.string(), reviewCount: z.number().int() })
export type AdminPlace = z.infer<typeof adminPlace>

export const carModelInput = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/),
  brand: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1950).max(2030),
  price: z.number().int().min(1000),
  fuelPer100Km: z.number().min(0).max(30),
  tankLiters: z.number().min(10).max(150),
  comfort: z.number().min(0).max(1),
  cruiseKmh: z.number().int().min(20).max(200),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  active: z.boolean().default(true),
})
export type CarModelInput = z.infer<typeof carModelInput>
export const adminCarModel = carModelInput.extend({ id: z.string() })
export type AdminCarModel = z.infer<typeof adminCarModel>

export const jobInput = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/),
  title: z.string().min(2),
  placeId: z.string(),
  hourlyWage: z.number().int().min(1),
  shiftStart: z.number().int().min(0).max(23),
  shiftEnd: z.number().int().min(1).max(24),
  workDays: z.array(z.number().int().min(0).max(6)).min(1),
  minLevel: z.number().int().min(0).max(10),
  active: z.boolean().default(true),
})
export type JobInput = z.infer<typeof jobInput>
export const adminJob = jobInput.extend({ id: z.string(), placeName: z.string() })
export type AdminJob = z.infer<typeof adminJob>

export const agentAdjust = z.object({
  money: z.number().int().optional(),
  needs: needs.partial().optional(),
  teleportPlaceId: z.string().optional(),
  reason: z.string().max(120).optional(),
})
export type AgentAdjust = z.infer<typeof agentAdjust>

export const CATEGORY_LABEL: Record<PlaceCategory, string> = {
  HOME: 'Ev',
  WORK: 'İş yeri',
  RESTAURANT: 'Restoran',
  CAFE: 'Kafe',
  FAST_FOOD: 'Ayaküstü',
  BAR: 'Bar',
  BEACH: 'Plaj',
  LANDMARK: 'Tarihi yer',
  PARK: 'Park',
  MARKET: 'Market',
  MALL: 'AVM',
  GAS_STATION: 'Benzinlik',
  CAR_DEALER: 'Oto galeri',
  MECHANIC: 'Oto servis',
  GYM: 'Spor salonu',
}

export const TX_LABEL: Record<TxCategory, string> = {
  SALARY: 'Maaş',
  BONUS: 'Prim',
  FOOD: 'Yemek',
  GROCERY: 'Market',
  FUEL: 'Yakıt',
  LEISURE: 'Eğlence',
  CAR_PURCHASE: 'Araba alımı',
  CAR_SALE: 'Araba satışı',
  REPAIR: 'Tamir & yol',
  RENT: 'Kira',
  GIFT: 'Hediye',
}
