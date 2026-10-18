'use client'

import { BookOpen, CarFront, MapPin, Radio, Wallet } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { SimClock } from './sim-clock'

const NAV = [
  { href: '/', label: 'Canlı', icon: Radio },
  { href: '/mekanlar', label: 'Mekanlar', icon: MapPin },
  { href: '/gunluk', label: 'Günlük', icon: BookOpen },
  { href: '/garaj', label: 'Garaj', icon: CarFront },
  { href: '/cuzdan', label: 'Cüzdan', icon: Wallet },
]

export function SiteHeader() {
  const path = usePathname()
  const isActive = (href: string) => (href === '/' ? path === '/' : path.startsWith(href))
  return (
    <>
      <header className="relative z-30 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4 sm:gap-8">
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="mapcar ana sayfa">
            <Logo />
            <span className="font-display text-lg font-bold tracking-tight">mapcar</span>
          </Link>
          <nav aria-label="Ana menü" className="-mx-1 hidden min-w-0 flex-1 gap-1 sm:flex">
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
          <div className="ml-auto">
            <SimClock />
          </div>
        </div>
      </header>
      {/* Mobil: alt sekme çubuğu */}
      <nav
        aria-label="Alt menü"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        {NAV.map((n) => {
          const active = isActive(n.href)
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 text-[11px]',
                active ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              <n.icon className={cn('size-5', active && 'text-narenciye')} aria-hidden />
              {n.label}
            </Link>
          )
        })}
      </nav>
    </>
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
