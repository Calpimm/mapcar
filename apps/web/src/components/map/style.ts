import { getVersion, type Map as MlMap, setWorkerUrl } from 'maplibre-gl'

setWorkerUrl(`/maplibre/worker-${getVersion()}.mjs`)

export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'
export const MAGUSA: [number, number] = [33.927, 35.138]

/** Positron'u Mağusa paletine çeker ve etiketleri Türkçe gösterir. */
export function tuneStyle(map: MlMap) {
  const style = map.getStyle()
  for (const layer of style.layers ?? []) {
    const id = layer.id
    try {
      if (layer.type === 'background') map.setPaintProperty(id, 'background-color', '#f2efe8')
      if (id === 'water') map.setPaintProperty(id, 'fill-color', '#b9d3e3')
      if (id === 'park' || id === 'landcover_wood')
        map.setPaintProperty(id, 'fill-color', '#dfe6cf')
      if (id === 'landuse_residential') map.setPaintProperty(id, 'fill-color', '#ebe5d9')
      if (id === 'building') map.setPaintProperty(id, 'fill-color', '#e2d7c1')
      if (layer.type === 'line' && /^highway_(major|motorway)_inner/.test(id))
        map.setPaintProperty(id, 'line-color', '#ffffff')
      if (layer.type === 'line' && /casing/.test(id))
        map.setPaintProperty(id, 'line-color', '#d8d0c0')
      if (layer.type === 'symbol' && layer.layout?.['text-field'] && !/shield/.test(id)) {
        map.setLayoutProperty(id, 'text-field', [
          'coalesce',
          ['get', 'name:tr'],
          ['get', 'name:latin'],
          ['get', 'name'],
        ])
      }
    } catch {
      // Stil değişirse sessizce geç
    }
  }
}

export type CategoryGroup = 'food' | 'sight' | 'sea' | 'daily' | 'life'

export const GROUP_OF: Record<string, CategoryGroup> = {
  RESTAURANT: 'food',
  CAFE: 'food',
  FAST_FOOD: 'food',
  BAR: 'food',
  LANDMARK: 'sight',
  PARK: 'sight',
  BEACH: 'sea',
  MARKET: 'daily',
  MALL: 'daily',
  GAS_STATION: 'daily',
  CAR_DEALER: 'daily',
  MECHANIC: 'daily',
  GYM: 'daily',
  HOME: 'life',
  WORK: 'life',
}

export const GROUP_COLOR: Record<CategoryGroup, string> = {
  food: '#f07b1a',
  sight: '#b08a3e',
  sea: '#2e74a6',
  daily: '#7a8796',
  life: '#1a2230',
}
