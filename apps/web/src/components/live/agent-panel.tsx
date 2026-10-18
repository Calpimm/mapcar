'use client'

import type { LiveSnapshot } from '@mapcar/contracts'
import { Battery, Car, Fuel, PartyPopper, Users, UtensilsCrossed, Wrench } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { AnimatedNumber } from '@/components/site/animated-number'
import { formatHour, formatKm, formatMoney, formatSignedMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { NeedBar } from './need-bar'

const fmtMoney = (n: number) => formatMoney(n)

export function AgentPanel({ s, className }: { s: LiveSnapshot; className?: string }) {
  const a = s.activity
  const net = s.stats.dayEarned - s.stats.daySpent
  const levelSpan = s.agent.nextLevelXp ? s.agent.nextLevelXp - s.agent.levelXp : 1
  const levelPct = s.agent.nextLevelXp ? ((s.agent.xp - s.agent.levelXp) / levelSpan) * 100 : 100
  const endsAt = a.endsAt !== null ? formatHour(((a.endsAt % 1440) / 60 + 24) % 24) : null

  return (
    <section aria-label="Deniz'in durumu" className={cn('flex flex-col gap-5', className)}>
      <header className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-narenciye font-display text-lg font-bold text-white">
          {s.agent.name[0]}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-semibold leading-tight">{s.agent.name}</h2>
          <p className="truncate text-sm text-muted-foreground">
            {s.agent.job ? `${s.agent.job.title}, ${s.agent.job.placeName}` : 'İş arıyor'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Seviye</p>
          <p className="font-display text-xl font-semibold leading-none tabular">{s.agent.level}</p>
        </div>
      </header>

      <div
        className="h-1 overflow-hidden rounded-full bg-muted"
        title={`${Math.round(levelPct)}% sonraki seviyeye`}
      >
        <div
          className="h-full bg-tas transition-[width] duration-700"
          style={{ width: `${levelPct}%` }}
        />
      </div>

      <div aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${a.kind}-${a.action}-${a.placeId}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            <p className="font-display text-[1.65rem] font-semibold leading-[1.1] tracking-tight text-balance">
              {a.label}
            </p>
            {a.placeName && <p className="mt-1 text-sm text-muted-foreground">{a.placeName}</p>}
          </motion.div>
        </AnimatePresence>
        {a.progress !== null && (
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-narenciye transition-[width] duration-1000 ease-linear"
                style={{ width: `${a.progress * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular">
              {a.speedKmh ? `${Math.round(a.speedKmh)} km/s` : endsAt ? `${endsAt}'e kadar` : ''}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Cüzdan</p>
          <p className="font-display text-3xl font-semibold leading-none tracking-tight">
            <AnimatedNumber value={s.agent.money} format={fmtMoney} />
          </p>
        </div>
        <p className={cn('pb-0.5 text-sm tabular', net >= 0 ? 'text-zeytin' : 'text-kiraz')}>
          {formatSignedMoney(net)} <span className="text-muted-foreground">bugün</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-5 gap-y-3">
        <NeedBar icon={UtensilsCrossed} label="Tokluk" value={s.agent.needs.hunger} />
        <NeedBar icon={Battery} label="Enerji" value={s.agent.needs.energy} />
        <NeedBar icon={PartyPopper} label="Keyif" value={s.agent.needs.fun} />
        <NeedBar icon={Users} label="Sosyallik" value={s.agent.needs.social} />
      </div>

      {s.car && (
        <div className="flex items-center gap-3 rounded-lg bg-muted/70 px-3 py-2.5">
          <span
            className="size-3 shrink-0 rounded-full ring-2 ring-white/70"
            style={{ background: s.car.model.color }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {s.car.model.year} {s.car.model.brand} {s.car.model.model}
            </p>
            <p className="text-xs text-muted-foreground tabular">
              {formatKm(s.car.odometerKm)} yol yaptı
            </p>
          </div>
          <span
            className={cn(
              'flex items-center gap-1 text-xs tabular',
              s.car.fuelPct < 0.2 && 'text-kiraz',
            )}
            title="Yakıt"
          >
            <Fuel className="size-3.5" aria-label="Yakıt" />%{Math.round(s.car.fuelPct * 100)}
          </span>
          <span
            className={cn(
              'flex items-center gap-1 text-xs tabular',
              s.car.condition < 35 && 'text-kiraz',
            )}
            title="Bakım durumu"
          >
            <Wrench className="size-3.5" aria-label="Bakım" />%{Math.round(s.car.condition)}
          </span>
        </div>
      )}
      {!s.car && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Car className="size-4" /> Arabası yok
        </p>
      )}
    </section>
  )
}
