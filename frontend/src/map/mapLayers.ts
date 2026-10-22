// MapLibre ids shared between components that draw on / listen to the same map
export const EVENTS_SOURCE_ID = 'events'
// single events: one symbol layer, each event one image (circle + skull drawn together)
export const EVENTS_LAYER_ID = 'events-marker'
// accent ring drawn under the selected event
export const EVENTS_SELECTED_LAYER_ID = 'events-selected'
// marker images are named by category + faction color, e.g. 'event-ATTACK-#c0392b'.
// eventLayers.ts builds the same name per feature with an expression - keep the two in sync
export const EVENT_IMAGE_PREFIX = 'event-'
export const eventImageId = (category: string, color: string) => `${EVENT_IMAGE_PREFIX}${category}-${color}`
export const EVENTS_CLUSTER_LAYER_ID = 'events-cluster'
export const EVENTS_CLUSTER_COUNT_LAYER_ID = 'events-cluster-count'
// above this zoom events are never clustered; PropertyPanel flies past it so a single event is visible
export const EVENTS_CLUSTER_MAX_ZOOM = 8

export const ANNOTATIONS_SOURCE_ID = 'annotations'
export const ANNOTATIONS_LAYER_ID = 'annotations-icon'
// accent ring drawn under the selected annotation
export const ANNOTATIONS_SELECTED_LAYER_ID = 'annotations-selected'
// annotation images are named by kind + color, e.g. 'annotation-ARROW-#c0392b'.
// annotationLayers.ts builds the same name per feature with an expression - keep the two in sync
export const ANNOTATION_IMAGE_PREFIX = 'annotation-'
export const annotationImageId = (kind: string, color: string) => `${ANNOTATION_IMAGE_PREFIX}${kind}-${color}`
