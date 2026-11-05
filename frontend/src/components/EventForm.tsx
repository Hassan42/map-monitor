import { useState } from 'react'
import type { SubmitEvent } from 'react'
import type { EventCategory, EventMarker, EventRelation, EventRelationType, Faction, Layer } from '../types/types'
import type { EventFormValues } from './eventFormValues'
import { toLocalInput } from './eventFormValues'
import { DAY_MS, DEFAULT_VISIBLE_DAYS } from '../map/eventTime'
import CategoryPicker from './CategoryPicker'
import LayerSelect from './LayerSelect'
import { EVENT_RELATION_LABELS, EVENT_RELATION_LIST } from '../map/eventRelations'
import { formOverlayClass, formClass, formTitleClass, formFieldClass, formInputClass, formPrimaryButtonClass, formSecondaryButtonClass, formErrorClass } from '../styles/formStyles'

// the one event form, used by AddEvent (new event) and EditEvent (existing event) - change it here
// and both follow. It starts from `initial` when it opens; render it with a key per event so a
// different event starts a fresh form
function EventForm({
  heading,
  submitLabel,
  initial,
  location,
  factions,
  layers,
  events,
  onSubmit,
  onCancel,
}: {
  heading: string
  submitLabel: string
  initial: EventFormValues
  location: { lat: number; lng: number }
  factions: Faction[]
  layers: Layer[]
  events: EventMarker[] // events this one can be related to
  onSubmit: (values: EventFormValues & { factionId: number }) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial.title)
  const [description, setDescription] = useState(initial.description)
  const [factionId, setFactionId] = useState<number | ''>(initial.factionId)
  const [layerId, setLayerId] = useState<number | null>(initial.layerId)
  const [category, setCategory] = useState<EventCategory>(initial.category)
  const [sourceURL, setSourceURL] = useState(initial.sourceURL)
  const [startTime, setStartTime] = useState(initial.startTime)
  const [endTime, setEndTime] = useState(initial.endTime)
  const [latestStart] = useState(() => toLocalInput(Date.now())) // an event can't start in the future
  const [ongoing, setOngoing] = useState(initial.ongoing)
  const [visibleDays, setVisibleDays] = useState(initial.visibleDays)
  // advanced: visible days, relations to other events, plus the "add a relation" row being filled in.
  // Starts open when the event already uses them, so they're visible when editing
  const [showAdvanced, setShowAdvanced] = useState(
    initial.relations.length > 0 || initial.visibleDays !== DEFAULT_VISIBLE_DAYS,
  )
  const [relations, setRelations] = useState<EventRelation[]>(initial.relations)
  const [relatedEventId, setRelatedEventId] = useState<number | ''>('')
  const [relationType, setRelationType] = useState<EventRelationType>('causedBy')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const eventTitle = (id: number) => events.find((ev) => ev.id === id)?.title || `Event #${id}`
  // an event can be related to another only once, so already-picked events leave the list
  const selectableEvents = events.filter((ev) => !relations.some((r) => r.relatedEventId === ev.id))

  const addRelation = () => {
    if (relatedEventId === '') return
    setRelations((prev) => [...prev, { relatedEventId, type: relationType }])
    setRelatedEventId('')
  }

  const removeRelation = (id: number) => setRelations((prev) => prev.filter((r) => r.relatedEventId !== id))

  // when the event leaves the map: its end plus the visible days (shown under the end date)
  const endMs = new Date(endTime).getTime()
  const visibleUntil = Number.isNaN(endMs) ? null : new Date(endMs + visibleDays * DAY_MS)

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    if (factionId === '') return setError('Pick a faction')
    const startMs = new Date(startTime).getTime()
    if (Number.isNaN(startMs)) return setError('Pick when it happened')
    if (startMs > Date.now()) return setError("The event can't start in the future")
    if (!ongoing && endMs < startMs) return setError("The end can't be before the start")
    if (sourceURL.trim() && !/^https?:\/\//i.test(sourceURL)) return setError('Source must start with http:// or https://')
    setError('')
    setLoading(true)
    try {
      await onSubmit({ title, description, sourceURL, category, factionId, layerId, relations, startTime, endTime, ongoing, visibleDays })
    } catch {
      setError('Could not save event')
      setLoading(false)
    }
  }

  return (
    <div className={formOverlayClass}>
      {/* wider than the other forms (two columns), and scrolls inside if it's still taller than the window */}
      <form onSubmit={handleSubmit} className={`${formClass.replace('w-80', 'w-[36rem] max-w-[calc(100vw-2rem)]').replace('gap-4', 'gap-3')} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className={formTitleClass}>{heading}</h2>
          <span className="text-xs text-gray-500">
            {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </span>
        </div>

        {/* two columns: related fields side by side keep the form short */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-3 max-md:flex max-md:flex-col"> {/* phones: one column */}
          <div className={formFieldClass}>
            <label htmlFor="event-title">Title:</label>
            <input type="text" id="event-title" value={title} onChange={(e) => setTitle(e.target.value)} className={formInputClass} />
          </div>
          <div className={formFieldClass}>
            <label htmlFor="event-source">Source (URL):</label>
            <input type="text" id="event-source" value={sourceURL} onChange={(e) => setSourceURL(e.target.value)} className={formInputClass} />
          </div>

          <div className={`${formFieldClass} col-span-2`}>
            <label htmlFor="event-description">Description:</label>
            <input type="text" id="event-description" value={description} onChange={(e) => setDescription(e.target.value)} className={formInputClass} />
          </div>

          <div className={formFieldClass}>
            <label htmlFor="event-category">Category:</label>
            {/* the options come from the category mapping, so they always match what the map can draw */}
            <CategoryPicker id="event-category" value={category} onChange={setCategory} />
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

          <LayerSelect id="event-layer" layers={layers} value={layerId} onChange={setLayerId} className="col-span-2" />

          <div className={formFieldClass}>
            <label htmlFor="event-start">Date:</label>
            <input
              type="datetime-local"
              id="event-start"
              value={startTime}
              max={latestStart}
              onChange={(e) => setStartTime(e.target.value)}
              className={formInputClass}
            />
          </div>
          <div className={formFieldClass}>
            <label htmlFor="event-end" className={ongoing ? 'text-gray-500' : ''}>End date:</label>
            {/* disabled rather than hidden while ongoing, so the form doesn't jump */}
            <input
              type="datetime-local"
              id="event-end"
              value={endTime}
              disabled={ongoing}
              onChange={(e) => setEndTime(e.target.value)}
              className={`${formInputClass} disabled:cursor-not-allowed disabled:opacity-40`}
            />
          </div>

          <div className="col-span-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={ongoing}
                onChange={(e) => setOngoing(e.target.checked)}
                className="accent-accent-400"
              />
              Ongoing (no end yet)
            </label>
            <span className="text-xs text-gray-500">
              {ongoing
                ? 'Stays on the map'
                : visibleUntil && `Visible until ${visibleUntil.toLocaleString()} (end + ${visibleDays} ${visibleDays === 1 ? 'day' : 'days'})`}
            </span>
          </div>
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
          <label htmlFor="event-visible-days" className="flex items-center gap-2 text-sm">
            Visible after end:
            <input
              type="number"
              id="event-visible-days"
              min={1}
              value={visibleDays}
              onChange={(e) => setVisibleDays(Math.max(1, Math.round(Number(e.target.value)) || 1))}
              className={`${formInputClass} w-20`}
            />
            days
          </label>
        )}

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
            {loading ? 'Saving...' : submitLabel}
          </button>
          <button type="button" onClick={onCancel} className={formSecondaryButtonClass}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default EventForm
