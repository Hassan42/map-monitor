import { useEffect, useState } from 'react'
import { useMap } from '../store/MapContext'
import { createAnnotation } from '../api/annotation'
import type { Annotation, Faction, Layer } from '../types/types'
import { ANNOTATION_REFERENCE_ZOOM, scaleAtZoom } from '../map/annotationScale'
import { ACCENT } from '../styles/colors'
import AnnotationForm from './AnnotationForm'
import type { AnnotationFormValues } from './annotationFormValues'
import { toLocalInput } from './eventFormValues'

const DEFAULT_COLOR = ACCENT // accent, until a faction is picked

// a new annotation: no start and no end, so it shows on every date until dates are picked
const emptyForm = (): AnnotationFormValues => ({
  kind: 'ARROW',
  label: '',
  factionId: '',
  layerId: null,
  color: DEFAULT_COLOR,
  startTime: '',
  ongoing: true,
  endTime: toLocalInput(Date.now()),
})

// click the map to place an annotation, then pick its kind, color and size in a dialog
function AddAnnotation({
  mapId,
  factions,
  layers,
  active,
  onExit,
  onCreated,
}: {
  mapId: string
  factions: Faction[]
  layers: Layer[]
  active: boolean
  onExit: () => void
  onCreated: (annotation: Annotation) => void
}) {
  const map = useMap()
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null)

  // placing: crosshair cursor, the next map click picks the spot, right-click cancels
  useEffect(() => {
    if (!map || !active) return

    map.getCanvas().style.cursor = 'crosshair'

    const handleClick = (e: { lngLat: { lng: number; lat: number } }) => {
      setPendingLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng })
      onExit()
    }

    const handleCancel = (e: { preventDefault: () => void }) => {
      e.preventDefault()
      onExit()
    }

    map.on('click', handleClick)
    map.on('contextmenu', handleCancel)

    return () => {
      map.getCanvas().style.cursor = ''
      map.off('click', handleClick)
      map.off('contextmenu', handleCancel)
    }
  }, [map, active, onExit])

  if (!pendingLocation) return null

  return (
    <AnnotationForm
      key={`${pendingLocation.lng},${pendingLocation.lat}`}
      heading="New Annotation"
      submitLabel="Add Annotation"
      initial={emptyForm()}
      factions={factions}
      layers={layers}
      onSubmit={async (fields) => {
        const annotation = await createAnnotation(mapId, {
          ...fields,
          geometry: JSON.stringify({ type: 'Point', coordinates: [pendingLocation.lng, pendingLocation.lat] }),
          // normal size (32px) at the current zoom; from there it scales with the map
          scale: scaleAtZoom(map?.getZoom() ?? ANNOTATION_REFERENCE_ZOOM),
          rotation: 0,
        })
        onCreated(annotation)
        setPendingLocation(null)
      }}
      onCancel={() => setPendingLocation(null)}
    />
  )
}

export default AddAnnotation
