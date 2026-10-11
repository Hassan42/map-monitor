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

// PUT returns the raw entity: its `id` is the row id, so map stableId back to `id` like GET does
export async function editTerritory(mapId: string, stableId: number, data: Omit<Territory, 'id'>): Promise<Territory> {
  const t: Territory & { stableId: number } = await apiFetch(`/api/maps/${mapId}/territories/${stableId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return { id: t.stableId, name: t.name, color: t.color, points: t.points, factionId: t.factionId }
}

export function deleteTerritory(mapId: string, stableId: number): Promise<number> {
  return apiFetch(`/api/maps/${mapId}/territories/${stableId}`, {
    method: 'DELETE',
  })
}
