'use client'

import type { FeedEvent } from '@mapcar/contracts'
import { AnimatePresence, motion } from 'motion/react'
import { Stars } from '@/components/site/stars'
import { formatSimTime } from '@/lib/format'
import { useLive } from '@/lib/live-store'
import { cn } from '@/lib/utils'
import { EventIcon, HIGHLIGHT } from './event-icon'

function Item({ e }: { e: FeedEvent }) {
  const rating = typeof e.data?.rating === 'number' ? e.data.rating : null
  const highlight = HIGHLIGHT.has(e.type)
  return (
    <div className={cn('flex gap-3 py-2.5', highlight && '-mx-2 rounded-lg bg-tas-soft/70 px-2')}>
      <EventIcon type={e.type} className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm leading-snug',
            e.type === 'thought' && 'italic text-muted-foreground',
            highlight && 'font-medium',
          )}
        >
          {e.type === 'thought' ? `“${e.message}”` : e.message}
        </p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular">{formatSimTime(e.simTime)}</span>
          {e.placeName && <span className="truncate">{e.placeName}</span>}
          {rating !== null && <Stars value={rating} size={11} />}
        </p>
      </div>
    </div>
  )
}

export function Feed({ className, limit = 30 }: { className?: string; limit?: number }) {
  const events = useLive((s) => s.events).slice(0, limit)
  if (!events.length)
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>Deniz güne başlamak üzere.</p>
    )
  return (
    <ol
      className={cn('divide-y divide-border/70', className)}
      aria-label="Son olaylar"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {events.map((e) => (
          <motion.li
            key={e.id}
            layout="position"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <Item e={e} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  )
}
