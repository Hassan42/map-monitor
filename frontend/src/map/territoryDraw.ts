import { MaplibreMeasureControl, defaultMeasureControlOptions } from '@watergis/maplibre-gl-terradraw'
import '@watergis/maplibre-gl-terradraw/dist/maplibre-gl-terradraw.css'
import { TerraDrawPolygonMode, TerraDrawSelectMode, TerraDrawFreehandMode } from 'terra-draw'
import type { TerraDraw, TerraDrawMouseEvent, GeoJSONStoreFeatures, HexColor, TerraDrawAdapterStyling } from 'terra-draw'
import type { Map } from 'maplibre-gl'
import { EVENTS_CLUSTER_LAYER_ID, EVENTS_LAYER_ID } from './mapLayers'
import { findAnnotationAt } from './annotationHitTest'
import { pointInRing } from './geometry'

// saved territories carry their color in properties; new unsaved drawings fall back to blue
export const territoryColor = (f: GeoJSONStoreFeatures) => (f.properties.color as HexColor | undefined) ?? '#3f97e0'

// view-mode selection (set by the highlight effect); styled like terra-draw's edit-mode selection
export const isHighlighted = (f: GeoJSONStoreFeatures) => f.properties.highlighted === true

// select-mode finish actions that change a polygon's shape
export const EDIT_ACTIONS = ['edit', 'deleteCoordinate', 'insertMidpoint', 'dragCoordinate', 'dragFeature', 'dragCoordinateResize']

// the ruler's lines: terra-draw's linestring mode, measured by the control
export const RULER_MODE = 'linestring'
// a line annotation drawn by dragging, like freehand territories but left open
export const FREEHAND_LINE_MODE = 'freehand-linestring'

// true when the pointer is over an event or annotation: terra-draw leaves the click to them, and drops
// its own polygon selection so the two aren't selected at once
function isOverEvent(map: Map, terraDraw: TerraDraw | undefined, e: TerraDrawMouseEvent) {
  const layers = [EVENTS_LAYER_ID, EVENTS_CLUSTER_LAYER_ID].filter((id) => map.getLayer(id))
  const eventSelected =
    (layers.length > 0 && map.queryRenderedFeatures([e.containerX, e.containerY], { layers }).length > 0) ||
    findAnnotationAt(map, [e.containerX, e.containerY]) != null
  const selectedFeature = terraDraw
    ?.getSnapshot()
    .find((f) => f.properties.selected === true && f.geometry.type === 'Polygon')
  const selectedFeatureID = selectedFeature?.id
  if (selectedFeatureID != null && eventSelected) terraDraw?.deselectFeature(selectedFeatureID)
  return eventSelected
}

// terra-draw gives every polygon the same zIndex, so overlapping territories swap places whenever one
// is re-rendered (selected, deselected). Each territory's `stack` (its place in the drawing order, set
// when loaded) decides instead; a shape still being drawn, without one, goes on top
const stackZ = (f: GeoJSONStoreFeatures) => (typeof f.properties.stack === 'number' ? f.properties.stack : 1e6)
const stacked = (styles: TerraDrawAdapterStyling, f: GeoJSONStoreFeatures) =>
  f.geometry.type === 'Polygon' ? { ...styles, zIndex: stackZ(f) } : styles

class StackedPolygonMode extends TerraDrawPolygonMode {
  styleFeature(f: GeoJSONStoreFeatures) { return stacked(super.styleFeature(f), f) }
}
class StackedFreehandMode extends TerraDrawFreehandMode {
  styleFeature(f: GeoJSONStoreFeatures) { return stacked(super.styleFeature(f), f) }
}
class StackedSelectMode extends TerraDrawSelectMode {
  styleFeature(f: GeoJSONStoreFeatures) { return stacked(super.styleFeature(f), f) }
}

