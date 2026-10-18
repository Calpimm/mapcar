/** Garaj için büyük, yan yatırılmış üstten görünüm araba */
export function CarArt({ color, className }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 72 40" className={className} role="img" aria-label="Araba çizimi">
      <rect
        x="2"
        y="3"
        width="68"
        height="34"
        rx="13"
        fill="rgba(0,0,0,.18)"
        transform="translate(1.5 2.5)"
      />
      <rect
        x="2"
        y="3"
        width="68"
        height="34"
        rx="13"
        fill={color}
        stroke="rgba(0,0,0,.3)"
        strokeWidth="1"
      />
      <path d="M50 9 Q58 20 50 31 L41 29 Q44 20 41 11 Z" fill="#1d2836" />
      <path d="M22 11 Q19 20 22 29 L14 30 Q10 20 14 10 Z" fill="#1d2836" opacity=".9" />
      <rect x="24" y="11" width="16" height="18" rx="4" fill="rgba(255,255,255,.14)" />
      <rect x="64" y="7" width="4" height="7" rx="2" fill="#fff6d6" />
      <rect x="64" y="26" width="4" height="7" rx="2" fill="#fff6d6" />
      <rect x="4" y="7" width="3" height="7" rx="1.5" fill="#d9342b" />
      <rect x="4" y="26" width="3" height="7" rx="1.5" fill="#d9342b" />
    </svg>
  )
}
