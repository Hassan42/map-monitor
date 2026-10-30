import type { AddLayerObject, DataDrivenPropertyValueSpecification, FilterSpecification, Map, SourceSpecification } from 'maplibre-gl'
import {
  EVENT_IMAGE_PREFIX,
  EVENTS_CLUSTER_COUNT_LAYER_ID,
  EVENTS_CLUSTER_LAYER_ID,
  EVENTS_CLUSTER_MAX_ZOOM,
  EVENTS_LAYER_ID,
  EVENTS_SELECTED_LAYER_ID,
  EVENTS_SOURCE_ID,
  RELATIONS_ARROW_LAYER_ID,
  RELATIONS_END_LAYER_ID,
  RELATION_ARROW_IMAGE,
  RELATIONS_LABEL_LAYER_ID,
  RELATIONS_LINE_LAYER_ID,
  RELATIONS_SELECTED_LAYER_ID,
  RELATIONS_SOURCE_ID,
} from './mapLayers'
import { ACCENT, ACCENT_LIGHT } from '../styles/colors'

// what the events look like on the map: one clustered GeoJSON source and the layers drawing it.
// EventMarkers fills the source with data and creates the per-color marker images.

const SELECTED_COLOR = ACCENT // the app's accent, like the rest of the UI

// clusters have point_count; single events don't
const IS_CLUSTER: FilterSpecification = ['has', 'point_count']
const NOT_CLUSTER: FilterSpecification = ['!', ['has', 'point_count']]

const eventsSource: SourceSpecification = {
  type: 'geojson',
  data: { type: 'FeatureCollection', features: [] },
  cluster: true,
  clusterRadius: 48, // px: events closer than this on screen are grouped
  clusterMaxZoom: EVENTS_CLUSTER_MAX_ZOOM,
}

// the Relations toggle: filled by EventMarkers with every relation between events that have happened by
// the timeline's date. Kept faint, and drawn below the markers so the lines never cover an event
const relationsSource: SourceSpecification = { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }

// by relation type: cause in red, retaliation in orange, part of in black (gray didn't show on the light map)
const RELATION_COLOR: DataDrivenPropertyValueSpecification<string> =
  ['match', ['get', 'type'], 'causedBy', '#ef4444', 'RetaliationTo', '#f59e0b', 'PartOf', '#111111', '#6b7280']

// an arrowhead pointing left, i.e. against the line's direction: lines run from cause to effect, so the
// arrows point from the effect back to its cause ("caused by", "retaliation to", "part of").
// Single-color so the arrow layer can tint it per type (sdf)
function relationArrowImage() {
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.moveTo(6, 16)
  ctx.lineTo(24, 6)
  ctx.lineTo(20, 16)
  ctx.lineTo(24, 26)
  ctx.closePath()
  ctx.fill()
  return ctx.getImageData(0, 0, size, size)
}

