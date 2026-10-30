import { useEffect, useState } from 'react'
import { useMap } from '../store/MapContext'
import { createEvent } from '../api/event'
import type { EventMarker, Faction, Layer } from '../types/types'
import EventForm from './EventForm'
import { emptyEventForm, endTimeForServer, startTimeMs } from './eventFormValues'
import type { EventFormValues } from './eventFormValues'

// new event: click the map to place it, then fill in the shared EventForm
function AddEvent({
  mapId,
  factions,
  layers,
  events,
  now,
  active,
  onExit,
  onCreated,
}: {
  mapId: string
  factions: Faction[]
  layers: Layer[]
  events: EventMarker[] // the map's events, to pick related events from
  now: number // the map's date: the form's default start and end
  active: boolean
  onExit: () => void
  onCreated: (event: EventMarker) => void
}) {
  const map = useMap()
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null)

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

  const handleSubmit = async (values: EventFormValues & { factionId: number }) => {
    const start = startTimeMs(values, Date.now())
    const event = await createEvent(mapId, {
      ...values, // relations always sent (empty list when none): the backend replaces the event's relations with it
      latitude: pendingLocation.lat,
      longitude: pendingLocation.lng,
      timestamp: new Date(start).toISOString(),
      endTime: endTimeForServer(values, start),
    })
    onCreated(event)
    setPendingLocation(null)
  }

  return (
    <EventForm
      // a new placement starts a fresh form
      key={`${pendingLocation.lat},${pendingLocation.lng}`}
      heading="New Event"
      submitLabel="Add Event"
      initial={emptyEventForm(now)}
      location={pendingLocation}
      factions={factions}
      layers={layers}
      events={events}
      onSubmit={handleSubmit}
      onCancel={() => setPendingLocation(null)}
    />
  )
}

export default AddEvent
