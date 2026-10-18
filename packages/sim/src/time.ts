/** Simülasyon zamanı: başlangıçtan beri geçen dakika. Gün 0 = Pazartesi. */
export const SIM_EPOCH = Date.UTC(2026, 0, 5, 0, 0, 0) // 5 Ocak 2026 Pazartesi
const EPOCH_DOW = 1

export const MIN_PER_DAY = 1440

export const dayOf = (clock: number) => Math.floor(clock / MIN_PER_DAY)
export const minuteOfDay = (clock: number) => ((clock % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY
export const hourOf = (clock: number) => minuteOfDay(clock) / 60
export const dayOfWeek = (clock: number) => (EPOCH_DOW + dayOf(clock)) % 7
export const isWeekend = (clock: number) => {
  const d = dayOfWeek(clock)
  return d === 0 || d === 6
}

/** Simülasyon saatini Date'e çevirir. Saat dilimi yok: UTC alanları yerel saat gibi okunur. */
export const toDate = (clock: number) => new Date(SIM_EPOCH + Math.round(clock * 60_000))
export const fromDate = (date: Date) => (date.getTime() - SIM_EPOCH) / 60_000

/** "HH:MM" */
export function formatClock(clock: number): string {
  const m = Math.floor(minuteOfDay(clock))
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export function isOpenAt(openHour: number, closeHour: number, clock: number): boolean {
  if (openHour === closeHour) return true
  const h = hourOf(clock)
  return openHour < closeHour ? h >= openHour && h < closeHour : h >= openHour || h < closeHour
}

/** Bugünün belirli saatine ait mutlak saat */
export const atHourToday = (clock: number, hour: number) => dayOf(clock) * MIN_PER_DAY + hour * 60
