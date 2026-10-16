import type { AnnotationKind } from '../types/types'
import ambushIcon from '../assets/annotations/Ambush.svg'
import arrowIcon from '../assets/annotations/Arrow.svg'
import destroyIcon from '../assets/annotations/Destroy.svg'
import objectiveIcon from '../assets/annotations/Objective.svg'

// every backend annotation kind -> how it's shown. Record<AnnotationKind, ...> makes the build fail
// if a kind is added to the type but forgotten here.
// icon: a single-color line drawing (recolored to the annotation's color on the map)
export const ANNOTATION_KINDS: Record<AnnotationKind, { label: string; icon: string }> = {
  AMBUSH: { label: 'Ambush', icon: ambushIcon },
  ARROW: { label: 'Arrow', icon: arrowIcon },
  DESTROY: { label: 'Destroy', icon: destroyIcon },
  OBJECTIVE: { label: 'Objective', icon: objectiveIcon },
}

export const ANNOTATION_KIND_LIST = Object.keys(ANNOTATION_KINDS) as AnnotationKind[]
