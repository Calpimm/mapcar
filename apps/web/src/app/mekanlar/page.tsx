import type { Metadata } from 'next'
import { PlacesPage } from '@/components/pages/places-page'

export const metadata: Metadata = { title: 'Mekanlar' }

export default function Page() {
  return <PlacesPage />
}
