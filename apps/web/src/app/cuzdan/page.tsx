import type { Metadata } from 'next'
import { WalletPage } from '@/components/pages/wallet-page'

export const metadata: Metadata = { title: 'Cüzdan' }

export default function Page() {
  return <WalletPage />
}
