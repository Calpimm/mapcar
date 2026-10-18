import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function NeedBar({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: number
}) {
  const low = value < 25
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className={cn('size-3.5', low && 'text-kiraz')} aria-hidden />
          {label}
        </span>
        <span className={cn('tabular font-medium', low && 'text-kiraz')}>{Math.round(value)}</span>
      </div>
      <div
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label={label}
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-700 ease-out',
            low ? 'bg-kiraz' : 'bg-korfez dark:bg-primary',
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}
