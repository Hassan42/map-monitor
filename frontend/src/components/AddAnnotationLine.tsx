import { useEffect, useState } from 'react'
import { useMap } from '../store/MapContext'
import { useTerraDraw } from '../store/TerraDrawContext'
import { RULER_MODE } from '../map/territoryDraw'
import { createAnnotation } from '../api/annotation'
import { lineFields } from '../map/annotationLine'
import type { Annotation, Faction, Layer } from '../types/types'
import AnnotationForm from './AnnotationForm'
import { newAnnotationValues } from './annotationFormValues'

// draw a line on the map (terra-draw's line mode, which TerritoryLayer switches to while `active`), then fill
// in its details in the annotation form. The drawn feature only shows the line until the form closes:
// once saved, AnnotationLayer draws it
function AddAnnotationLine({
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
  const draw = useTerraDraw()
  const [pending, setPending] = useState<{ featureId: string | number; points: number[][] } | null>(null)

  // drawing: a finished line opens the form; right-click or Esc cancels
  useEffect(() => {
    const terraDraw = draw?.getTerraDrawInstance()
    if (!map || !terraDraw || !active) return

    const handleFinish = (id: string | number, context: { action: string }) => {
      if (context.action !== 'draw') return
      const feature = terraDraw.getSnapshot().find((f) => f.id === id)
      if (!feature || feature.properties.mode !== RULER_MODE) return
      setPending({ featureId: id, points: feature.geometry.coordinates as number[][] })
      onExit()
    }
    const handleCancel = (e: { preventDefault: () => void }) => {
      e.preventDefault()
      onExit()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit()
    }

    terraDraw.on('finish', handleFinish)
    map.on('contextmenu', handleCancel)
    window.addEventListener('keydown', onKey)
    return () => {
      terraDraw.off('finish', handleFinish)
      map.off('contextmenu', handleCancel)
      window.removeEventListener('keydown', onKey)
    }
  }, [map, draw, active, onExit])

  const close = () => {
    if (pending) draw?.getTerraDrawInstance()?.removeFeatures([pending.featureId])
    setPending(null)
  }

  return (
    <>
      {active && (
        // top center over the map area (the property panel takes the right 24rem), like the ruler's bar
        <div className="fixed top-16 left-[calc((100%-24rem)/2)] max-md:inset-x-2 max-md:translate-x-0 max-md:flex-wrap z-40 flex -translate-x-1/2 items-center gap-3 bg-neutral-900 px-4 py-2 text-sm text-gray-300 shadow-xl ring-1 ring-white/10">
          <span className="font-semibold text-white">Line</span>
          <span className="text-gray-400">
            <span className="md:hidden">Tap to add points, tap the last one to finish</span>
            <span className="max-md:hidden">Click to add points, double-click to finish (Esc cancels)</span>
          </span>
        </div>
      )}
      {pending && (
        <AnnotationForm
          key={pending.featureId}
          heading="New Line"
          submitLabel="Add Line"
          initial={newAnnotationValues()}
          isLine
          factions={factions}
          layers={layers}
          onSubmit={async (fields) => {
            const annotation = await createAnnotation(mapId, { ...fields, ...lineFields(pending.points), scale: 1, rotation: 0 })
            onCreated(annotation)
            close()
          }}
          onCancel={close}
        />
      )}
    </>
  )
}

export default AddAnnotationLine
