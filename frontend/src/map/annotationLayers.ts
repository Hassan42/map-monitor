import type { AddLayerObject, ExpressionSpecification, Map, SourceSpecification } from 'maplibre-gl'
import { ICON_MIN_SIZE, ICON_RADIUS_PX, MAX_ICON_SIZE, zoomScaled } from './annotationScale'
import { ANNOTATION_IMAGE_PREFIX, ANNOTATIONS_ARROWHEAD_LAYER_ID, ANNOTATIONS_DASHED_LINE_LAYER_ID, ARROWHEAD_IMAGE_PREFIX, ANNOTATIONS_LABEL_LAYER_ID, ANNOTATIONS_LAYER_ID, ANNOTATIONS_LINE_LABEL_LAYER_ID, ANNOTATIONS_LINE_LAYER_ID, ANNOTATIONS_SELECTED_LAYER_ID, ANNOTATIONS_SELECTED_LINE_LAYER_ID, ANNOTATIONS_SOURCE_ID } from './mapLayers'
import { ACCENT } from '../styles/colors'

// what annotations look like on the map: one GeoJSON source with points (a symbol layer stamps each kind's
// icon) and drawn lines. AnnotationLayer fills the source and creates the per-color images.

const annotationsSource: SourceSpecification = {
  type: 'geojson',
  data: { type: 'FeatureCollection', features: [] },
}

const LABEL_SIZE_PX = 15
// further out than this, labels would crowd the map: only the icons show
const LABEL_MIN_ZOOM = 8
const LINE_WIDTH_PX = 3

// an annotation's point; a line's arrowhead is a point too, marked with `arrowOf`, and has its own layer
const IS_POINT = ['all', ['==', ['geometry-type'], 'Point'], ['!', ['has', 'arrowOf']]] as ExpressionSpecification
const IS_ARROWHEAD = ['has', 'arrowOf'] as ExpressionSpecification
// the arrowhead's image: drawn at twice its size on screen, so its edges stay sharp
const ARROWHEAD_PX = 24
const ARROWHEAD_PIXEL_RATIO = 2
// how far the tip reaches past the line's last point: enough to cover the line's round end
const ARROWHEAD_OVERSHOOT_PX = 4
const IS_LINE = ['==', ['geometry-type'], 'LineString'] as ExpressionSpecification
const LINE_LABEL_PAINT = { 'text-color': '#e5e7eb', 'text-halo-color': '#1c1f23', 'text-halo-width': 2 }

