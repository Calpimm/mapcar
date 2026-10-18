export type LngLat = [lng: number, lat: number]

export const PLACE_CATEGORIES = [
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
] as const
export type PlaceCategory = (typeof PLACE_CATEGORIES)[number]

export interface WorldPlace {
  id: string
  slug: string
  name: string
  category: PlaceCategory
  city: string
  lat: number
  lng: number
  priceLevel: number
  quality: number
  openHour: number
  closeHour: number
}

export interface WorldJob {
  id: string
  slug: string
  title: string
  placeId: string
  hourlyWage: number
  shiftStart: number
  shiftEnd: number
  workDays: number[]
  minLevel: number
}

export interface WorldCarModel {
  id: string
  slug: string
  brand: string
  model: string
  year: number
  price: number
  fuelPer100Km: number
  tankLiters: number
  comfort: number
  cruiseKmh: number
  color: string
}

export interface WorldRoute {
  fromPlaceId: string
  toPlaceId: string
  geometry: LngLat[]
  distanceM: number
  durationS: number
}

export interface World {
  places: WorldPlace[]
  jobs: WorldJob[]
  carModels: WorldCarModel[]
  /** `${from}->${to}` anahtarlı rota önbelleği */
  routes: Map<string, WorldRoute>
  homeCity: string
}

export const routeKey = (from: string, to: string) => `${from}->${to}`

// ---------------------------------------------------------------------------
// Karakter durumu
// ---------------------------------------------------------------------------

export type ActionKind =
  | 'sleep'
  | 'work'
  | 'eat'
  | 'eat_home'
  | 'socialize'
  | 'explore'
  | 'beach'
  | 'trip'
  | 'study'
  | 'gym'
  | 'shop'
  | 'groceries'
  | 'refuel'
  | 'service'
  | 'buy_car'
  | 'relax'

export interface Needs {
  /** 100 = tok */
  hunger: number
  /** 100 = dinç */
  energy: number
  /** 100 = keyifli */
  fun: number
  /** 100 = sosyal olarak doymuş */
  social: number
}

export interface CarState {
  /** DB'deki OwnedCar kaydı; runner atar */
  ownedCarId: string | null
  modelId: string
  fuel: number
  /** 0-100 */
  condition: number
  odometerKm: number
  purchasePrice: number
}

export type Activity =
  | { kind: 'idle'; placeId: string | null }
  | {
      kind: 'waiting_route'
      action: ActionKind
      fromPlaceId: string
      toPlaceId: string
      since: number
    }
  | {
      kind: 'driving'
      action: ActionKind
      fromPlaceId: string
      toPlaceId: string
      distanceM: number
      progressM: number
      /** m/dk */
      speed: number
      startedAt: number
    }
  | {
      kind: 'stopped'
      reason: string
      until: number
      resume: Extract<Activity, { kind: 'driving' }>
    }
  | {
      kind: 'at'
      action: ActionKind
      placeId: string
      startedAt: number
      endsAt: number
      /** Etkinlik sırasında harcanan para (değerlendirme için) */
      spent: number
      /** Dakika başına ihtiyaç kazancı */
      gains: Partial<Needs>
      dish?: string | null
      lunch?: boolean
    }

export interface PlaceMemory {
  visits: number
  avgRating: number
  lastVisit: number
}

export interface PlanItem {
  id: string
  /** Gün içi saat (0-24) */
  hour: number
  action: ActionKind
  label: string
  placeId: string | null
  status: 'pending' | 'done' | 'skipped'
}

export type GoalKind = 'buy_car' | 'career' | 'explore'

export interface GoalState {
  id: string
  kind: GoalKind
  title: string
  targetAmount: number | null
  /** buy_car için hedef model */
  carModelId: string | null
  progress: number
  target: number
  status: 'active' | 'done'
  createdAt: number
}

export interface AgentState {
  version: 1
  name: string
  rng: number
  /** Başlangıçtan beri geçen simülasyon dakikası */
  clock: number
  day: number
  money: number
  needs: Needs
  pantry: number
  homePlaceId: string
  jobId: string | null
  career: { level: number; xp: number }
  car: CarState | null
  position: LngLat
  heading: number
  activity: Activity
  /** Bugün tamamlanan vardiya var mı */
  workedToday: boolean
  /** Hafta sonu gezisi yapıldı mı (hafta numarası) */
  lastTripWeek: number
  plan: { day: number; items: PlanItem[] }
  goals: GoalState[]
  memory: Record<string, PlaceMemory>
  stats: {
    dayEarned: number
    daySpent: number
    dayDistanceKm: number
    totalDistanceKm: number
    totalEarned: number
    totalSpent: number
    meals: number
    reviews: number
  }
  lastThoughtAt: number
  /** Son tamamlanan etkinlik (eski kayıtlarda yok) */
  lastAction?: ActionKind
  seq: number
}

// ---------------------------------------------------------------------------
// Motorun dış dünyaya bildirdiği yan etkiler
// ---------------------------------------------------------------------------

export type EventType =
  | 'depart'
  | 'arrive'
  | 'activity_start'
  | 'activity_end'
  | 'work_done'
  | 'meal'
  | 'review'
  | 'refuel'
  | 'service'
  | 'car_bought'
  | 'promotion'
  | 'job_change'
  | 'goal_new'
  | 'goal_done'
  | 'incident'
  | 'rent'
  | 'day_start'
  | 'thought'

export type TxCategory =
  | 'SALARY'
  | 'BONUS'
  | 'FOOD'
  | 'GROCERY'
  | 'FUEL'
  | 'LEISURE'
  | 'CAR_PURCHASE'
  | 'CAR_SALE'
  | 'REPAIR'
  | 'RENT'
  | 'GIFT'

export type Effect =
  | {
      kind: 'event'
      type: EventType
      message: string
      placeId: string | null
      at: number
      position: LngLat
      data?: Record<string, unknown>
    }
  | {
      kind: 'transaction'
      amount: number
      category: TxCategory
      description: string
      placeId: string | null
      balance: number
      at: number
    }
  | {
      kind: 'review'
      placeId: string
      rating: number
      comment: string
      spent: number
      at: number
    }
  | {
      kind: 'car_bought'
      carModelId: string
      price: number
      previousOwnedCarId: string | null
      salePrice: number
      odometerKm: number
      at: number
    }
  | { kind: 'goal'; goal: GoalState; at: number }
  | { kind: 'job'; jobId: string; at: number }
  | {
      kind: 'day_end'
      day: number
      money: number
      earned: number
      spent: number
      distanceKm: number
      mood: number
      at: number
    }
  | { kind: 'need_route'; fromPlaceId: string; toPlaceId: string }

export interface SimSettings {
  /** Araba yoldayken 1 gerçek saniyede geçen sim dakikası */
  driveRate: number
  /** Etkinlik sırasında 1 gerçek saniyede geçen sim dakikası */
  activityRate: number
}

export const DEFAULT_SETTINGS: SimSettings = { driveRate: 0.35, activityRate: 8 }
