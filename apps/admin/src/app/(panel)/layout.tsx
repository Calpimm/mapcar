import type { ReactNode } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar siteUrl={process.env.SITE_URL ?? 'http://localhost:3010'} />
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger />
        </header>
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
