'use client'

import {
  Briefcase,
  CarFront,
  Gauge,
  LogOut,
  MapPin,
  ScrollText,
  SquareArrowOutUpRight,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { logout } from '@/lib/actions'

const NAV = [
  { href: '/', label: 'Panel', icon: Gauge },
  { href: '/yerler', label: 'Yerler', icon: MapPin },
  { href: '/arabalar', label: 'Arabalar', icon: CarFront },
  { href: '/isler', label: 'İşler', icon: Briefcase },
  { href: '/olaylar', label: 'Olay kaydı', icon: ScrollText },
]

export function AppSidebar({ siteUrl }: { siteUrl: string }) {
  const path = usePathname()
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-narenciye font-display text-sm font-bold text-white">
            m
          </span>
          <span className="font-display font-bold tracking-tight group-data-[collapsible=icon]:hidden">
            mapcar yönetim
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((n) => (
                <SidebarMenuItem key={n.href}>
                  <SidebarMenuButton
                    asChild
                    tooltip={n.label}
                    isActive={n.href === '/' ? path === '/' : path.startsWith(n.href)}
                  >
                    <Link href={n.href}>
                      <n.icon />
                      <span>{n.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Siteyi aç">
              <a href={siteUrl} target="_blank" rel="noreferrer">
                <SquareArrowOutUpRight />
                <span>Siteyi aç</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={logout}>
              <SidebarMenuButton type="submit" tooltip="Çıkış yap">
                <LogOut />
                <span>Çıkış yap</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
