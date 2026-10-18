'use client'

import type { LiveSnapshot } from '@mapcar/contracts'
import { hourOf } from '@mapcar/sim'
import { formatHour } from '@/lib/format'
import { cn } from '@/lib/utils'

const START = 6
const END = 24
const span = END - START
const pos = (h: number) => `${((Math.min(END, Math.max(START, h)) - START) / span) * 100}%`

/** Günün planı, 06:00–24:00 arası bir cetvel üzerinde. */
export function DayRuler({ s, className }: { s: LiveSnapshot; className?: string }) {
  const now = hourOf(s.clock)
  const hours = Array.from({ length: span / 3 + 1 }, (_, i) => START + i * 3)
  return (
    <section aria-label="Bugünün planı" className={cn('relative', className)}>
      {/* plan etiketleri: iki sıra, çakışmasın diye dönüşümlü */}
      <div className="relative h-[52px]">
        {s.plan.map((it, i) => (
          <div
            key={it.id}
            className="absolute flex -translate-x-1/2 flex-col items-center"
            style={{ left: pos(it.hour), top: i % 2 ? 26 : 0 }}
            title={`${formatHour(it.hour)} ${it.label}`}
          >
            <span
              className={cn(
                'max-w-32 truncate rounded-full border px-2 py-0.5 text-[11px] leading-tight',
                it.status === 'done' &&
                  'border-transparent bg-zeytin/15 text-zeytin line-through decoration-zeytin/40',
                it.status === 'skipped' && 'border-dashed text-muted-foreground/70 line-through',
                it.status === 'pending' && 'border-border bg-card',
              )}
            >
              {it.label}
            </span>
          </div>
        ))}
      </div>
      {/* cetvel */}
      <div className="relative mt-1.5 h-2 rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-tas/60"
          style={{ width: pos(now) }}
        />
        {s.plan.map((it) => (
          <span
            key={it.id}
            className={cn(
              'absolute top-1/2 size-1.5 -translate-1/2 rounded-full',
              it.status === 'done' ? 'bg-zeytin' : 'bg-foreground/40',
            )}
            style={{ left: pos(it.hour) }}
            aria-hidden
          />
        ))}
        <span
          className="absolute top-1/2 size-3.5 -translate-1/2 rounded-full border-2 border-card bg-narenciye shadow"
          style={{ left: pos(now) }}
          aria-hidden
        />
      </div>
      <div className="relative mt-1.5 h-4">
        {hours.map((h, i) => (
          <span
            key={h}
            className={cn(
              'absolute text-[10px] text-muted-foreground tabular',
              i === 0 ? '' : i === hours.length - 1 ? '-translate-x-full' : '-translate-x-1/2',
            )}
            style={{ left: pos(h) }}
          >
            {formatHour(h)}
          </span>
        ))}
      </div>
    </section>
  )
}

/** Mobil: aynı plan, liste olarak */
export function PlanList({ s }: { s: LiveSnapshot }) {
  return (
    <ol className="space-y-1.5" aria-label="Bugünün planı">
      {s.plan.map((it) => (
        <li key={it.id} className="flex items-center gap-3 text-sm">
          <span className="w-11 shrink-0 text-xs text-muted-foreground tabular">
            {formatHour(it.hour)}
          </span>
          <span
            className={cn(
              'truncate',
              it.status === 'done' && 'text-zeytin line-through decoration-zeytin/40',
              it.status === 'skipped' && 'text-muted-foreground line-through',
            )}
          >
            {it.label}
          </span>
        </li>
      ))}
    </ol>
  )
}
