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
