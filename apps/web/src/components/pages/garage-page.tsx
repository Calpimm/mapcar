'use client'

import { Flag } from 'lucide-react'
import { CarArt } from '@/components/site/car-art'
import { ErrorNote, PageShell } from '@/components/site/page-shell'
import { Skeleton } from '@/components/ui/skeleton'
import { formatKm, formatMoney, formatSimShortDay } from '@/lib/format'
import { useLive } from '@/lib/live-store'
import { useGarage } from '@/lib/queries'
import { cn } from '@/lib/utils'

export function GaragePage() {
  const q = useGarage()
  const snap = useLive((s) => s.snapshot)
  const goal = snap?.goals.find((g) => g.kind === 'buy_car' && g.status === 'active')
  const current = snap?.car
  const history = q.data?.owned ?? []

  return (
    <PageShell
      title="Garaj"
      lead="Babadan kalma Corolla'dan hayallerdeki arabaya. Deniz biriktirdikçe bir üst modele geçiyor, eskisini takasa veriyor."
    >
      {q.error && <ErrorNote message={q.error.message} />}

      {current ? (
        <section
          aria-label="Şu anki arabası"
          className="grid items-center gap-8 md:grid-cols-[1.1fr_1fr]"
        >
          <div className="rounded-2xl bg-korfez-soft/60 px-6 py-10 sm:px-12">
            <CarArt
              color={current.model.color}
              className="mx-auto w-full max-w-md drop-shadow-xl"
            />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Şu an kullandığı</p>
            <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight">
              {current.model.year} {current.model.brand} {current.model.model}
            </h2>
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <Spec label="Alış fiyatı" value={formatMoney(current.model.price)} />
              <Spec label="Bizimle yaptığı yol" value={formatKm(current.odometerKm)} />
              <Spec label="Yakıt" value={`%${Math.round(current.fuelPct * 100)}`} />
              <Spec label="Bakım durumu" value={`%${Math.round(current.condition)}`} />
              <Spec label="Tüketim" value={`${current.model.fuelPer100Km} L / 100 km`} />
              <Spec label="Seyir hızı" value={`${current.model.cruiseKmh} km/s`} />
            </dl>
          </div>
        </section>
      ) : (
        <Skeleton className="h-64 w-full rounded-2xl" />
      )}

      {history.length > 1 && (
        <section aria-labelledby="history" className="mt-16">
          <h2 id="history" className="font-display text-2xl font-semibold">
            Sahip olduğu arabalar
          </h2>
          <ol className="mt-5 divide-y border-y">
            {history.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-x-5 gap-y-1 py-4">
                <CarArt color={o.model.color} className="h-7 w-12 shrink-0" />
                <span className="min-w-0 flex-1 font-medium">
                  {o.model.year} {o.model.brand} {o.model.model}
                </span>
                <span className="text-sm text-muted-foreground tabular">
                  {formatSimShortDay(o.purchasedAt)}
                  {o.soldAt ? ` ile ${formatSimShortDay(o.soldAt)} arası` : ', hâlâ onda'}
                </span>
                <span className="w-40 text-right text-sm tabular">
                  {o.salePrice !== null
                    ? `${formatMoney(o.salePrice)}'ye takas`
                    : formatMoney(o.purchasePrice)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="showroom" className="mt-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="showroom" className="font-display text-2xl font-semibold">
            Mesarya Oto Galeri vitrini
          </h2>
          {snap && (
            <p className="text-sm text-muted-foreground">
              Cüzdanda {formatMoney(snap.agent.money)}
            </p>
          )}
        </div>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {q.data?.dealer.map((m) => {
            const isCurrent = current?.model.id === m.id
            const isGoal = goal?.title.includes(`${m.year} ${m.brand} ${m.model}`)
            const pct = snap ? Math.min(100, (snap.agent.money / m.price) * 100) : 0
            return (
              <li
                key={m.id}
                className={cn(
                  'rounded-xl border p-4',
                  isGoal && 'border-narenciye/60 bg-narenciye/5',
                  isCurrent && 'bg-muted/60',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{m.year}</p>
                    <p className="font-medium">
                      {m.brand} {m.model}
                    </p>
                  </div>
                  <CarArt color={m.color} className="h-8 w-14 shrink-0" />
                </div>
                <p className="mt-3 font-display text-xl font-semibold tabular">
                  {formatMoney(m.price)}
                </p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div className="h-full rounded-full bg-zeytin" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {isCurrent ? (
                    'Şu an bunu kullanıyor'
                  ) : isGoal ? (
                    <>
                      <Flag className="size-3 text-narenciye" /> Sıradaki hedefi
                    </>
                  ) : (
                    `Fiyatının %${Math.floor(pct)}'i cüzdanda`
                  )}
                </p>
              </li>
            )
          })}
        </ul>
      </section>
    </PageShell>
  )
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium tabular">{value}</dd>
    </div>
  )
}
