export function PriceLevel({ level }: { level: number }) {
  return (
    <span className="tabular text-sm" aria-label={`Fiyat seviyesi 4 üzerinden ${level}`}>
      <span className="text-foreground">{'₺'.repeat(level)}</span>
      <span className="text-muted-foreground/40">{'₺'.repeat(4 - level)}</span>
    </span>
  )
}
