const n = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })
export const money = (v: number) => `${n.format(Math.round(v))} ₺`
export const num = (v: number) => n.format(v)

export function clock(minutes: number) {
  const m = Math.floor(((minutes % 1440) + 1440) % 1440)
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

const dt = new Intl.DateTimeFormat('tr-TR', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})
export const simDateTime = (iso: string) => dt.format(new Date(iso))