// in drawing order: later layers draw on top
const annotationLayers: AddLayerObject[] = [
  // lines first, so icons sit on top of them. A dashed line needs its own layer: not every map can read
  // a dash pattern per feature
  {
    id: ANNOTATIONS_SELECTED_LINE_LAYER_ID,
    type: 'line',
    source: ANNOTATIONS_SOURCE_ID,
    filter: ['==', ['get', 'id'], -1],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ACCENT, 'line-width': LINE_WIDTH_PX + 5, 'line-opacity': 0.5 },
  },
  {
    id: ANNOTATIONS_LINE_LAYER_ID,
    type: 'line',
    source: ANNOTATIONS_SOURCE_ID,
    filter: ['all', IS_LINE, ['!=', ['get', 'dashed'], true]],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ['get', 'color'], 'line-width': LINE_WIDTH_PX },
  },
  {
    id: ANNOTATIONS_DASHED_LINE_LAYER_ID,
    type: 'line',
    source: ANNOTATIONS_SOURCE_ID,
    filter: ['all', IS_LINE, ['==', ['get', 'dashed'], true]],
    layout: { 'line-join': 'round' },
    paint: { 'line-color': ['get', 'color'], 'line-width': LINE_WIDTH_PX, 'line-dasharray': [2.5, 2] },
  },
  // the arrowhead: its tip on the line's last point, turned the way the line ends
  {
    id: ANNOTATIONS_ARROWHEAD_LAYER_ID,
    type: 'symbol',
    source: ANNOTATIONS_SOURCE_ID,
    filter: IS_ARROWHEAD,
    layout: {
      'icon-image': ['concat', ARROWHEAD_IMAGE_PREFIX, ['get', 'color']],
      // the line keeps its width at every zoom, but zoomed out it's short on screen: a full-size head would
      // swamp it, so the head shrinks from 24px (zoom 14 and in) to 6px (zoom 2 and out)
      'icon-size': ['interpolate', ['linear'], ['zoom'], 2, 0.25, 6, 0.45, 10, 0.75, 14, 1],
      'icon-anchor': 'top', // the image's top middle is the tip
      // pushes the tip forward, along the way it points (the offset turns with icon-rotate)
      'icon-offset': [0, -ARROWHEAD_OVERSHOOT_PX],
      'icon-rotate': ['get', 'rotation'], // clockwise degrees from north
      'icon-rotation-alignment': 'map',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  },
  // a line's label: along its middle
  {
    id: ANNOTATIONS_LINE_LABEL_LAYER_ID,
    type: 'symbol',
    source: ANNOTATIONS_SOURCE_ID,
    minzoom: LABEL_MIN_ZOOM,
    filter: ['all', IS_LINE, ['!=', ['get', 'label'], '']],
    layout: {
      'symbol-placement': 'line-center',
      'text-field': ['get', 'label'],
      'text-font': ['Noto Sans Regular'],
      'text-size': LABEL_SIZE_PX,
      'text-offset': [0, -1],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: LINE_LABEL_PAINT,
  },
  // accent ring under the selected annotation, sized with it (its filter is set by AnnotationLayer)
  {
    id: ANNOTATIONS_SELECTED_LAYER_ID,
    type: 'circle',
    source: ANNOTATIONS_SOURCE_ID,
    filter: ['==', ['get', 'id'], -1],
    paint: {
      // exactly the icon's size: the same scaling, minimum and maximum as icon-size, in pixels
      'circle-radius': zoomScaled(['*', ICON_RADIUS_PX, ['get', 'scale']], ICON_MIN_SIZE * ICON_RADIUS_PX, MAX_ICON_SIZE * ICON_RADIUS_PX),
      'circle-color': 'transparent',
      'circle-stroke-width': 2,
      'circle-stroke-color': ACCENT,
    },
  },
  {
    id: ANNOTATIONS_LAYER_ID,
    type: 'symbol',
    source: ANNOTATIONS_SOURCE_ID,
    filter: IS_POINT,
    layout: {
      // same name as annotationImageId(): kind + color
      'icon-image': ['concat', ANNOTATION_IMAGE_PREFIX, ['get', 'kind'], '-', ['get', 'color']],
      // sized with the map (bigger when zooming in), see annotationScale.ts
      'icon-size': zoomScaled(['get', 'scale'], ICON_MIN_SIZE),
      'icon-rotate': ['get', 'rotation'], // clockwise degrees
      'icon-rotation-alignment': 'map', // stays pointing the same way when the map is rotated
      'icon-allow-overlap': true, // annotations are placed on purpose: never hide one
      'icon-ignore-placement': true,
    },
  },
  // the label under each annotation that has one. Its own layer, so it doesn't turn with the icon
  {
    id: ANNOTATIONS_LABEL_LAYER_ID,
    type: 'symbol',
    source: ANNOTATIONS_SOURCE_ID,
    minzoom: LABEL_MIN_ZOOM,
    filter: ['all', IS_POINT, ['!=', ['get', 'label'], '']],
    layout: {
      'text-field': ['get', 'label'],
      'text-font': ['Noto Sans Regular'], // a font the map style's glyph server provides
      'text-size': LABEL_SIZE_PX,
      // just under the icon: its radius in ems, growing with the icon like the selection ring
      'text-variable-anchor': ['top'],
      'text-radial-offset': zoomScaled(['*', ICON_RADIUS_PX / LABEL_SIZE_PX, ['get', 'scale']], ICON_MIN_SIZE * ICON_RADIUS_PX / LABEL_SIZE_PX, MAX_ICON_SIZE * ICON_RADIUS_PX / LABEL_SIZE_PX),
      'text-allow-overlap': true, // like the icons: never hide one
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': '#e5e7eb',
      'text-halo-color': '#1c1f23', // dark outline: readable on the light map, like the relation labels
      'text-halo-width': 2,
    },
  },
]

// an arrowhead in `color`: a filled triangle pointing up, its tip at the top middle of the image
export function addArrowheadImage(map: Map, id: string, color: string) {
  const size = ARROWHEAD_PX * ARROWHEAD_PIXEL_RATIO
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(size / 2, 0)
  ctx.lineTo(size * 0.875, size * 0.85)
  ctx.lineTo(size * 0.125, size * 0.85)
  ctx.closePath()
  ctx.fill()
  map.addImage(id, ctx.getImageData(0, 0, size, size), { pixelRatio: ARROWHEAD_PIXEL_RATIO })
}

export function addAnnotationLayers(map: Map) {
  if (!map.getSource(ANNOTATIONS_SOURCE_ID)) map.addSource(ANNOTATIONS_SOURCE_ID, annotationsSource)
  for (const layer of annotationLayers) {
    if (!map.getLayer(layer.id)) map.addLayer(layer)
  }
}

// layers first (top-down), then the source: MapLibre refuses to remove a source that's still in use
export function removeAnnotationLayers(map: Map) {
  for (const layer of [...annotationLayers].reverse()) {
    if (map.getLayer(layer.id)) map.removeLayer(layer.id)
  }
  if (map.getSource(ANNOTATIONS_SOURCE_ID)) map.removeSource(ANNOTATIONS_SOURCE_ID)
}
