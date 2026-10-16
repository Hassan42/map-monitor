import { LngLatBounds } from 'maplibre-gl'
import type { LngLat } from 'maplibre-gl'
import type { EventMarker, Territory } from '../types/types'

// ray casting against the outer ring (holes ignored); point and ring are [lng, lat]
export function pointInRing([x, y]: number[], ring: number[][]) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

// topmost territory under a point; last drawn is on top, so search from the end
export function findTerritoryAt(territories: Territory[], lngLat: LngLat) {
  const point = [lngLat.lng, lngLat.lat]
  return [...territories].reverse().find((t) => pointInRing(point, (JSON.parse(t.points) as number[][][])[0]))
}

// smallest box containing every territory and event; null when there's nothing on the map
export function boundsOf(territories: Territory[], events: EventMarker[]) {
  const bounds = new LngLatBounds()
  for (const e of events) bounds.extend([e.longitude, e.latitude])
  for (const t of territories) {
    for (const [lng, lat] of (JSON.parse(t.points) as number[][][])[0]) bounds.extend([lng, lat])
  }
  return bounds.isEmpty() ? null : bounds
}
