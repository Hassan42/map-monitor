// MapLibre ids shared between components that draw on / listen to the same map
export const EVENTS_SOURCE_ID = 'events'
// single events: one symbol layer, each event one image (circle + skull drawn together)
export const EVENTS_LAYER_ID = 'events-marker'
// amber ring drawn under the selected event
export const EVENTS_SELECTED_LAYER_ID = 'events-selected'
// marker images are named by category + faction color, e.g. 'event-ATTACK-#c0392b'.
// eventLayers.ts builds the same name per feature with an expression - keep the two in sync
export const EVENT_IMAGE_PREFIX = 'event-'
export const eventImageId = (category: string, color: string) => `${EVENT_IMAGE_PREFIX}${category}-${color}`
export const EVENTS_CLUSTER_LAYER_ID = 'events-cluster'
export const EVENTS_CLUSTER_COUNT_LAYER_ID = 'events-cluster-count'
// above this zoom events are never clustered; PropertyPanel flies past it so a single event is visible
export const EVENTS_CLUSTER_MAX_ZOOM = 8
