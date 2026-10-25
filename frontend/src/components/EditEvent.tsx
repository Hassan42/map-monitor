import { editEvent } from '../api/event'
import type { EventMarker, Faction } from '../types/types'
import EventForm from './EventForm'
import { endTimeForServer, eventToFormValues, startTimeMs } from './eventFormValues'
import { parseServerTime } from '../map/eventTime'
import type { EventFormValues } from './eventFormValues'

// existing event: the shared EventForm, filled in with the event's current values
function EditEvent({
  mapId,
  event,
  factions,
  events,
  onSaved,
  onClose,
}: {
  mapId: string
  event: EventMarker
  factions: Faction[]
  events: EventMarker[] // the map's events, to pick related events from
  onSaved: (event: EventMarker) => void
  onClose: () => void
}) {
  const handleSubmit = async (values: EventFormValues & { factionId: number }) => {
    // PUT replaces every field: keep the event's location, take the rest from the form.
    // An unchanged date keeps the exact saved time (the input has no seconds)
    const start = startTimeMs(values, parseServerTime(event.timestamp))
    const saved = await editEvent(mapId, event.id, {
      ...values,
      latitude: event.latitude,
      longitude: event.longitude,
      timestamp: new Date(start).toISOString(),
      endTime: endTimeForServer(values, start),
    })
    onSaved(saved)
    onClose()
  }

  return (
    <EventForm
      key={event.id}
      heading="Edit Event"
      submitLabel="Save"
      initial={eventToFormValues(event)}
      location={{ lat: event.latitude, lng: event.longitude }}
      factions={factions}
      events={events.filter((ev) => ev.id !== event.id)} // an event can't be related to itself
      onSubmit={handleSubmit}
      onCancel={onClose}
    />
  )
}

export default EditEvent
