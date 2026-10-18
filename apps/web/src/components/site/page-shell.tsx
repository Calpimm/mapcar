import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function PageShell({
  title,
  lead,
  aside,
  children,
  className,
}: {
  title: string
  lead?: ReactNode
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <main className={cn('mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:pt-14', className)}>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {title}
          </h1>
          {lead && (
            <p className="mt-3 text-base text-muted-foreground text-pretty sm:text-lg">{lead}</p>
          )}
        </div>
        {aside}
      </header>
      <div className="mt-10">{children}</div>
    </main>
  )
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-kiraz/30 bg-kiraz/5 p-4 text-sm">
      <p className="font-medium">Veriler yüklenemedi</p>
      <p className="mt-1 text-muted-foreground">
        {message}. API&apos;nin çalıştığından emin olup sayfayı yenileyin.
      </p>
    </div>
  )
}
