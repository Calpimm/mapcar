'use client'

import type { FeedEvent, LiveSnapshot, Route } from '@mapcar/contracts'
import { create } from 'zustand'

export type ConnectionStatus = 'connecting' | 'live' | 'offline'

interface LiveState {
  status: ConnectionStatus
  snapshot: LiveSnapshot | null
  /** Snapshot'ın alındığı an (performance.now) — araba enterpolasyonu için */
  receivedAt: number
  previous: LiveSnapshot | null
  route: Route | null
  events: FeedEvent[]
  setStatus: (s: ConnectionStatus) => void
  pushSnapshot: (s: LiveSnapshot) => void
  setRoute: (r: Route | null) => void
  pushEvent: (e: FeedEvent) => void
  seedEvents: (e: FeedEvent[]) => void
}

const MAX_EVENTS = 80

export const useLive = create<LiveState>((set) => ({
  status: 'connecting',
  snapshot: null,
  previous: null,
  receivedAt: 0,
  route: null,
  events: [],
  setStatus: (status) => set({ status }),
  pushSnapshot: (snapshot) =>
    set((s) => ({ snapshot, previous: s.snapshot, receivedAt: performance.now(), status: 'live' })),
  setRoute: (route) => set({ route }),
  pushEvent: (e) =>
    set((s) =>
      s.events.some((x) => x.id === e.id) ? s : { events: [e, ...s.events].slice(0, MAX_EVENTS) },
    ),
  seedEvents: (events) =>
    set((s) => {
      const seen = new Set(s.events.map((e) => e.id))
      return {
        events: [...s.events, ...events.filter((e) => !seen.has(e.id))].slice(0, MAX_EVENTS),
      }
    }),
}))
