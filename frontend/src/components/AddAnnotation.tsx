import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import { useMap } from '../store/MapContext'
import { createAnnotation } from '../api/annotation'
import type { Annotation, AnnotationKind, Faction } from '../types/types'
import { ANNOTATION_KINDS, ANNOTATION_KIND_LIST } from '../map/annotationKinds'
import { ANNOTATION_REFERENCE_ZOOM, scaleAtZoom } from '../map/annotationScale'
import { formOverlayClass, formClass, formTitleClass, formFieldClass, formInputClass, formColorInputClass, formPrimaryButtonClass, formSecondaryButtonClass, formErrorClass } from '../styles/formStyles'

const DEFAULT_COLOR = '#fbc412' // amber, until a faction is picked

// click the map to place an annotation, then pick its kind, color and size in a dialog
function AddAnnotation({
  mapId,
  factions,
  active,
  onExit,
  onCreated,
}: {
  mapId: string
  factions: Faction[]
  active: boolean
  onExit: () => void
  onCreated: (annotation: Annotation) => void
}) {
  const map = useMap()
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [kind, setKind] = useState<AnnotationKind>('ARROW')
  const [label, setLabel] = useState('')
  const [factionId, setFactionId] = useState<number | ''>('')
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  const resetForm = () => {
    setPendingLocation(null)
    setKind('ARROW')
    setLabel('')
    setFactionId('')
    setColor(DEFAULT_COLOR)
    setError('')
  }

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const annotation = await createAnnotation(mapId, {
        kind,
        geometry: JSON.stringify({ type: 'Point', coordinates: [pendingLocation.lng, pendingLocation.lat] }),
        factionId: factionId === '' ? null : factionId,
        label: label.trim() || null,
        color,
        // normal size (32px) at the current zoom; from there it scales with the map
        scale: scaleAtZoom(map?.getZoom() ?? ANNOTATION_REFERENCE_ZOOM),
        rotation: 0,
      })
      onCreated(annotation)
      resetForm()
    } catch {
      setError('Could not create annotation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={formOverlayClass}>
      <form onSubmit={handleSubmit} className={formClass}>
        <h2 className={formTitleClass}>New Annotation</h2>

        <div className={formFieldClass}>
          <label htmlFor="annotation-kind">Type:</label>
          <div className="flex items-center gap-3">
            {/* preview of the chosen icon in the chosen color: the svg is used as a mask over the color.
                the url must be quoted - Vite inlines small svgs as data: urls containing quotes and spaces */}
            <span
              aria-hidden="true"
              className="h-10 w-10 shrink-0"
              style={{
                backgroundColor: color,
                mask: `url("${ANNOTATION_KINDS[kind].icon}") center / contain no-repeat`,
              }}
            />
            <select
              id="annotation-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as AnnotationKind)}
              className={`${formInputClass} flex-1`}
            >
              {ANNOTATION_KIND_LIST.map((k) => (
                <option key={k} value={k}>{ANNOTATION_KINDS[k].label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={formFieldClass}>
          <label htmlFor="annotation-label">Label (optional):</label>
          <input type="text" id="annotation-label" value={label} onChange={(e) => setLabel(e.target.value)} className={formInputClass} />
        </div>

        <div className={formFieldClass}>
          <label htmlFor="annotation-faction">Faction (optional):</label>
          <select
            id="annotation-faction"
            value={factionId}
            onChange={(e) => {
              const id = e.target.value === '' ? '' : Number(e.target.value)
              setFactionId(id)
              // start from the faction's color; the color can still be changed after
              const faction = factions.find((f) => f.id === id)
              if (faction) setColor(faction.color)
            }}
            className={formInputClass}
          >
            <option value="">None</option>
            {factions.map((faction) => (
              <option key={faction.id} value={faction.id}>{faction.name}</option>
            ))}
          </select>
        </div>

        <div className={formFieldClass}>
          <label htmlFor="annotation-color">Color:</label>
          <input type="color" id="annotation-color" value={color} onChange={(e) => setColor(e.target.value)} className={formColorInputClass} />
        </div>


        {error && <p className={formErrorClass}>{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className={formPrimaryButtonClass}>
            {loading ? 'Adding...' : 'Add Annotation'}
          </button>
          <button type="button" onClick={resetForm} className={formSecondaryButtonClass}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddAnnotation
