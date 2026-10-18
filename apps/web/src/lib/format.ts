const money = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })

export const formatMoney = (n: number) => `${money.format(Math.round(n))} ₺`
export const formatSignedMoney = (n: number) =>
  `${n > 0 ? '+' : n < 0 ? '−' : ''}${money.format(Math.abs(Math.round(n)))} ₺`
export const formatKm = (n: number) =>
  `${n.toLocaleString('tr-TR', { maximumFractionDigits: n < 10 ? 1 : 0 })} km`

// Simülasyon tarihleri UTC alanlarında yerel saat taşır
const dayFmt = new Intl.DateTimeFormat('tr-TR', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const shortDayFmt = new Intl.DateTimeFormat('tr-TR', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
})
const timeFmt = new Intl.DateTimeFormat('tr-TR', {
  timeZone: 'UTC',
  hour: '2-digit',
  minute: '2-digit',
})

export const formatSimDay = (iso: string) => dayFmt.format(new Date(iso))
export const formatSimShortDay = (iso: string) => shortDayFmt.format(new Date(iso))
export const formatSimTime = (iso: string) => timeFmt.format(new Date(iso))

export const formatHour = (h: number) => {
  const hh = Math.floor(h) % 24
  const mm = Math.round((h % 1) * 60)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export const pct = (n: number) => `%${Math.round(n)}`
