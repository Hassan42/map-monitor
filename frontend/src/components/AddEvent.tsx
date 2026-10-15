import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import { useMap } from '../store/MapContext'
import { createEvent } from '../api/event'
import type { EventCategory, EventMarker, Faction } from '../types/types'
import { EVENT_CATEGORIES, EVENT_CATEGORY_LIST } from '../map/eventCategories'
import { formOverlayClass, formClass, formTitleClass, formFieldClass, formInputClass, formPrimaryButtonClass, formSecondaryButtonClass, formErrorClass } from '../styles/formStyles'

function AddEvent({
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
  onCreated: (event: EventMarker) => void
}) {
  const map = useMap()
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [factionId, setFactionId] = useState<number | ''>('')
  const [category, setCategory] = useState<EventCategory>('OTHER')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    if (factionId === '') return
    setError('')
    setLoading(true)
    try {
      const event = await createEvent(mapId, {
        title,
        description,
        latitude: pendingLocation.lat,
        longitude: pendingLocation.lng,
        timestamp: new Date().toISOString(),
        category,
        factionId,
      })
      onCreated(event)
      setPendingLocation(null)
      setTitle('')
      setDescription('')
      setFactionId('')
      setCategory('OTHER')
    } catch {
      setError('Could not create event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={formOverlayClass}>
      <form onSubmit={handleSubmit} className={formClass}>
        <h2 className={formTitleClass}>New Event</h2>
        <p className="text-sm text-gray-400">
          Location: {pendingLocation.lat.toFixed(4)}, {pendingLocation.lng.toFixed(4)}
        </p>
        <div className={formFieldClass}>
          <label htmlFor="event-title">Title:</label>
          <input type="text" id="event-title" value={title} onChange={(e) => setTitle(e.target.value)} className={formInputClass} />
        </div>
        <div className={formFieldClass}>
          <label htmlFor="event-description">Description:</label>
          <input type="text" id="event-description" value={description} onChange={(e) => setDescription(e.target.value)} className={formInputClass} />
        </div>
        <div className={formFieldClass}>
          <label htmlFor="event-category">Category:</label>
          {/* options come from the category mapping, so they always match what the map can draw */}
          <select
            id="event-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as EventCategory)}
            className={formInputClass}
          >
            {EVENT_CATEGORY_LIST.map((c) => (
              <option key={c} value={c}>{EVENT_CATEGORIES[c].label}</option>
            ))}
          </select>
        </div>
        <div className={formFieldClass}>
          <label htmlFor="event-faction">Faction:</label>
          {factions.length === 0 ? (
            <p className={formErrorClass}>Create a faction first.</p>
          ) : (
            <select
              id="event-faction"
              value={factionId}
              onChange={(e) => setFactionId(Number(e.target.value))}
              className={formInputClass}
            >
              <option value="" disabled>Select a faction</option>
              {factions.map((faction) => (
                <option key={faction.id} value={faction.id}>{faction.name}</option>
              ))}
            </select>
          )}
        </div>
        {error && <p className={formErrorClass}>{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={loading || factions.length === 0} className={formPrimaryButtonClass}>
            {loading ? 'Adding...' : 'Add Event'}
          </button>
          <button type="button" onClick={() => setPendingLocation(null)} className={formSecondaryButtonClass}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddEvent
