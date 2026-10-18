'use client'

import { CATEGORY_LABEL } from '@mapcar/contracts'
import { ArrowLeft, Clock, MapPin } from 'lucide-react'
import Link from 'next/link'
import { ErrorNote, PageShell } from '@/components/site/page-shell'
import { PriceLevel } from '@/components/site/price-level'
import { Stars } from '@/components/site/stars'
import { Skeleton } from '@/components/ui/skeleton'
import { formatHour, formatMoney, formatSimShortDay, formatSimTime } from '@/lib/format'
import { useLive } from '@/lib/live-store'
import { usePlace } from '@/lib/queries'

function hoursLabel(open: number, close: number) {
  if (open === close) return '7/24 açık'
  return `${formatHour(open)} ile ${formatHour(close)} arası açık`
}

export function PlaceDetailPage({ slug }: { slug: string }) {
  const q = usePlace(slug)
  const herePlaceId = useLive((s) => s.snapshot?.activity.placeId)
  const activity = useLive((s) => s.snapshot?.activity)

  if (q.error)
    return (
      <PageShell title="Yer bulunamadı">
        <ErrorNote message={q.error.message} />
      </PageShell>
    )
  if (!q.data)
    return (
      <main className="mx-auto max-w-6xl px-4 pt-14">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="mt-4 h-5 w-1/2" />
      </main>
    )

  const { place, reviews, ratingHistogram, totalSpent } = q.data
  const total = ratingHistogram.reduce((a, b) => a + b, 0)
  const isHere = herePlaceId === place.id
  const food = ['RESTAURANT', 'CAFE', 'FAST_FOOD', 'BAR'].includes(place.category)

  return (
    <PageShell
      title={place.name}
      lead={place.description}
      aside={
        <Link
          href="/mekanlar"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Tüm mekanlar
        </Link>
      }
    >
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <MapPin className="size-4" />
          {CATEGORY_LABEL[place.category]}, {place.city}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-4" />
          {hoursLabel(place.openHour, place.closeHour)}
        </span>
        {food && <PriceLevel level={place.priceLevel} />}
      </div>

      {isHere && activity && (
        <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-narenciye/10 px-3 py-1.5 text-sm text-narenciye">
          <span className="size-2 animate-pulse rounded-full bg-narenciye" />
          Deniz şu an burada: {activity.label.toLocaleLowerCase('tr')}
        </p>
      )}

      <div className="mt-10 grid gap-12 lg:grid-cols-[300px_1fr]">
        <section aria-label="Puan özeti">
          {place.rating !== null ? (
            <>
              <p className="font-display text-6xl font-semibold tracking-tight tabular">
                {place.rating.toFixed(1)}
              </p>
              <Stars value={place.rating} size={18} className="mt-2" />
              <p className="mt-2 text-sm text-muted-foreground">
                {total} değerlendirme, {place.visits} ziyaret
              </p>
              <ol className="mt-6 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const n = ratingHistogram[star - 1] ?? 0
                  return (
                    <li
                      key={star}
                      className="grid grid-cols-[1.5rem_1fr_2rem] items-center gap-2 text-xs"
                    >
                      <span className="tabular text-muted-foreground">{star}★</span>
                      <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full bg-narenciye"
                          style={{ width: `${total ? (n / total) * 100 : 0}%` }}
                        />
                      </span>
                      <span className="text-right tabular text-muted-foreground">{n}</span>
                    </li>
                  )
                })}
              </ol>
              {totalSpent > 0 && (
                <p className="mt-6 text-sm">
                  Burada toplam{' '}
                  <span className="font-medium tabular">{formatMoney(totalSpent)}</span> harcadı.
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">
              Deniz buraya henüz uğramadı. Yolu düşerse ilk yorumu o yazacak.
            </p>
          )}
        </section>

        <section aria-labelledby="reviews-title">
          <h2 id="reviews-title" className="font-display text-xl font-semibold">
            Deniz ne dedi
          </h2>
          <ol className="mt-4 divide-y border-y">
            {reviews.map((r) => (
              <li key={r.id} className="py-5">
                <div className="flex items-center justify-between gap-3">
                  <Stars value={r.rating} size={14} />
                  <span className="text-xs text-muted-foreground tabular">
                    {formatSimShortDay(r.simTime)}, {formatSimTime(r.simTime)}
                  </span>
                </div>
                <p className="mt-2 text-pretty">{r.comment}</p>
                {r.spent > 0 && (
                  <p className="mt-1 text-sm text-muted-foreground tabular">
                    {formatMoney(r.spent)} ödedi
                  </p>
                )}
              </li>
            ))}
            {!reviews.length && (
              <li className="py-8 text-sm text-muted-foreground">Henüz yorum yok.</li>
            )}
          </ol>
        </section>
      </div>
    </PageShell>
  )
}
