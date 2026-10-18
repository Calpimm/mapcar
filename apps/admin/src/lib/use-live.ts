'use client'

import type { LiveSnapshot } from '@mapcar/contracts'
import { useEffect, useState } from 'react'

/** Herkese açık SSE akışından anlık durumu dinler. */
export function useLiveSnapshot(apiUrl: string, initial: LiveSnapshot | null) {
  const [snap, setSnap] = useState(initial)
  const [online, setOnline] = useState(true)
  useEffect(() => {
    const es = new EventSource(`${apiUrl}/v1/stream`)
    es.addEventListener('snapshot', (e) => {
      setSnap(JSON.parse(e.data) as LiveSnapshot)
      setOnline(true)
    })
    es.onerror = () => setOnline(false)
    return () => es.close()
  }, [apiUrl])
  return { snap, online }
}
