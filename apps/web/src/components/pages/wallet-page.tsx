'use client'

import { TX_LABEL } from '@mapcar/contracts'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AnimatedNumber } from '@/components/site/animated-number'
import { ErrorNote, PageShell } from '@/components/site/page-shell'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMoney, formatSignedMoney, formatSimShortDay, formatSimTime } from '@/lib/format'
import { useLive } from '@/lib/live-store'
import { useFinance } from '@/lib/queries'
import { cn } from '@/lib/utils'

const compact = new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 })
const fmt = (n: number) => formatMoney(n)

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 tabular">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {p.name}: {formatMoney(p.value)}
        </p>
      ))}
    </div>
  )
}

export function WalletPage() {
  const q = useFinance()
  const snap = useLive((s) => s.snapshot)
  const days = (q.data?.days ?? []).map((d) => ({ ...d, label: formatSimShortDay(d.date) }))
  const spending = (q.data?.byCategory ?? [])
    .filter((c) => c.total < 0)
    .sort((a, b) => a.total - b.total)
  const income = (q.data?.byCategory ?? [])
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
  const maxSpend = Math.max(1, ...spending.map((c) => -c.total))

  return (
    <PageShell
      title="Cüzdan"
      lead="Maaş, kira, yemek, benzin ve arada bir galeri ziyareti. Deniz'in parası nereden gelip nereye gidiyor?"
      aside={
        snap && (
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Şu an</p>
            <p className="font-display text-4xl font-semibold tracking-tight">
              <AnimatedNumber value={snap.agent.money} format={fmt} />
            </p>
          </div>
        )
      }
    >
      {q.error && <ErrorNote message={q.error.message} />}

      <section aria-labelledby="balance-chart">
        <h2 id="balance-chart" className="font-display text-xl font-semibold">
          Gün sonu bakiyesi
        </h2>
        <div className="mt-4 h-72">
          {days.length > 1 ? (
            <ResponsiveContainer>
              <AreaChart data={days} margin={{ left: 0, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="money" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="var(--zeytin)" stopOpacity={0.35} />
                    <stop offset="1" stopColor="var(--zeytin)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--muted-foreground)"
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={(v: number) => compact.format(v)}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  width={48}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="money"
                  name="Bakiye"
                  stroke="var(--zeytin)"
                  strokeWidth={2}
                  fill="url(#money)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : q.isPending ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <p className="text-sm text-muted-foreground">
              Grafik ilk gün bitince dolmaya başlayacak.
            </p>
          )}
        </div>
      </section>

      <div className="mt-16 grid gap-14 lg:grid-cols-2">
        <section aria-labelledby="daily-chart">
          <h2 id="daily-chart" className="font-display text-xl font-semibold">
            Günlük gelir ve gider
          </h2>
          <div className="mt-4 h-60">
            {days.length > 0 && (
              <ResponsiveContainer>
                <BarChart data={days.slice(-14)} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    stroke="var(--muted-foreground)"
                    minTickGap={16}
                  />
                  <YAxis
                    tickFormatter={(v: number) => compact.format(v)}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    width={48}
                    stroke="var(--muted-foreground)"
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)' }} />
                  <Bar dataKey="earned" name="Gelir" fill="var(--zeytin)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spent" name="Gider" fill="var(--narenciye)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section aria-labelledby="spend-cats">
          <h2 id="spend-cats" className="font-display text-xl font-semibold">
            Para nereye gitti
          </h2>
          <ul className="mt-5 space-y-3">
            {spending.map((c) => (
              <li
                key={c.category}
                className="grid grid-cols-[7.5rem_1fr_6.5rem] items-center gap-3 text-sm"
              >
                <span>{TX_LABEL[c.category]}</span>
                <span className="h-2 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-narenciye"
                    style={{ width: `${(-c.total / maxSpend) * 100}%` }}
                  />
                </span>
                <span className="text-right tabular">{formatMoney(-c.total)}</span>
              </li>
            ))}
          </ul>
          {income.length > 0 && (
            <p className="mt-6 text-sm text-muted-foreground">
              Gelir:{' '}
              {income.map((c, i) => (
                <span key={c.category}>
                  {i > 0 && ', '}
                  {TX_LABEL[c.category].toLocaleLowerCase('tr')}{' '}
                  <span className="text-foreground tabular">{formatMoney(c.total)}</span>
                </span>
              ))}
            </p>
          )}
        </section>
      </div>

      <section aria-labelledby="tx" className="mt-16">
        <h2 id="tx" className="font-display text-xl font-semibold">
          Son hareketler
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-normal">Zaman</th>
                <th className="py-2 pr-4 font-normal">Açıklama</th>
                <th className="py-2 pr-4 font-normal">Tür</th>
                <th className="py-2 pr-4 text-right font-normal">Tutar</th>
                <th className="py-2 text-right font-normal">Bakiye</th>
              </tr>
            </thead>
            <tbody>
              {q.data?.recent.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="py-2.5 pr-4 text-muted-foreground tabular whitespace-nowrap">
                    {formatSimShortDay(t.simTime)} {formatSimTime(t.simTime)}
                  </td>
                  <td className="py-2.5 pr-4">{t.description}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{TX_LABEL[t.category]}</td>
                  <td
                    className={cn(
                      'py-2.5 pr-4 text-right tabular',
                      t.amount > 0 ? 'text-zeytin' : '',
                    )}
                  >
                    {formatSignedMoney(t.amount)}
                  </td>
                  <td className="py-2.5 text-right tabular text-muted-foreground">
                    {formatMoney(t.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PageShell>
  )
}
