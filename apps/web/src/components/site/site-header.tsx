'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { SimClock } from './sim-clock'

const NAV = [
  { href: '/', label: 'Canlı' },
  { href: '/mekanlar', label: 'Mekanlar' },
  { href: '/gunluk', label: 'Günlük' },
  { href: '/garaj', label: 'Garaj' },
  { href: '/cuzdan', label: 'Cüzdan' },
]

export function SiteHeader() {
  const path = usePathname()
  return (
    <header className="relative z-30 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4 sm:gap-8">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="mapcar ana sayfa">
          <Logo />
          <span className="font-display text-lg font-bold tracking-tight">mapcar</span>
        </Link>
        <nav
          aria-label="Ana menü"
          className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]"
        >
          {NAV.map((n) => {
            const active = n.href === '/' ? path === '/' : path.startsWith(n.href)
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {n.label}
              </Link>
            )
          })}
        </nav>
        <SimClock />
      </div>
    </header>
  )
}

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
      <path
        d="M16 2c-6.1 0-11 4.8-11 10.8C5 20.6 16 30 16 30s11-9.4 11-17.2C27 6.8 22.1 2 16 2Z"
        fill="var(--korfez)"
      />
      <rect x="11" y="8" width="10" height="15" rx="4" fill="var(--narenciye)" />
      <rect x="12.6" y="11" width="6.8" height="3.2" rx="1.2" fill="#123b5c" opacity=".85" />
    </svg>
  )
}
