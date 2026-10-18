import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Stars({
  value,
  size = 14,
  className,
}: {
  value: number
  size?: number
  className?: string
}) {
  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      role="img"
      aria-label={`5 üzerinden ${value.toFixed(1)} yıldız`}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i + 1))
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star
              className="absolute inset-0 text-tas/45"
              style={{ width: size, height: size }}
              strokeWidth={1.5}
            />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star
                className="fill-narenciye text-narenciye"
                style={{ width: size, height: size }}
                strokeWidth={1.5}
              />
            </span>
          </span>
        )
      })}
    </span>
  )
}