// terra-draw picks whichever overlapping polygon its spatial index lists last, not the one drawn on top.
// So where territories overlap, the topmost one is selected here; false = terra-draw keeps the click.
// When the topmost is already selected, a click near one of its midpoints is left to terra-draw (adds a
// point there); any other click keeps it selected instead of jumping to one beneath
const MIDPOINT_DISTANCE = 40 // px, terra-draw's default pointer distance
function selectTopmost(map: Map, terraDraw: TerraDraw | undefined, e: TerraDrawMouseEvent) {
  if (!terraDraw) return false
  const snapshot = terraDraw.getSnapshot()
  const under = snapshot
    .filter((f) => f.geometry.type === 'Polygon' && f.properties.mode !== RULER_MODE &&
      pointInRing([e.lng, e.lat], (f.geometry.coordinates as number[][][])[0]))
    .sort((a, b) => stackZ(a) - stackZ(b))
  if (under.length < 2) return false
  const top = under[under.length - 1]
  if (top.properties.selected !== true) {
    terraDraw.selectFeature(top.id!)
    return true
  }
  const nearMidpoint = snapshot.some((f) => {
    if (f.properties.midPoint !== true || f.geometry.type !== 'Point') return false
    const p = map.project(f.geometry.coordinates as [number, number])
    return Math.hypot(p.x - e.containerX, p.y - e.containerY) < MIDPOINT_DISTANCE
  })
  return !nearMidpoint
}

// the map's one terra-draw control: territory drawing and editing, and the ruler's measured lines.
// The measure control is the territory control plus distance/area labels
export function createTerraDrawControl(map: Map): MaplibreMeasureControl {
  const draw: MaplibreMeasureControl = new MaplibreMeasureControl({
    modes: [
      'polygon',
      'freehand',
      'select',
      'delete-selection',
      RULER_MODE,
      FREEHAND_LINE_MODE,
    ],
    open: true,
    // deleting now removes the territory on the backend, so ask first
    showDeleteConfirmation: true,
    modeOptions: {
      freehand: new StackedFreehandMode({
        minDistance: 15,
        smoothing: 0.4,
        styles: { /* same territory styling as polygon, so it matches */ },
      }),

      polygon: new StackedPolygonMode({
        styles: {
          fillColor: territoryColor,
          // saved territories are filled by their own layer (territoryFill.ts), so overlaps don't mix colors;
          // terra-draw fills only a shape being drawn, and one it shows itself while it's moved (ownFill)
          fillOpacity: (f) => (f.properties.territoryId == null || f.properties.ownFill === true ? 0.4 : 0),
          outlineColor: (f) => (isHighlighted(f) ? '#ffffff' : territoryColor(f)),
          // saved territories get their borders from the fill layer (only around their visible part); terra-draw
          // draws one on a highlighted territory, a shape still being drawn, and one being moved
          outlineWidth: (f) => (isHighlighted(f) || f.properties.territoryId == null || f.properties.ownFill === true ? 1 : 0),
        },
      }),
      select: new StackedSelectMode({
        // the control fills in its default flags (drag/edit rules) for any mode not listed. Territories
        // (polygon; freehand before they're saved) keep those defaults, except dragging the whole
        // shape: that's right-click > Move, so a stray drag can't shift a territory
        flags: {
          polygon: {
            feature: {
              draggable: false,
              rotateable: true,
              scaleable: true,
              selfIntersectable: true, // or points on an already self-intersecting shape can't be moved
              coordinates: { midpoints: true, draggable: true, deletable: true },
            },
          },
          freehand: {
            feature: {
              draggable: false,
              coordinates: { midpoints: true, draggable: true, deletable: true },
            },
          },
        },
        styles: {
          selectedPolygonColor: territoryColor,
          selectedPolygonFillOpacity: 0.6,
          selectedPolygonOutlineColor: '#ffffff',
          selectedPolygonOutlineWidth: 1,
        },
        pointerEvents: {
          leftClick: (e) => !isOverEvent(map, draw.getTerraDrawInstance(), e) && !selectTopmost(map, draw.getTerraDrawInstance(), e),
          onDragStart: (e) => !isOverEvent(map, draw.getTerraDrawInstance(), e),
          rightClick: true,
          contextMenu: false,
          onDrag: true,
          onDragEnd: true,
        }
      }),
    },
    measureUnitType: 'metric',
    distancePrecision: 2,
    computeElevation: false,
    // territories get no area labels; only the ruler's lines are measured on screen. A copy: the control
    // writes its prefix into the spec's id and source
    polygonLayerSpec: {
      ...structuredClone(defaultMeasureControlOptions.polygonLayerSpec!),
      layout: { ...defaultMeasureControlOptions.polygonLayerSpec!.layout, visibility: 'none' },
    },
  })
  // label font: one the base style's glyph server has (OpenFreeMap bright), or the labels don't render.
  // Only a setter, not a constructor option
  draw.fontGlyphs = ['Noto Sans Regular']
  return draw
}
