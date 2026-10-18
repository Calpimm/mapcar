import type { Metadata } from 'next'
import { GaragePage } from '@/components/pages/garage-page'

export const metadata: Metadata = { title: 'Garaj' }

export default function Page() {
  return <GaragePage />
}
