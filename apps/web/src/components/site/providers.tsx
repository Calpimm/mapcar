'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useLiveConnection } from '@/lib/use-live-connection'

function LiveConnection() {
  useLiveConnection()
  return null
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } }),
  )
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider delayDuration={200}>
        <LiveConnection />
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  )
}
