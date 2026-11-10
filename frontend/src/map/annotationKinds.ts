import type { Annotation, AnnotationKind } from '../types/types'
import ambushIcon from '../assets/annotations/Ambush.svg'
import arrowIcon from '../assets/annotations/Arrow.svg'
import destroyIcon from '../assets/annotations/Destroy.svg'
import objectiveIcon from '../assets/annotations/Objective.svg'
import dotIcon from '../assets/annotations/Dot.svg'
import lineIcon from '../assets/annotations/Line.svg'

// every backend annotation kind -> how it's shown. Record<AnnotationKind, ...> makes the build fail
// if a kind is added to the type but forgotten here.
// icon: a single-color line drawing (recolored to the annotation's color on the map)
export const ANNOTATION_KINDS: Record<AnnotationKind, { label: string; icon: string }> = {
  AMBUSH: { label: 'Ambush', icon: ambushIcon },
  ARROW: { label: 'Arrow', icon: arrowIcon },
  DESTROY: { label: 'Mark point', icon: destroyIcon }, // the enum keeps its old name
  OBJECTIVE: { label: 'Objective', icon: objectiveIcon },
  DOT: { label: 'Dot', icon: dotIcon },
}

export const ANNOTATION_KIND_LIST = Object.keys(ANNOTATION_KINDS) as AnnotationKind[]

// how one annotation is named and pictured in lists: a drawn line has no kind of its own (its `kind` is
// never shown: the database only accepts the kinds above)
export const annotationLook = (a: Annotation) => (a.line ? { label: 'Line', icon: lineIcon } : ANNOTATION_KINDS[a.kind])
