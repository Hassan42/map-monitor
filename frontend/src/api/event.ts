import type { EventMarker } from '../types/types'
import apiFetch from './client'

export function createEvent(mapId: string, data: Omit<EventMarker, 'id'>): Promise<EventMarker> {
  return apiFetch(`/api/maps/${mapId}/events`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function getMapEvents(mapId: string, draft: boolean): Promise<EventMarker[]> {
  return apiFetch(`/api/maps/${mapId}/events?draft=${draft}`, {
    method: 'GET',
  })
}

export function editEvent(mapId: string, eventId: number, data: Omit<EventMarker, 'id'>): Promise<EventMarker> {
  return apiFetch(`/api/maps/${mapId}/events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteEvent(mapId: string, eventId: number): Promise<number> {
  return apiFetch(`/api/maps/${mapId}/events/${eventId}`, {
    method: 'DELETE',
  })
}
