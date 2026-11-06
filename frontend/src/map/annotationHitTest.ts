import type { Map, PointLike } from 'maplibre-gl'
import { Point } from 'maplibre-gl'
import { ANNOTATIONS_SOURCE_ID } from './mapLayers'
import { ICON_RADIUS_PX, displayedIconSize } from './annotationScale'

// a click has to land within this share of the drawn icon's radius: a bit inside its edge,
// since the drawings don't fill their square box
const HIT_RADIUS_FACTOR = 0.85
// a drawn line is thin: a click this close to it counts
const LINE_HIT_PX = 8

// how far a screen point is from a line given by its points
function distanceToLine(map: Map, point: Point, coordinates: number[][]) {
  let best = Infinity
  for (let i = 0; i + 1 < coordinates.length; i++) {
    const a = map.project(coordinates[i] as [number, number])
    const b = map.project(coordinates[i + 1] as [number, number])
    const dx = b.x - a.x
    const dy = b.y - a.y
    const lengthSq = dx * dx + dy * dy
    const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq))
    best = Math.min(best, point.dist(new Point(a.x + t * dx, a.y + t * dy)))
  }
  return best
}

// which annotation (if any) is under a screen point. MapLibre's own hit boxes for zoom-dependent
// icon sizes are laid out per tile at a bigger size than what's drawn, so clicks well beside an
// annotation counted as on it; this checks against the drawn circle instead (same size as the
// selection ring). Overlapping annotations: the one whose center is closest wins. Drawn lines count by
// their distance to the line
export function findAnnotationAt(map: Map, at: PointLike): number | null {
  const point = Point.convert(at)
  const zoom = map.getZoom()
  let best: { id: number; distance: number } | null = null

  // features from the loaded tiles; the same annotation can appear in several tiles
  for (const feature of map.querySourceFeatures(ANNOTATIONS_SOURCE_ID)) {
    const id = feature.properties.id as number
    // a line crossing several tiles can come back in pieces
    if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
      const pieces = feature.geometry.type === 'LineString' ? [feature.geometry.coordinates] : feature.geometry.coordinates
      const distance = Math.min(...pieces.map((piece) => distanceToLine(map, point, piece)))
      if (distance <= LINE_HIT_PX && (!best || distance < best.distance)) best = { id, distance }
      continue
    }
    if (feature.geometry.type !== 'Point') continue
    const center = map.project(feature.geometry.coordinates as [number, number])
    const radius = ICON_RADIUS_PX * displayedIconSize(feature.properties.scale as number, zoom) * HIT_RADIUS_FACTOR
    const distance = center.dist(point)
    if (distance <= radius && (!best || distance < best.distance)) best = { id, distance }
  }
  return best?.id ?? null
}
