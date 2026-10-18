import { ACTION_LABEL, indexWorld, PURPOSE_LABEL } from './engine'
import type { AgentState, World } from './types'

export interface ActivityView {
  kind: AgentState['activity']['kind']
  label: string
  placeId: string | null
  placeName: string | null
  /** 0-1 */
  progress: number | null
  endsAt: number | null
}

/** Arayüz için okunabilir etkinlik özeti */
export function describeActivity(state: AgentState, world: World): ActivityView {
  const idx = indexWorld(world)
  const a = state.activity
  const name = (id: string | null) => (id ? (idx.places.get(id)?.name ?? null) : null)
  switch (a.kind) {
    case 'idle':
      return {
        kind: a.kind,
        label: 'Ne yapacağını düşünüyor',
        placeId: a.placeId,
        placeName: name(a.placeId),
        progress: null,
        endsAt: null,
      }
    case 'waiting_route':
      return {
        kind: a.kind,
        label: 'Rotayı planlıyor',
        placeId: a.toPlaceId,
        placeName: name(a.toPlaceId),
        progress: 0,
        endsAt: null,
      }
    case 'driving':
      return {
        kind: a.kind,
        label: PURPOSE_LABEL[a.action],
        placeId: a.toPlaceId,
        placeName: name(a.toPlaceId),
        progress: a.distanceM > 0 ? a.progressM / a.distanceM : 1,
        endsAt: null,
      }
    case 'stopped':
      return {
        kind: a.kind,
        label: a.reason,
        placeId: a.resume.toPlaceId,
        placeName: name(a.resume.toPlaceId),
        progress: null,
        endsAt: a.until,
      }
    case 'at':
      return {
        kind: a.kind,
        label: ACTION_LABEL[a.action],
        placeId: a.placeId,
        placeName: name(a.placeId),
        progress: Math.min(1, (state.clock - a.startedAt) / Math.max(1, a.endsAt - a.startedAt)),
        endsAt: a.endsAt,
      }
  }
}
