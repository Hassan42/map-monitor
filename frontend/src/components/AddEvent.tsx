import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import { useMap } from '../store/MapContext'
import { createEvent } from '../api/event'
import type { EventCategory, EventMarker, EventRelation, EventRelationType, Faction } from '../types/types'
import { EVENT_CATEGORIES, EVENT_CATEGORY_LIST } from '../map/eventCategories'
import { EVENT_RELATION_LABELS, EVENT_RELATION_LIST } from '../map/eventRelations'
import { formOverlayClass, formClass, formTitleClass, formFieldClass, formInputClass, formPrimaryButtonClass, formSecondaryButtonClass, formErrorClass } from '../styles/formStyles'

function AddEvent({
  mapId,
  factions,
  events,
  active,
  onExit,
  onCreated,
}: {
  mapId: string
  factions: Faction[]
  events: EventMarker[] // the map's events, to pick related events from
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
  const [sourceURL, setSourceURL] = useState<string>('')
  // advanced: relations to other events, plus the "add a relation" row being filled in
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [relations, setRelations] = useState<EventRelation[]>([])
  const [relatedEventId, setRelatedEventId] = useState<number | ''>('')
  const [relationType, setRelationType] = useState<EventRelationType>('causedBy')
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

  const eventTitle = (id: number) => events.find((ev) => ev.id === id)?.title || `Event #${id}`
  // an event can be related to another only once, so already-picked events leave the list
  const selectableEvents = events.filter((ev) => !relations.some((r) => r.relatedEventId === ev.id))

  const addRelation = () => {
    if (relatedEventId === '') return
    setRelations((prev) => [...prev, { relatedEventId, type: relationType }])
    setRelatedEventId('')
  }

  const removeRelation = (id: number) => setRelations((prev) => prev.filter((r) => r.relatedEventId !== id))

  const resetForm = () => {
    setPendingLocation(null)
    setTitle('')
    setDescription('')
    setFactionId('')
    setCategory('OTHER')
    setSourceURL('')
    setShowAdvanced(false)
    setRelations([])
    setRelatedEventId('')
    setRelationType('causedBy')
  }

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
        sourceURL,
        relations, // always sent (empty list when none), the backend replaces the event's relations with it
      })
      onCreated(event)
      resetForm()
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
          <label htmlFor="event-description">Source (URL):</label>
          <input type="text" id="event-source" value={sourceURL} onChange={(e) => setSourceURL(e.target.value)} className={formInputClass} />
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

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
          className="self-start text-sm text-gray-400 transition-colors hover:text-accent-300"
        >
          {showAdvanced ? '▾' : '▸'} Advanced{relations.length > 0 ? ` (${relations.length})` : ''}
        </button>

        {showAdvanced && (
          <div className={formFieldClass}>
            <span>Related events:</span>

            {relations.length === 0 ? (
              <p className="text-gray-500">None yet.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {relations.map((r) => (
                  <li key={r.relatedEventId} className="flex items-center gap-2 bg-neutral-800 px-2 py-1">
                    <span className="shrink-0 text-accent-300">{EVENT_RELATION_LABELS[r.type]}</span>
                    <span className="flex-1 truncate text-gray-100">{eventTitle(r.relatedEventId)}</span>
                    <button
                      type="button"
                      onClick={() => removeRelation(r.relatedEventId)}
                      aria-label={`Remove relation to ${eventTitle(r.relatedEventId)}`}
                      className="text-gray-500 hover:text-red-400"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {events.length === 0 ? (
              <p className="text-gray-500">No other events on this map yet.</p>
            ) : (
              <div className="flex gap-1">
                <select
                  aria-label="Relation type"
                  value={relationType}
                  onChange={(e) => setRelationType(e.target.value as EventRelationType)}
                  className={`${formInputClass} w-28 shrink-0`}
                >
                  {EVENT_RELATION_LIST.map((t) => (
                    <option key={t} value={t}>{EVENT_RELATION_LABELS[t]}</option>
                  ))}
                </select>
                <select
                  aria-label="Related event"
                  value={relatedEventId}
                  onChange={(e) => setRelatedEventId(Number(e.target.value))}
                  className={`${formInputClass} min-w-0 flex-1`}
                >
                  <option value="" disabled>Select an event</option>
                  {selectableEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title || `Event #${ev.id}`}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addRelation}
                  disabled={relatedEventId === ''}
                  className="bg-neutral-700 px-2 text-gray-200 transition-colors hover:bg-neutral-600 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        )}

        {error && <p className={formErrorClass}>{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={loading || factions.length === 0} className={formPrimaryButtonClass}>
            {loading ? 'Adding...' : 'Add Event'}
          </button>
          <button type="button" onClick={resetForm} className={formSecondaryButtonClass}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddEvent
