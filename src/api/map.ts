import type { DraftStatus, MapSummary } from '../types/types'
import apiFetch from './client'

export function createUserMap(data: Omit<MapSummary, 'id' | 'ownerId'>): Promise<MapSummary> {
  return apiFetch('/api/maps', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function getUserMaps(): Promise<MapSummary[]> {
  return apiFetch('/api/maps', { method: 'GET' })
}

export function getMapById(mapId: string): Promise<MapSummary> {
  return apiFetch(`/api/maps/${mapId}`, { method: 'GET' })
}


export function deleteUserMap(mapId: string): Promise<MapSummary[]> {
  return apiFetch(`/api/maps/${mapId}`, { method: 'DELETE' })
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
