import type { Metadata } from 'next'
import { LiveView } from '@/components/live/live-view'

export const metadata: Metadata = { title: 'Canlı' }

export default function HomePage() {
  return <LiveView />
}
