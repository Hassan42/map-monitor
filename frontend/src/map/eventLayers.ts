import type { AddLayerObject, FilterSpecification, Map, SourceSpecification } from 'maplibre-gl'
import {
  EVENT_IMAGE_PREFIX,
  EVENTS_CLUSTER_COUNT_LAYER_ID,
  EVENTS_CLUSTER_LAYER_ID,
  EVENTS_CLUSTER_MAX_ZOOM,
  EVENTS_LAYER_ID,
  EVENTS_SELECTED_LAYER_ID,
  EVENTS_SOURCE_ID,
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
  if (!map.getSource(EVENTS_SOURCE_ID)) map.addSource(EVENTS_SOURCE_ID, eventsSource)
  for (const layer of eventLayers) {
    if (!map.getLayer(layer.id)) map.addLayer(layer)
  }
}

// layers first (top-down), then the source: MapLibre refuses to remove a source that's still in use
export function removeEventLayers(map: Map) {
  for (const layer of [...eventLayers].reverse()) {
    if (map.getLayer(layer.id)) map.removeLayer(layer.id)
  }
  if (map.getSource(EVENTS_SOURCE_ID)) map.removeSource(EVENTS_SOURCE_ID)
}
