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

// the Relations toggle: lines between related events that have happened by the timeline's date, and
// faded markers for the ones among them the timeline no longer shows
export const RELATIONS_SOURCE_ID = 'event-relations'
export const RELATIONS_LINE_LAYER_ID = 'event-relations-lines'
export const RELATIONS_END_LAYER_ID = 'event-relations-ends'
export const RELATIONS_LABEL_LAYER_ID = 'event-relations-labels'
export const RELATIONS_SELECTED_LAYER_ID = 'event-relations-selected'
export const RELATIONS_ARROW_LAYER_ID = 'event-relations-arrows'
export const RELATION_ARROW_IMAGE = 'relation-arrow'

export const ANNOTATIONS_SOURCE_ID = 'annotations'
export const ANNOTATIONS_LAYER_ID = 'annotations-icon'
export const ANNOTATIONS_LABEL_LAYER_ID = 'annotations-label'
// accent ring drawn under the selected annotation
export const ANNOTATIONS_SELECTED_LAYER_ID = 'annotations-selected'
// drawn line annotations, and the accent glow under the selected one
export const ANNOTATIONS_LINE_LAYER_ID = 'annotations-line'
export const ANNOTATIONS_DASHED_LINE_LAYER_ID = 'annotations-line-dashed'
export const ANNOTATIONS_LINE_LABEL_LAYER_ID = 'annotations-line-label'
export const ANNOTATIONS_SELECTED_LINE_LAYER_ID = 'annotations-selected-line'
// annotation images are named by kind + color, e.g. 'annotation-ARROW-#c0392b'.
// annotationLayers.ts builds the same name per feature with an expression - keep the two in sync
export const ANNOTATION_IMAGE_PREFIX = 'annotation-'
export const annotationImageId = (kind: string, color: string) => `${ANNOTATION_IMAGE_PREFIX}${kind}-${color}`
