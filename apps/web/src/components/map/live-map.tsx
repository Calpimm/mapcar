'use client'

import type { Place } from '@mapcar/contracts'
import { cumulative, hourOf, type LngLat, pointAlong } from '@mapcar/sim'
import MapGL, { Layer, type MapRef, NavigationControl, Popup, Source } from '@vis.gl/react-maplibre'
import { LocateFixed } from 'lucide-react'
import type { ExpressionSpecification } from 'maplibre-gl'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { isNight, mapFilter } from '@/lib/ambient'
import { useLive } from '@/lib/live-store'
import { cn } from '@/lib/utils'
import { CarMarker } from './car-marker'
import { PlacePopup } from './place-popup'
import { GROUP_COLOR, GROUP_OF, MAGUSA, MAP_STYLE, tuneStyle } from './style'

const TICK_MS = 1000
const DONE_COLOR = '#f07b1a'
const TODO_COLOR = 'rgba(18,59,92,0.55)'

const progressGradient = (p: number): ExpressionSpecification => {
  const t = Math.min(0.999, Math.max(0.001, p))
  return ['step', ['line-progress'], DONE_COLOR, t, TODO_COLOR]
}

export function LiveMap({ places, className }: { places: Place[]; className?: string }) {
  const mapRef = useRef<MapRef>(null)
  const carRef = useRef<CarMarker | null>(null)
  const followRef = useRef(true)
  const [follow, setFollow] = useState(true)
  const [ready, setReady] = useState(false)
  const [selected, setSelected] = useState<Place | null>(null)
  const [hovering, setHovering] = useState(false)

  const snapshot = useLive((s) => s.snapshot)
  const route = useLive((s) => s.route)
  const hour = snapshot ? hourOf(snapshot.clock) : 12
  const targetId = snapshot?.activity.placeId ?? null

  const placesGeo = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: places.map((p) => ({
        type: 'Feature' as const,
        id: p.id,
        geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
        properties: {
          id: p.id,
          name: p.name,
          color: GROUP_COLOR[GROUP_OF[p.category] ?? 'daily'],
          rated: p.reviewCount > 0 ? 1 : 0,
          major:
            p.category === 'LANDMARK' ||
            p.category === 'HOME' ||
            p.category === 'WORK' ||
            p.category === 'BEACH'
              ? 1
              : 0,
        },
      })),
    }),
    [places],
  )

  const routeGeo = useMemo(
    () =>
      route
        ? {
            type: 'Feature' as const,
            properties: {},
            geometry: { type: 'LineString' as const, coordinates: route.geometry },
          }
        : { type: 'FeatureCollection' as const, features: [] },
    [route],
  )

  // Araba: her karede sunucudan gelen iki durum arasında rota üzerinde enterpolasyon
  useEffect(() => {
    if (!ready) return
    const map = mapRef.current?.getMap()
    if (!map) return
    const car = new CarMarker()
    carRef.current = car
    car.marker.setLngLat(MAGUSA).addTo(map)

    let cum: number[] = []
    let cumFor: LngLat[] | null = null
    let raf = 0
    let lastProgress = -1

    const frame = () => {
      raf = requestAnimationFrame(frame)
      const { snapshot: snap, previous: prev, receivedAt, route: r } = useLive.getState()
      if (!snap) return
      const t = Math.min(1, (performance.now() - receivedAt) / TICK_MS)
      let pos: LngLat = snap.position
      let heading = snap.heading
      const driving = snap.activity.kind === 'driving' && r && r.key === snap.routeKey

      if (driving && r) {
        if (cumFor !== r.geometry) {
          cum = cumulative(r.geometry)
          cumFor = r.geometry
        }
        const total = cum[cum.length - 1] ?? 0
        const p1 = snap.activity.progress ?? 0
        const p0 =
          prev?.routeKey === snap.routeKey && prev.activity.kind === 'driving'
            ? (prev.activity.progress ?? 0)
            : p1
        const p = p0 + (p1 - p0) * t
        const at = pointAlong(r.geometry, cum, p * total)
        pos = at.point
        heading = at.bearing
        if (Math.abs(p - lastProgress) > 0.0005 && map.getLayer('route-line')) {
          map.setPaintProperty('route-line', 'line-gradient', progressGradient(p))
          lastProgress = p
        }
      } else if (prev) {
        pos = [
          prev.position[0] + (snap.position[0] - prev.position[0]) * t,
          prev.position[1] + (snap.position[1] - prev.position[1]) * t,
        ]
      }
      car.setPose(pos, heading)
      if (followRef.current && !map.isMoving()) map.jumpTo({ center: pos })
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      car.marker.remove()
      carRef.current = null
    }
  }, [ready])

  useEffect(() => {
    const car = carRef.current
    if (!car || !snapshot) return
    car.setColor(snapshot.car?.model.color ?? '#b9a888')
    car.setNight(isNight(hour))
    car.setMoving(snapshot.activity.kind === 'driving')
  }, [snapshot, hour])

  // Uzun yolculuklarda kamerayı biraz uzaklaştır
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || !route || !followRef.current) return
    const zoom = route.distanceM > 25_000 ? 11.5 : route.distanceM > 6_000 ? 13.4 : 14.6
    map.easeTo({ zoom, duration: 1200 })
  }, [route])

  const enableFollow = () => {
    followRef.current = true
    setFollow(true)
    const s = useLive.getState().snapshot
    if (s) mapRef.current?.getMap().easeTo({ center: s.position, zoom: 14.6, duration: 900 })
  }

  return (
    <div
      className={cn('map-shell relative h-full w-full overflow-hidden', className)}
      style={{ ['--map-filter' as string]: mapFilter(hour) }}
    >
      <MapGL
        ref={mapRef}
        mapStyle={MAP_STYLE}
        initialViewState={{ longitude: MAGUSA[0], latitude: MAGUSA[1], zoom: 14.2 }}
        minZoom={8}
        maxZoom={18}
        maxBounds={[32.0, 34.6, 35.2, 36.0]}
        attributionControl={{ compact: true }}
        interactiveLayerIds={['places-dot']}
        cursor={hovering ? 'pointer' : 'grab'}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onLoad={(e) => {
          tuneStyle(e.target)
          setReady(true)
        }}
        onDragStart={() => {
          followRef.current = false
          setFollow(false)
        }}
        onClick={(e) => {
          const f = e.features?.[0]
          const p = f ? places.find((x) => x.id === f.properties?.id) : null
          setSelected(p ?? null)
        }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        <Source id="route" type="geojson" data={routeGeo} lineMetrics>
          <Layer
            id="route-casing"
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{
              'line-color': '#ffffff',
              'line-width': ['interpolate', ['linear'], ['zoom'], 10, 4, 16, 10],
              'line-opacity': 0.9,
            }}
          />
          <Layer
            id="route-line"
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{
              'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 16, 5.5],
              'line-gradient': progressGradient(0),
            }}
          />
        </Source>

        <Source id="places" type="geojson" data={placesGeo}>
          <Layer
            id="places-target"
            type="circle"
            filter={['==', ['get', 'id'], targetId ?? '']}
            paint={{
              'circle-radius': 14,
              'circle-color': 'rgba(240,123,26,0.15)',
              'circle-stroke-color': '#f07b1a',
              'circle-stroke-width': 1.5,
            }}
          />
          <Layer
            id="places-dot"
            type="circle"
            paint={{
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                9,
                ['+', 2, ['get', 'major']],
                15,
                ['+', 5, ['*', 2, ['get', 'major']]],
              ],
              'circle-color': ['get', 'color'],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1.5,
            }}
          />
          <Layer
            id="places-label"
            type="symbol"
            minzoom={13.5}
            filter={['any', ['==', ['get', 'major'], 1], ['>=', ['zoom'], 15]]}
            layout={{
              'text-field': ['get', 'name'],
              'text-font': ['Noto Sans Regular'],
              'text-size': 11.5,
              'text-offset': [0, 1.1],
              'text-anchor': 'top',
              'text-max-width': 9,
            }}
            paint={{
              'text-color': '#1a2230',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.4,
            }}
          />
        </Source>

        {selected && (
          <Popup
            longitude={selected.lng}
            latitude={selected.lat}
            offset={14}
            closeButton={false}
            onClose={() => setSelected(null)}
            maxWidth="280px"
            className="mapcar-popup"
          >
            <PlacePopup place={selected} />
          </Popup>
        )}
      </MapGL>

      {!follow && (
        <Button
          size="sm"
          onClick={enableFollow}
          className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full shadow-lg"
        >
          <LocateFixed className="size-4" />
          Deniz&apos;i takip et
        </Button>
      )}
    </div>
  )
}
