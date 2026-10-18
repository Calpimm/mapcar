'use client'

import { formatClock } from '@mapcar/sim'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { phaseLabel } from '@/lib/ambient'
import { formatSimDay } from '@/lib/format'
import { useLive } from '@/lib/live-store'
import { cn } from '@/lib/utils'

export function SimClock() {
  const snap = useLive((s) => s.snapshot)
  const status = useLive((s) => s.status)
  const hour = snap ? (snap.clock % 1440) / 60 : 0
  const statusText = snap?.paused
    ? 'Duraklatıldı'
    : status === 'live'
      ? 'Canlı'
      : status === 'connecting'
        ? 'Bağlanıyor'
        : 'Bağlantı yok'
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-3 text-right" tabIndex={0}>
          <div className="hidden leading-tight sm:block">
            <p className="text-xs text-muted-foreground">{snap ? `${snap.day + 1}. gün` : ''}</p>
            <p className="text-xs capitalize">{snap ? formatSimDay(snap.date) : ''}</p>
          </div>
          <p className="font-display text-2xl font-semibold leading-none tabular">
            {snap ? formatClock(snap.clock) : '--:--'}
          </p>
          <span
            className={cn(
              'size-2 rounded-full',
              snap?.paused
                ? 'bg-tas'
                : status === 'live'
                  ? 'bg-zeytin'
                  : status === 'connecting'
                    ? 'animate-pulse bg-tas'
                    : 'bg-kiraz',
            )}
            aria-label={statusText}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {statusText}
        {snap ? `, ${phaseLabel(hour).toLocaleLowerCase('tr')}` : ''}. Yolda 1 saniye ≈ 20 saniye,
        gerisi hızlı akar.
      </TooltipContent>
    </Tooltip>
  )
}
