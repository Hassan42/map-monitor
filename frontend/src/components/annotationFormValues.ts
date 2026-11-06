import type { Annotation, AnnotationKind } from '../types/types'
import { parseServerTime } from '../map/eventTime'
import { toLocalInput } from './eventFormValues'
import { ACCENT } from '../styles/colors'

// what the form edits; where it sits, its size and rotation are set on the map
export interface AnnotationFormValues {
  kind: AnnotationKind
  label: string
  factionId: number | ''
  layerId: number | null
  color: string
  dashed: boolean // lines only
  startTime: string // datetime-local value; '' = no start ("always been there")
  ongoing: boolean // no end
  endTime: string // datetime-local value
}

// a new annotation: no start and no end, so it shows on every date until dates are picked. Accent until
// a faction is picked
export const newAnnotationValues = (): AnnotationFormValues => ({
  kind: 'ARROW',
  label: '',
  factionId: '',
  layerId: null,
  color: ACCENT,
  dashed: false,
  startTime: '',
  ongoing: true,
  endTime: toLocalInput(Date.now()),
})

export function annotationToFormValues(a: Annotation): AnnotationFormValues {
  return {
    kind: a.kind,
    label: a.label ?? '',
    factionId: a.factionId ?? '',
    layerId: a.layerId ?? null,
    color: a.color ?? '#ffffff',
    dashed: a.dashed === true,
    startTime: a.startTime ? toLocalInput(parseServerTime(a.startTime)) : '',
    ongoing: !a.endTime,
    endTime: toLocalInput(a.endTime ? parseServerTime(a.endTime) : Date.now()),
  }
}
