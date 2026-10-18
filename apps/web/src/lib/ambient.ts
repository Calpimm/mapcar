/**
 * Simülasyon saatine göre haritanın ışığı. Tuval üzerine CSS filtresi olarak uygulanır;
 * işaretçiler (araba, popup) etkilenmez.
 */
interface Light {
  brightness: number
  saturate: number
  sepia: number
  hue: number
}

// Saat → ışık ana kareleri
const KEYS: [number, Light][] = [
  [0, { brightness: 0.52, saturate: 0.7, sepia: 0, hue: 195 }],
  [5, { brightness: 0.55, saturate: 0.7, sepia: 0, hue: 195 }],
  [6.5, { brightness: 0.9, saturate: 1.05, sepia: 0.35, hue: -12 }],
  [8, { brightness: 1, saturate: 1, sepia: 0, hue: 0 }],
  [16.5, { brightness: 1, saturate: 1, sepia: 0, hue: 0 }],
  [18.5, { brightness: 0.95, saturate: 1.15, sepia: 0.42, hue: -18 }],
  [20, { brightness: 0.68, saturate: 0.85, sepia: 0.1, hue: 200 }],
  [21.5, { brightness: 0.55, saturate: 0.72, sepia: 0, hue: 195 }],
  [24, { brightness: 0.52, saturate: 0.7, sepia: 0, hue: 195 }],
]

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function lightAt(hour: number): Light {
  const h = ((hour % 24) + 24) % 24
  for (let i = 1; i < KEYS.length; i++) {
    const [h1, l1] = KEYS[i]!
    const [h0, l0] = KEYS[i - 1]!
    if (h <= h1) {
      const t = (h - h0) / (h1 - h0)
      return {
        brightness: lerp(l0.brightness, l1.brightness, t),
        saturate: lerp(l0.saturate, l1.saturate, t),
        sepia: lerp(l0.sepia, l1.sepia, t),
        // Gece maviliği: sepia + hue-rotate ile
        hue: lerp(l0.hue, l1.hue, t),
      }
    }
  }
  return KEYS[0]![1]
}

export function mapFilter(hour: number) {
  const l = lightAt(hour)
  const night = l.brightness < 0.75
  const nightTint = night ? `sepia(0.5) hue-rotate(${l.hue.toFixed(0)}deg) ` : ''
  const warm =
    !night && l.sepia > 0 ? `sepia(${l.sepia.toFixed(2)}) hue-rotate(${l.hue.toFixed(0)}deg) ` : ''
  return `${nightTint}${warm}brightness(${l.brightness.toFixed(2)}) saturate(${l.saturate.toFixed(2)})`
}

export const isNight = (hour: number) => lightAt(hour).brightness < 0.75

export function phaseLabel(hour: number) {
  const h = ((hour % 24) + 24) % 24
  if (h < 5) return 'Gece'
  if (h < 8) return 'Şafak'
  if (h < 12) return 'Sabah'
  if (h < 17) return 'Öğleden sonra'
  if (h < 20) return 'Akşam üstü'
  return 'Akşam'
}