const relationLayers: AddLayerObject[] = [
  {
    id: RELATIONS_LINE_LAYER_ID,
    type: 'line',
    source: RELATIONS_SOURCE_ID,
    filter: ['==', ['geometry-type'], 'LineString'],
    layout: { 'line-cap': 'round' },
    paint: {
      'line-width': 2.5,
      'line-opacity': 0.45,
      'line-color': RELATION_COLOR, // part of is also dashed
      'line-dasharray': ['match', ['get', 'type'], 'PartOf', ['literal', [2, 2]], ['literal', [1, 0]]],
    },
  },
  {
    // arrowheads along each line, pointing from effect to cause (see relationArrowImage)
    id: RELATIONS_ARROW_LAYER_ID,
    type: 'symbol',
    source: RELATIONS_SOURCE_ID,
    filter: ['==', ['geometry-type'], 'LineString'],
    layout: {
      'symbol-placement': 'line',
      'symbol-spacing': 110, // px between arrows; short lines still get one
      'icon-image': RELATION_ARROW_IMAGE,
      'icon-size': 1, // 16 px on screen (the 32 px image at pixelRatio 2)
      'icon-rotation-alignment': 'map', // turn with the line
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
    paint: { 'icon-color': RELATION_COLOR, 'icon-opacity': 0.75 },
  },
  {
    // accent ring under a selected faded marker, like EVENTS_SELECTED_LAYER_ID for the normal ones
    // (its filter is set by EventMarkers when the selection changes)
    id: RELATIONS_SELECTED_LAYER_ID,
    type: 'circle',
    source: RELATIONS_SOURCE_ID,
    filter: ['==', ['get', 'id'], -1],
    paint: { 'circle-radius': 32, 'circle-color': SELECTED_COLOR, 'circle-opacity': 0.6 },
  },
  {
    // related events the timeline no longer shows (they've ended): a faint copy of their own marker
    // (category icon, faction color), selectable like the normal ones. Shown events keep their own marker
    id: RELATIONS_END_LAYER_ID,
    type: 'symbol',
    source: RELATIONS_SOURCE_ID,
    filter: ['==', ['geometry-type'], 'Point'],
    layout: {
      'icon-image': ['concat', EVENT_IMAGE_PREFIX, ['get', 'category'], '-', ['get', 'color']], // as eventImageId()
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
    paint: { 'icon-opacity': 0.35 },
  },
  {
    // the relationship's name in the middle of each line, kept upright and on top of the line
    id: RELATIONS_LABEL_LAYER_ID,
    type: 'symbol',
    source: RELATIONS_SOURCE_ID,
    filter: ['==', ['geometry-type'], 'LineString'],
    layout: {
      'symbol-placement': 'line-center',
      'text-field': ['get', 'label'],
      'text-font': ['Noto Sans Regular'], // a font the map style's glyph server provides
      'text-size': 12,
      'text-offset': [0, -0.9], // just above the line, clear of the arrows on it
      'text-allow-overlap': true, // every relation keeps its name, even where lines cross
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': ['match', ['get', 'type'], 'causedBy', '#fca5a5', 'RetaliationTo', '#fcd34d', '#e5e7eb'],
      'text-halo-color': '#1c1f23', // dark outline: readable on the light map and over the line
      'text-halo-width': 2,
      'text-opacity': 0.75,
    },
  },
]

// in drawing order: later layers draw on top
const eventLayers: AddLayerObject[] = [
  // cluster: dark badge with an accent ring, sized by how many events it holds
  {
    id: EVENTS_CLUSTER_LAYER_ID,
    type: 'circle',
    source: EVENTS_SOURCE_ID,
    filter: IS_CLUSTER,
    paint: {
      'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 50, 24],
      'circle-color': '#25292e', // neutral-900 from the app theme (index.css)
      'circle-stroke-width': 2,
      'circle-stroke-color': SELECTED_COLOR,
    },
  },
  {
    id: EVENTS_CLUSTER_COUNT_LAYER_ID,
    type: 'symbol',
    source: EVENTS_SOURCE_ID,
    filter: IS_CLUSTER,
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['Noto Sans Regular'], // a font the map style's glyph server provides
      'text-size': 12,
      'text-allow-overlap': true,
    },
    paint: { 'text-color': ACCENT_LIGHT },
  },
  // accent ring under the selected event (its filter is set by EventMarkers when selection changes)
  {
    id: EVENTS_SELECTED_LAYER_ID,
    type: 'circle',
    source: EVENTS_SOURCE_ID,
    filter: ['==', ['get', 'id'], -1],
    paint: { 'circle-radius': 32, 'circle-color': SELECTED_COLOR },
  },
  // single events: each one image (circle + category icon), picked by category + faction color - the same
  // name eventImageId() gives. Added up front: the source starts empty, and EventMarkers creates each
  // image before setting data that needs it
  {
    id: EVENTS_LAYER_ID,
    type: 'symbol',
    source: EVENTS_SOURCE_ID,
    filter: NOT_CLUSTER,
    layout: {
      'icon-image': ['concat', EVENT_IMAGE_PREFIX, ['get', 'category'], '-', ['get', 'color']],
      'icon-allow-overlap': true, // overlapping events are all drawn, each as a whole marker
      'icon-ignore-placement': true,
    },
    // fades events out after they end (opacity is computed per event in EventMarkers, see eventTime.ts)
    paint: { 'icon-opacity': ['get', 'opacity'] },
  },
]

export function addEventLayers(map: Map) {
  if (!map.hasImage(RELATION_ARROW_IMAGE)) map.addImage(RELATION_ARROW_IMAGE, relationArrowImage(), { sdf: true, pixelRatio: 2 })
  if (!map.getSource(RELATIONS_SOURCE_ID)) map.addSource(RELATIONS_SOURCE_ID, relationsSource)
  if (!map.getSource(EVENTS_SOURCE_ID)) map.addSource(EVENTS_SOURCE_ID, eventsSource)
  // relations first, so they end up below the event layers
  for (const layer of [...relationLayers, ...eventLayers]) {
    if (!map.getLayer(layer.id)) map.addLayer(layer)
  }
}

// layers first (top-down), then the source: MapLibre refuses to remove a source that's still in use
export function removeEventLayers(map: Map) {
  for (const layer of [...relationLayers, ...eventLayers].reverse()) {
    if (map.getLayer(layer.id)) map.removeLayer(layer.id)
  }
  if (map.getSource(EVENTS_SOURCE_ID)) map.removeSource(EVENTS_SOURCE_ID)
  if (map.getSource(RELATIONS_SOURCE_ID)) map.removeSource(RELATIONS_SOURCE_ID)
  if (map.hasImage(RELATION_ARROW_IMAGE)) map.removeImage(RELATION_ARROW_IMAGE)
}
