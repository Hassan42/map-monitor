import type { Annotation, AnnotationKind } from '../types/types'
import { parseServerTime } from '../map/eventTime'
import { toLocalInput } from './eventFormValues'

// what the form edits; where it sits, its size and rotation are set on the map
export interface AnnotationFormValues {
  kind: AnnotationKind
  label: string
  factionId: number | ''
  layerId: number | null
  color: string
  startTime: string // datetime-local value; '' = no start ("always been there")
  ongoing: boolean // no end
  endTime: string // datetime-local value
}

export function annotationToFormValues(a: Annotation): AnnotationFormValues {
  return {
    kind: a.kind,
    label: a.label ?? '',
    factionId: a.factionId ?? '',
    layerId: a.layerId ?? null,
    color: a.color ?? '#ffffff',
    startTime: a.startTime ? toLocalInput(parseServerTime(a.startTime)) : '',
    ongoing: !a.endTime,
    endTime: toLocalInput(a.endTime ? parseServerTime(a.endTime) : Date.now()),
  }
}
