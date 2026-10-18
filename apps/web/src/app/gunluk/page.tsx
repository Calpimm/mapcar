import type { Metadata } from 'next'
import { DiaryPage } from '@/components/pages/diary-page'

export const metadata: Metadata = { title: 'Günlük' }

export default function Page() {
  return <DiaryPage />
}
