import type { ActionKind, PlaceCategory } from './types'

export const FUEL_PRICE_PER_L = 52
export const WEEKLY_RENT = 3500
export const GROCERY_COST = 900
export const GROCERY_MEALS = 6

/** Kariyer seviyeleri için gereken toplam XP */
export const LEVEL_XP = [0, 45, 130, 280, 520, 900] as const

export const levelFor = (xp: number) => {
  let level = 0
  for (let i = 0; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]!) level = i
  return level
}

/** Bir mekanda tek seferlik harcama (TL) */
export function visitCost(category: PlaceCategory, priceLevel: number, action: ActionKind): number {
  const p = Math.max(1, Math.min(4, priceLevel))
  switch (category) {
    case 'RESTAURANT':
      return 320 * p
    case 'FAST_FOOD':
      return 190 * p
    case 'CAFE':
      return action === 'eat' ? 230 * p : 110 * p
    case 'BAR':
      return 280 * p
    case 'BEACH':
      return p > 1 ? 150 * (p - 1) : 0
    case 'LANDMARK':
      return p > 1 ? 80 * (p - 1) : 0
    case 'MALL':
      return 450 * p
    case 'GYM':
      return 120 * p
    default:
      return 0
  }
}

/** Arabayı satarken alınacak tutar */
export function resaleValue(purchasePrice: number, condition: number, odometerKm: number) {
  const wear = Math.min(0.5, odometerKm / 60_000)
  return Math.round((purchasePrice * (0.55 + (condition / 100) * 0.25 - wear * 0.3)) / 100) * 100
}

export const serviceCost = (condition: number) => Math.round(1200 + (100 - condition) * 45)
