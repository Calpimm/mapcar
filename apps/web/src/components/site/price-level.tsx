export function PriceLevel({ level }: { level: number }) {
  return (
    <span className="tabular text-sm">
      <span className="sr-only">Fiyat seviyesi 4 üzerinden {level}</span>
      <span className="text-foreground" aria-hidden>
        {'₺'.repeat(level)}
      </span>
      <span className="text-muted-foreground/40" aria-hidden>
        {'₺'.repeat(4 - level)}
      </span>
    </span>
  )
}
