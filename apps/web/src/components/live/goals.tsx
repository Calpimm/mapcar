import type { Goal } from '@mapcar/contracts'
import { Check } from 'lucide-react'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

function detail(g: Goal) {
  if (g.kind === 'buy_car')
    return `${formatMoney(Math.min(g.progress, g.target))} / ${formatMoney(g.target)}`
  if (g.kind === 'explore') return `${g.progress} / ${g.target} yer`
  return `${Math.floor(g.progress)} / ${g.target} deneyim`
}

export function Goals({ goals }: { goals: Goal[] }) {
  const active = goals.filter((g) => g.status === 'active')
  const done = goals
    .filter((g) => g.status === 'done')
    .slice(-2)
    .reverse()
  return (
    <section aria-labelledby="goals-title">
      <h3 id="goals-title" className="text-sm font-medium">
        Hedefler
      </h3>
      <ul className="mt-2.5 space-y-3">
        {active.map((g) => {
          const pct = Math.min(100, (g.progress / Math.max(1, g.target)) * 100)
          return (
            <li key={g.id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{g.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular">
                  %{Math.floor(pct)}
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full bg-zeytin transition-[width] duration-700')}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground tabular">{detail(g)}</p>
            </li>
          )
        })}
        {done.map((g) => (
          <li key={g.id} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="size-3.5 text-zeytin" aria-hidden />
            <span className="truncate line-through decoration-muted-foreground/40">{g.title}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
