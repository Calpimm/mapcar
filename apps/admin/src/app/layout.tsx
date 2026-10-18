import type { Metadata } from 'next'
import { Bricolage_Grotesque, Onest } from 'next/font/google'
import type { ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const onest = Onest({ subsets: ['latin', 'latin-ext'], variable: '--font-onest', display: 'swap' })
const bricolage = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-bricolage',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'Yönetim', template: '%s · mapcar yönetim' },
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" className={`${onest.variable} ${bricolage.variable}`}>
      <body className="min-h-dvh font-sans">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
