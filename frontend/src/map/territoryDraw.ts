import { MaplibreMeasureControl, defaultMeasureControlOptions } from '@watergis/maplibre-gl-terradraw'
import '@watergis/maplibre-gl-terradraw/dist/maplibre-gl-terradraw.css'
import { TerraDrawPolygonMode, TerraDrawSelectMode, TerraDrawFreehandMode } from 'terra-draw'
import type { TerraDraw, TerraDrawMouseEvent, GeoJSONStoreFeatures, HexColor } from 'terra-draw'
import type { Map } from 'maplibre-gl'
import { EVENTS_CLUSTER_LAYER_ID, EVENTS_LAYER_ID } from './mapLayers'
import { findAnnotationAt } from './annotationHitTest'

// saved territories carry their color in properties; new unsaved drawings fall back to blue
export const territoryColor = (f: GeoJSONStoreFeatures) => (f.properties.color as HexColor | undefined) ?? '#3f97e0'

// view-mode selection (set by the highlight effect); styled like terra-draw's edit-mode selection
export const isHighlighted = (f: GeoJSONStoreFeatures) => f.properties.highlighted === true

// select-mode finish actions that change a polygon's shape
export const EDIT_ACTIONS = ['edit', 'deleteCoordinate', 'insertMidpoint', 'dragCoordinate', 'dragFeature', 'dragCoordinateResize']

// the ruler's lines: terra-draw's linestring mode, measured by the control
export const RULER_MODE = 'linestring'

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
    ],
    open: true,
    // deleting now removes the territory on the backend, so ask first
    showDeleteConfirmation: true,
    modeOptions: {
      freehand: new TerraDrawFreehandMode({
        minDistance: 15,
        smoothing: 0.4,
        styles: { /* same territory styling as polygon, so it matches */ },
      }),

      polygon: new TerraDrawPolygonMode({
        styles: {
          fillColor: territoryColor,
          fillOpacity: (f) => (isHighlighted(f) ? 0.6 : 0.4),
          outlineColor: (f) => (isHighlighted(f) ? '#ffffff' : territoryColor(f)),
          outlineWidth: 1,
        },
      }),
      select: new TerraDrawSelectMode({
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
          leftClick: (e) => !isOverEvent(map, draw.getTerraDrawInstance(), e),
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
