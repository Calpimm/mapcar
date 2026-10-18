import type { LngLat } from './types'

const R = 6_371_000

export function haversine(a: LngLat, b: LngLat): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Polyline üzerindeki kümülatif mesafeler (metre). */
export function cumulative(line: LngLat[]): number[] {
  const out = [0]
  for (let i = 1; i < line.length; i++) out.push(out[i - 1]! + haversine(line[i - 1]!, line[i]!))
  return out
}

export interface PointOnLine {
  point: LngLat
  /** Kuzeyden saat yönünde derece */
  bearing: number
}

export function pointAlong(line: LngLat[], cum: number[], distance: number): PointOnLine {
  if (line.length === 1) return { point: line[0]!, bearing: 0 }
  const total = cum[cum.length - 1]!
  const d = Math.max(0, Math.min(distance, total))
  let lo = 0
  let hi = cum.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (cum[mid]! <= d) lo = mid
    else hi = mid
  }
  const a = line[lo]!
  const b = line[hi]!
  const seg = cum[hi]! - cum[lo]!
  const t = seg > 0 ? (d - cum[lo]!) / seg : 0
  return {
    point: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
    bearing: bearingOf(a, b),
  }
}

export function bearingOf(a: LngLat, b: LngLat): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const y = Math.sin(toRad(b[0] - a[0])) * Math.cos(toRad(b[1]))
  const x =
    Math.cos(toRad(a[1])) * Math.sin(toRad(b[1])) -
    Math.sin(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.cos(toRad(b[0] - a[0]))
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}
