import type { AddLayerObject, Map, SourceSpecification } from 'maplibre-gl'
import { ICON_MIN_SIZE, ICON_RADIUS_PX, MAX_ICON_SIZE, zoomScaled } from './annotationScale'
import { ANNOTATION_IMAGE_PREFIX, ANNOTATIONS_LAYER_ID, ANNOTATIONS_SELECTED_LAYER_ID, ANNOTATIONS_SOURCE_ID } from './mapLayers'

// what annotations look like on the map: one GeoJSON source of points and one symbol layer
// stamping each kind's icon. AnnotationLayer fills the source and creates the per-color images.

const annotationsSource: SourceSpecification = {
  type: 'geojson',
  data: { type: 'FeatureCollection', features: [] },
}

// in drawing order: later layers draw on top
const annotationLayers: AddLayerObject[] = [
  // amber ring under the selected annotation, sized with it (its filter is set by AnnotationLayer)
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
      'circle-stroke-color': '#fbc412',
    },
  },
  {
    id: ANNOTATIONS_LAYER_ID,
    type: 'symbol',
    source: ANNOTATIONS_SOURCE_ID,
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
]

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
