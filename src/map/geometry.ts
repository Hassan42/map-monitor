import type { LngLat } from 'maplibre-gl'
import type { Territory } from '../types/types'

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
