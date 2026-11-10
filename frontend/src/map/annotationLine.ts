import { MercatorCoordinate } from 'maplibre-gl'
import type { Annotation } from '../types/types'

// a drawn line annotation keeps its points in `line`. Its `geometry` stays a Point (a point along the line),
// so what works on every annotation's point, like flying to it, works on lines too

const round = (v: number) => Math.round(v * 1e7) / 1e7

// the fields a line sets from its drawn points
export function lineFields(points: number[][]): Pick<Annotation, 'geometry' | 'line'> {
  const rounded = points.map(([lng, lat]) => [round(lng), round(lat)])
  return {
    line: JSON.stringify(rounded),
    geometry: JSON.stringify({ type: 'Point', coordinates: rounded[Math.floor(rounded.length / 2)] }),
  }
}

// the direction a line ends in, as clockwise degrees from north, for its arrowhead. Measured from a bit
// back along the line (a fiftieth of its length), so a freehand line's last tiny wiggle doesn't turn it.
// In Web Mercator, so it matches the line as drawn on screen
export function endBearing(points: number[][]): number {
  const merc = points.map(([lng, lat]) => MercatorCoordinate.fromLngLat([lng, lat]))
  const dist = (a: MercatorCoordinate, b: MercatorCoordinate) => Math.hypot(b.x - a.x, b.y - a.y)
  let total = 0
  for (let i = 1; i < merc.length; i++) total += dist(merc[i - 1], merc[i])
  const end = merc[merc.length - 1]
  let from = merc[Math.max(0, merc.length - 2)]
  for (let i = merc.length - 2; i >= 0; i--) {
    from = merc[i]
    if (dist(from, end) >= total / 50) break
  }
  // Mercator y grows southward
  return (Math.atan2(end.x - from.x, from.y - end.y) * 180) / Math.PI
}

// the annotation with its point at `to`; a line moves along with it, in Web Mercator so it keeps its
// shape on screen (a plain lng/lat shift would stretch it moving north or south)
export function moveAnnotationTo(annotation: Annotation, to: { lng: number; lat: number }): Annotation {
  if (!annotation.line) return { ...annotation, geometry: JSON.stringify({ type: 'Point', coordinates: [to.lng, to.lat] }) }

  const from = MercatorCoordinate.fromLngLat(JSON.parse(annotation.geometry).coordinates as [number, number])
  const target = MercatorCoordinate.fromLngLat(to)
  const points = (JSON.parse(annotation.line) as [number, number][]).map((point) => {
    const p = MercatorCoordinate.fromLngLat(point)
    const moved = new MercatorCoordinate(p.x + target.x - from.x, p.y + target.y - from.y).toLngLat()
    return [moved.lng, moved.lat]
  })
  return { ...annotation, ...lineFields(points) }
}
