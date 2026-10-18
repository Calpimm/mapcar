'use client'

import { CATEGORY_LABEL, type Place } from '@mapcar/contracts'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { type CategoryGroup, GROUP_COLOR, GROUP_OF } from '@/components/map/style'
import { ErrorNote, PageShell } from '@/components/site/page-shell'
import { PriceLevel } from '@/components/site/price-level'
import { Stars } from '@/components/site/stars'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatSimShortDay } from '@/lib/format'
import { useReviews, useWorld } from '@/lib/queries'

const GROUPS: { value: 'all' | CategoryGroup; label: string }[] = [
  { value: 'all', label: 'Hepsi' },
  { value: 'food', label: 'Yeme içme' },
  { value: 'sight', label: 'Gezilecek' },
  { value: 'sea', label: 'Plajlar' },
  { value: 'daily', label: 'Gündelik' },
]

type Sort = 'rating' | 'reviews' | 'name'

export function PlacesPage() {
  const world = useWorld()
  const [group, setGroup] = useState<'all' | CategoryGroup>('all')
  const [city, setCity] = useState('all')
  const [sort, setSort] = useState<Sort>('rating')

  const list = useMemo(() => {
    const places = (world.data?.places ?? []).filter(
      (p) =>
        p.category !== 'HOME' &&
        (group === 'all' || GROUP_OF[p.category] === group) &&
        (city === 'all' || p.city === city),
    )
    const by: Record<Sort, (a: Place, b: Place) => number> = {
      rating: (a, b) => (b.rating ?? -1) - (a.rating ?? -1) || b.reviewCount - a.reviewCount,
      reviews: (a, b) => b.reviewCount - a.reviewCount,
      name: (a, b) => a.name.localeCompare(b.name, 'tr'),
    }
    return places.sort(by[sort])
  }, [world.data, group, city, sort])

  const visited =
    world.data?.places.filter((p) => p.visits > 0 && p.category !== 'HOME').length ?? 0

  return (
    <PageShell
      title="Mekanlar"
      lead={
        world.data
          ? `Deniz şimdiye kadar ${world.data.places.length - 1} yerin ${visited} tanesine uğradı. Puanlar tamamen onun damak zevki.`
          : 'Deniz’in uğradığı ve puanladığı yerler.'
      }
    >
      <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <ToggleGroup
              type="single"
              value={group}
              onValueChange={(v) => v && setGroup(v as typeof group)}
              variant="outline"
              size="sm"
              aria-label="Kategori"
            >
              {GROUPS.map((g) => (
                <ToggleGroupItem key={g.value} value={g.value} className="px-3">
                  {g.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger size="sm" className="w-40" aria-label="Şehir">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm şehirler</SelectItem>
                {world.data?.cities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger size="sm" className="w-44" aria-label="Sıralama">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">En yüksek puan</SelectItem>
                <SelectItem value="reviews">En çok yorum</SelectItem>
                <SelectItem value="name">İsme göre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {world.error && (
            <div className="mt-6">
              <ErrorNote message={world.error.message} />
            </div>
          )}

          <ul className="mt-6 divide-y border-y">
            {world.isPending &&
              Array.from({ length: 8 }, (_, i) => (
                <li key={i} className="py-4">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="mt-2 h-4 w-1/3" />
                </li>
              ))}
            {list.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/mekanlar/${p.slug}`}
                  className="group grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 py-4 outline-none"
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: GROUP_COLOR[GROUP_OF[p.category] ?? 'daily'] }}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium group-hover:underline group-focus-visible:underline">
                      {p.name}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {CATEGORY_LABEL[p.category]}, {p.city}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    {p.rating !== null ? (
                      <span className="flex items-center gap-2">
                        <span className="font-display text-lg font-semibold tabular">
                          {p.rating.toFixed(1)}
                        </span>
                        <Stars value={p.rating} size={13} />
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Henüz puan yok</span>
                    )}
                    <span className="flex items-center gap-3 text-xs text-muted-foreground">
                      {p.reviewCount > 0 && <span className="tabular">{p.reviewCount} yorum</span>}
                      {['RESTAURANT', 'CAFE', 'FAST_FOOD', 'BAR'].includes(p.category) && (
                        <PriceLevel level={p.priceLevel} />
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
            {world.data && !list.length && (
              <li className="py-10 text-center text-sm text-muted-foreground">
                Bu filtrelerle eşleşen yer yok.
              </li>
            )}
          </ul>
        </div>
        <RecentReviews />
      </div>
    </PageShell>
  )
}

function RecentReviews() {
  const reviews = useReviews()
  const items = reviews.data?.pages.flatMap((p) => p.items).slice(0, 8) ?? []
  return (
    <aside aria-labelledby="recent-reviews" className="lg:sticky lg:top-8 lg:self-start">
      <h2 id="recent-reviews" className="font-display text-xl font-semibold">
        Son yorumlar
      </h2>
      <ul className="mt-4 space-y-5">
        {items.map((r) => (
          <li key={r.id}>
            <div className="flex items-center justify-between gap-2">
              <Link
                href={`/mekanlar/${r.place.slug}`}
                className="truncate text-sm font-medium hover:underline"
              >
                {r.place.name}
              </Link>
              <Stars value={r.rating} size={12} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">{r.comment}</p>
            <p className="mt-1 text-xs text-muted-foreground/80">{formatSimShortDay(r.simTime)}</p>
          </li>
        ))}
        {reviews.data && !items.length && (
          <li className="text-sm text-muted-foreground">İlk yorum yolda.</li>
        )}
      </ul>
    </aside>
  )
}
