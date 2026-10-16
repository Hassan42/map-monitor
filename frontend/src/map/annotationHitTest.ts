import type { Map, PointLike } from 'maplibre-gl'
import { Point } from 'maplibre-gl'
import { ANNOTATIONS_SOURCE_ID } from './mapLayers'
import { ICON_RADIUS_PX, displayedIconSize } from './annotationScale'

// a click has to land within this share of the drawn icon's radius: a bit inside its edge,
// since the drawings don't fill their square box
const HIT_RADIUS_FACTOR = 0.85

// which annotation (if any) is under a screen point. MapLibre's own hit boxes for zoom-dependent
// icon sizes are laid out per tile at a bigger size than what's drawn, so clicks well beside an
// annotation counted as on it; this checks against the drawn circle instead (same size as the
// selection ring). Overlapping annotations: the one whose center is closest wins
export function findAnnotationAt(map: Map, at: PointLike): number | null {
  const point = Point.convert(at)
  const zoom = map.getZoom()
  let best: { id: number; distance: number } | null = null

  // features from the loaded tiles; the same annotation can appear in several tiles
  for (const feature of map.querySourceFeatures(ANNOTATIONS_SOURCE_ID)) {
    if (feature.geometry.type !== 'Point') continue
    const id = feature.properties.id as number
    const center = map.project(feature.geometry.coordinates as [number, number])
    const radius = ICON_RADIUS_PX * displayedIconSize(feature.properties.scale as number, zoom) * HIT_RADIUS_FACTOR
    const distance = center.dist(point)
    if (distance <= radius && (!best || distance < best.distance)) best = { id, distance }
  }
  return best?.id ?? null
}
