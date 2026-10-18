'use client'

import 'maplibre-gl/dist/maplibre-gl.css'
import { getVersion, Marker, Map as MlMap, setWorkerUrl } from 'maplibre-gl'
import { useEffect, useRef } from 'react'

setWorkerUrl(`/maplibre/worker-${getVersion()}.mjs`)

/** Tıklayarak ya da işaretçiyi sürükleyerek konum seçme */
export function MapPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
}) {
  const el = useRef<HTMLElement>(null)
  const marker = useRef<Marker | null>(null)
  const cb = useRef(onChange)
  cb.current = onChange

  // Harita yalnızca bir kez kurulur; dış değişiklikler aşağıdaki effect ile senkronlanır
  // biome-ignore lint/correctness/useExhaustiveDependencies: tek seferlik kurulum
  useEffect(() => {
    if (!el.current) return
    const map = new MlMap({
      container: el.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [lng, lat],
      zoom: 14,
      attributionControl: { compact: true },
    })
    const m = new Marker({ color: '#f07b1a', draggable: true }).setLngLat([lng, lat]).addTo(map)
    m.on('dragend', () => {
      const p = m.getLngLat()
      cb.current(round(p.lat), round(p.lng))
    })
    map.on('click', (e) => {
      m.setLngLat(e.lngLat)
      cb.current(round(e.lngLat.lat), round(e.lngLat.lng))
    })
    marker.current = m
    return () => map.remove()
  }, [])

  useEffect(() => {
    const m = marker.current
    if (!m) return
    const cur = m.getLngLat()
    if (Math.abs(cur.lat - lat) > 1e-6 || Math.abs(cur.lng - lng) > 1e-6) m.setLngLat([lng, lat])
  }, [lat, lng])

  return (
    <section
      ref={el}
      className="h-56 w-full overflow-hidden rounded-md border"
      aria-label="Konum seçme haritası"
    />
  )
}

const round = (v: number) => Math.round(v * 1e5) / 1e5
