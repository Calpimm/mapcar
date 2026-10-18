import { CATEGORY_LABEL, type Place } from '@mapcar/contracts'
import Link from 'next/link'
import { Stars } from '@/components/site/stars'

export function PlacePopup({ place }: { place: Place }) {
  return (
    <div className="w-60 font-sans text-foreground">
      <p className="text-xs text-muted-foreground">
        {CATEGORY_LABEL[place.category]}, {place.city}
      </p>
      <p className="mt-0.5 font-display text-base font-semibold leading-tight">{place.name}</p>
      {place.description && (
        <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">{place.description}</p>
      )}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        {place.rating !== null ? (
          <span className="flex items-center gap-1.5 text-xs">
            <Stars value={place.rating} size={12} />
            <span className="tabular text-muted-foreground">{place.reviewCount} yorum</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Deniz henüz uğramadı</span>
        )}
        <Link
          href={`/mekanlar/${place.slug}`}
          className="text-xs font-medium text-korfez underline-offset-4 hover:underline dark:text-primary"
        >
          Ayrıntılar
        </Link>
      </div>
    </div>
  )
}
