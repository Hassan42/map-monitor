import { difference } from '@turf/difference'
import { featureCollection, polygon } from '@turf/helpers'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import type { Territory } from '../types/types'

// territory fills are drawn by this layer, not by terra-draw (which keeps selecting and editing). A
// territory marked "cut beneath" hides the ones under it: they're filled, and bordered, only where it
// doesn't cover them, so that overlap shows its color instead of the two see-through colors mixed
export const TERRITORY_FILL_SOURCE_ID = 'territory-fills'
// td- prefix: kept below events and annotations together with terra-draw's own layers (TerraDrawContext)
export const TERRITORY_FILL_LAYER_ID = 'td-territory-fills'
// borders around the same visible parts: a territory's border stops where one above it begins
export const TERRITORY_BORDER_LAYER_ID = 'td-territory-borders'
export const TERRITORY_FILL_OPACITY = 0.4
export const TERRITORY_HIGHLIGHT_OPACITY = 0.6

type Box = [number, number, number, number]
type FillProps = { territoryId: number; color: string }
export type TerritoryFill = Feature<Polygon | MultiPolygon, FillProps>

function boxOf(rings: number[][][]): Box {
  const box: Box = [Infinity, Infinity, -Infinity, -Infinity]
  for (const [x, y] of rings[0] ?? []) {
    box[0] = Math.min(box[0], x)
    box[1] = Math.min(box[1], y)
    box[2] = Math.max(box[2], x)
    box[3] = Math.max(box[3], y)
  }
  return box
}
const overlaps = (a: Box, b: Box) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3]

// `territories` bottom first (the drawing order). Only the display changes: saved shapes stay as they are
export function visibleFills(territories: Territory[]): FeatureCollection<Polygon | MultiPolygon, FillProps> {
  const shapes = territories.map((t) => {
    const rings = JSON.parse(t.points) as number[][][]
    return { t, rings, box: boxOf(rings) }
  })
  const features: TerritoryFill[] = []
  shapes.forEach(({ t, rings, box }, i) => {
    const properties = { territoryId: t.id, color: t.color }
    let geometry: Polygon | MultiPolygon | null = { type: 'Polygon', coordinates: rings }
    const above = shapes.slice(i + 1).filter((s) => s.t.cutBeneath === true && overlaps(box, s.box))
    if (above.length > 0) {
      try {
        geometry = difference(featureCollection([polygon(rings), ...above.map((s) => polygon(s.rings))]))?.geometry ?? null
      } catch {
        // a shape the cut can't handle (e.g. one that crosses itself): fill it whole
      }
    }
    if (geometry) features.push({ type: 'Feature', geometry, properties }) // null: fully covered
  })
  return { type: 'FeatureCollection', features }
}
