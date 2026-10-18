'use client'

import type { FeedEvent, LiveSnapshot, Route } from '@mapcar/contracts'
import { useEffect } from 'react'
import { API_URL, api } from './api'
import { useLive } from './live-store'

/** SSE bağlantısını kurar; tarayıcı koptuğunda kendisi yeniden bağlanır. */
export function useLiveConnection() {
  useEffect(() => {
    const store = useLive.getState()
    const es = new EventSource(`${API_URL}/v1/stream`)
    es.addEventListener('snapshot', (e) => store.pushSnapshot(JSON.parse(e.data) as LiveSnapshot))
    es.addEventListener('route', (e) => store.setRoute(JSON.parse(e.data) as Route | null))
    es.addEventListener('event', (e) => store.pushEvent(JSON.parse(e.data) as FeedEvent))
    es.onerror = () =>
      store.setStatus(es.readyState === EventSource.CLOSED ? 'offline' : 'connecting')

    api<{ items: FeedEvent[] }>('/v1/events?limit=40')
      .then((r) => store.seedEvents(r.items))
      .catch(() => {})

    return () => es.close()
  }, [])
}
