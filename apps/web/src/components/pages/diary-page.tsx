'use client'

import type { FeedEvent } from '@mapcar/contracts'
import { useMemo, useState } from 'react'
import { EventIcon, HIGHLIGHT } from '@/components/live/event-icon'
import { ErrorNote, PageShell } from '@/components/site/page-shell'
import { Stars } from '@/components/site/stars'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatSimDay, formatSimTime } from '@/lib/format'
import { useEvents } from '@/lib/queries'
import { cn } from '@/lib/utils'

const FILTERS = [
  { value: 'all', label: 'Her şey', types: undefined },
  {
    value: 'moments',
    label: 'Önemli anlar',
    types: 'promotion,job_change,car_bought,goal_done,goal_new,incident',
  },
  { value: 'food', label: 'Yemek ve yorumlar', types: 'review,meal' },
  { value: 'money', label: 'İş ve para', types: 'work_done,rent,refuel,service' },
  { value: 'thoughts', label: 'Aklından geçenler', types: 'thought' },
] as const

export function DiaryPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('all')
  const types = FILTERS.find((f) => f.value === filter)?.types
  const q = useEvents(types)

  const days = useMemo(() => {
    const groups: { day: string; date: string; items: FeedEvent[] }[] = []
    for (const e of q.data?.pages.flatMap((p) => p.items) ?? []) {
      const day = e.simTime.slice(0, 10)
      const last = groups[groups.length - 1]
      if (last?.day === day) last.items.push(e)
      else groups.push({ day, date: e.simTime, items: [e] })
    }
    return groups
  }, [q.data])

  return (
    <PageShell title="Günlük" lead="Deniz'in yaşadığı her şey, en yeniden eskiye.">
      <ToggleGroup
        type="single"
        value={filter}
        onValueChange={(v) => v && setFilter(v as typeof filter)}
        variant="outline"
        size="sm"
        aria-label="Olay türü"
        className="flex-wrap"
      >
        {FILTERS.map((f) => (
          <ToggleGroupItem key={f.value} value={f.value} className="px-3">
            {f.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {q.error && (
        <div className="mt-6">
          <ErrorNote message={q.error.message} />
        </div>
      )}

      <div className="mt-10 space-y-12">
        {q.isPending &&
          Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          ))}
        {days.map((d) => (
          <section
            key={d.day}
            aria-label={formatSimDay(d.date)}
            className="grid gap-4 md:grid-cols-[200px_1fr]"
          >
            <h2 className="font-display text-xl font-semibold capitalize md:sticky md:top-6 md:self-start">
              {formatSimDay(d.date)}
            </h2>
            <ol className="relative border-l pl-6">
              {d.items.map((e) => {
                const rating = typeof e.data?.rating === 'number' ? e.data.rating : null
                return (
                  <li key={e.id} className="relative pb-5 last:pb-0">
                    <span className="absolute -left-[33px] top-0.5 grid size-5 place-items-center rounded-full bg-background">
                      <EventIcon type={e.type} className="size-3.5" />
                    </span>
                    <p
                      className={cn(
                        'text-pretty',
                        HIGHLIGHT.has(e.type) && 'font-display text-lg font-semibold',
                        e.type === 'thought' && 'italic text-muted-foreground',
                      )}
                    >
                      {e.type === 'thought' ? `“${e.message}”` : e.message}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                      <span className="tabular">{formatSimTime(e.simTime)}</span>
                      {e.placeName && <span>{e.placeName}</span>}
                      {rating !== null && <Stars value={rating} size={12} />}
                    </p>
                  </li>
                )
              })}
            </ol>
          </section>
        ))}
        {q.data && !days.length && (
          <p className="text-muted-foreground">Bu türde henüz bir olay yok.</p>
        )}
      </div>

      {q.hasNextPage && (
        <div className="mt-12 flex justify-center">
          <Button
            variant="outline"
            onClick={() => q.fetchNextPage()}
            disabled={q.isFetchingNextPage}
          >
            {q.isFetchingNextPage ? 'Yükleniyor' : 'Daha eski günleri göster'}
          </Button>
        </div>
      )}
    </PageShell>
  )
}
