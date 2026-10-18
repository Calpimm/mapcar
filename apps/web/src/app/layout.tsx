import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Onest } from 'next/font/google'
import type { ReactNode } from 'react'
import { Providers } from '@/components/site/providers'
import { SiteHeader } from '@/components/site/site-header'
import './globals.css'

const onest = Onest({ subsets: ['latin', 'latin-ext'], variable: '--font-onest', display: 'swap' })
const bricolage = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-bricolage',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: "mapcar · Deniz'in Mağusa günlüğü", template: '%s · mapcar' },
  description:
    "Gazimağusa'da kendi hayatını yaşayan sanal bir sürücü: işe gidiyor, para biriktiriyor, mekanları puanlıyor. Canlı izleyin.",
  openGraph: { locale: 'tr_TR', type: 'website' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafaf7' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1620' },
  ],
}

// Sistem tercihine göre koyu tema; FOUC olmaması için hidrasyondan önce uygulanır
const themeScript = `try{if(matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.classList.add('dark')}catch(e){}`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" className={`${onest.variable} ${bricolage.variable}`} suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: sabit tema betiği */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh pb-16 font-sans sm:pb-0">
        <Providers>
          <SiteHeader />
          {children}
        </Providers>
      </body>
    </html>
  )
}
