import type { Territory } from '../types/types'
import apiFetch from './client'

export function createTerritory(mapId: string, data: Omit<Territory, 'id'>): Promise<Territory> {
  return apiFetch(`/api/maps/${mapId}/territories`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function getMapTerritories(mapId: string, draft: boolean): Promise<Territory[]> {
  return apiFetch(`/api/maps/${mapId}/territories?draft=${draft}`, {
    method: 'GET',
  })
}

// PUT returns the same summary as GET (id = stableId)
export function editTerritory(mapId: string, stableId: number, data: Omit<Territory, 'id'>): Promise<Territory> {
  return apiFetch(`/api/maps/${mapId}/territories/${stableId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteTerritory(mapId: string, stableId: number): Promise<number> {
  return apiFetch(`/api/maps/${mapId}/territories/${stableId}`, {
    method: 'DELETE',
  })
}
