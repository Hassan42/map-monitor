import type { EventRelationType } from '../types/types'

// every backend relation type -> how it's shown in the UI. Record<EventRelationType, ...> makes the
// build fail if a type is added to the type but forgotten here (same idea as eventCategories)
export const EVENT_RELATION_LABELS: Record<EventRelationType, string> = {
  PartOf: 'Part of',
  causedBy: 'Caused by',
  RetaliationTo: 'Retaliation of',
  Other: 'Other',
}

export const EVENT_RELATION_LIST = Object.keys(EVENT_RELATION_LABELS) as EventRelationType[]
