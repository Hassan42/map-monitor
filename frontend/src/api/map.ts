import type { DraftStatus, MapChange, MapSummary, MapVisibility } from '../types/types'
import apiFetch from './client'

// visibility is optional: the backend makes a new map PRIVATE when it's left out
export function createUserMap(data: Omit<MapSummary, 'id' | 'visibility' | 'creator' | 'owned'> & { visibility?: MapVisibility }): Promise<MapSummary> {
  return apiFetch('/api/maps', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function getUserMaps(): Promise<MapSummary[]> {
  return apiFetch('/api/maps', { method: 'GET' })
}

export function getPublicMaps(countries: string[]): Promise<MapSummary[]> {
  const query = countries.length > 0 ? `?countries=${countries.join(',')}` : ''
  return apiFetch(`/api/maps/public${query}`, { method: 'GET' })
}

export function getMapById(mapId: string): Promise<MapSummary> {
  return apiFetch(`/api/maps/${mapId}`, { method: 'GET' })
}


export function deleteUserMap(mapId: string): Promise<MapSummary[]> {
  return apiFetch(`/api/maps/${mapId}`, { method: 'DELETE' })
}

export function changeVisibility(mapId: string, visibility: MapVisibility): Promise<void> {
  return apiFetch(`/api/maps/${mapId}/visibility`, {
    method: 'PATCH',
    body: JSON.stringify({ visibility }),
  })
}

export function changeCountries(mapId: string, countries: string[]): Promise<string[]> {
  return apiFetch(`/api/maps/${mapId}/countries`, {
    method: 'PATCH',
    body: JSON.stringify({ countries }),
  })
}

export function startDraft(mapId: string): Promise<void> {
  return apiFetch(`/api/maps/${mapId}/draft`, { method: 'POST' })
}

export function publishMap(mapId: string): Promise<void> {
  return apiFetch(`/api/maps/${mapId}/publish`, { method: 'POST' })
}

export function getDraftStatus(mapId: string): Promise<DraftStatus> {
  return apiFetch(`/api/maps/${mapId}/draft`, { method: 'GET' })
}

// everything the draft changed compared with the published map (empty when there's no draft)
export function getDraftChanges(mapId: string): Promise<MapChange[]> {
  return apiFetch(`/api/maps/${mapId}/changes`, { method: 'GET' })
}


// undoes the draft's change to one element: it goes back to how it's published (an added one is removed)
export function discardChange(mapId: string, change: MapChange): Promise<void> {
  return apiFetch(`/api/maps/${mapId}/changes/${change.entityType}/${change.stableId}`, { method: 'DELETE' })
}

// how many users monitor the map, and whether you do
export interface Monitors {
  count: number
  monitoredByMe: boolean
}

export function getMonitorsCount(mapId: string): Promise<Monitors> {
  return apiFetch(`/api/maps/${mapId}/monitorsCount`, {method: 'GET'})
}
