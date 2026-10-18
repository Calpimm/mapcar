'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { useLive } from '@/lib/live-store'
import { useWorld } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { AgentPanel } from './agent-panel'
import { DayRuler, PlanList } from './day-ruler'
import { Feed } from './feed'
import { Goals } from './goals'

const LiveMap = dynamic(() => import('@/components/map/live-map').then((m) => m.LiveMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
})

const glass =
  'rounded-2xl border border-white/40 bg-glass shadow-[0_18px_50px_-24px_rgb(18_59_92/0.55)] backdrop-blur-xl dark:border-white/5'

export function LiveView() {
  const snapshot = useLive((s) => s.snapshot)
  const status = useLive((s) => s.status)
  const world = useWorld()

  return (
    <main className="relative lg:h-[calc(100dvh-3.5rem)]">
      <div className="h-[56dvh] lg:absolute lg:inset-0 lg:h-auto">
        <LiveMap places={world.data?.places ?? []} />
      </div>

      {/* Masaüstü: harita üstünde süzülen paneller */}
      <div className="pointer-events-none absolute inset-0 hidden p-4 pb-9 lg:block">
        <div className="flex h-full flex-col justify-between gap-4">
          <div className="flex min-h-0 flex-1 justify-between gap-4">
            <aside
              className={cn(
                glass,
                'pointer-events-auto w-[360px] overflow-y-auto p-5 [scrollbar-width:thin]',
              )}
            >
              {snapshot ? (
                <div className="space-y-6">
                  <AgentPanel s={snapshot} />
                  <Goals goals={snapshot.goals} />
                </div>
              ) : (
                <PanelSkeleton offline={status === 'offline'} />
              )}
            </aside>
            <aside
              className={cn(
                glass,
                'pointer-events-auto mr-12 flex w-[340px] flex-col self-start p-5',
              )}
              style={{ maxHeight: 'calc(100% - 0px)' }}
            >
              <h2 className="font-display text-base font-semibold">Neler oluyor</h2>
              <div className="-mr-2 mt-1 min-h-0 flex-1 overflow-y-auto pr-2 [scrollbar-width:thin]">
                <Feed limit={40} />
              </div>
            </aside>
          </div>
          {snapshot && (
            <div className={cn(glass, 'pointer-events-auto px-6 pb-3 pt-4')}>
              <DayRuler s={snapshot} />
            </div>
          )}
        </div>
      </div>

      {/* Mobil: haritanın altında akan bölümler */}
      <div className="space-y-8 px-4 py-6 lg:hidden">
        {snapshot ? <AgentPanel s={snapshot} /> : <PanelSkeleton offline={status === 'offline'} />}
        {snapshot && (
          <section>
            <h2 className="font-display text-base font-semibold">Bugünün planı</h2>
            <div className="mt-3">
              <PlanList s={snapshot} />
            </div>
          </section>
        )}
        {snapshot && <Goals goals={snapshot.goals} />}
        <section>
          <h2 className="font-display text-base font-semibold">Neler oluyor</h2>
          <Feed className="mt-1" limit={20} />
        </section>
      </div>
    </main>
  )
}

function PanelSkeleton({ offline }: { offline: boolean }) {
  if (offline)
    return (
      <div className="space-y-2 text-sm">
        <p className="font-medium">Simülasyona bağlanılamadı</p>
        <p className="text-muted-foreground">
          API çalışmıyor olabilir. `pnpm dev` ile başlatıp sayfayı yenileyin.
        </p>
      </div>
    )
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Skeleton className="size-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-20 w-full" />
    </div>
  )
}
