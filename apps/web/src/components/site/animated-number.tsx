'use client'

import { animate, useMotionValue, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'

/** Değer değişince yumuşakça sayan rakam (para, km...). */
export function AnimatedNumber({
  value,
  format,
}: {
  value: number
  format: (n: number) => string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const mv = useMotionValue(value)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (reduce) {
      mv.set(value)
      if (ref.current) ref.current.textContent = format(value)
      return
    }
    const controls = animate(mv, value, { duration: 0.8, ease: [0.22, 1, 0.36, 1] })
    return controls.stop
  }, [value, mv, reduce, format])

  useEffect(
    () => mv.on('change', (v) => ref.current && (ref.current.textContent = format(v))),
    [mv, format],
  )

  return (
    <span ref={ref} className="tabular">
      {format(value)}
    </span>
  )
}
