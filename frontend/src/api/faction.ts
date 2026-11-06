import type { Faction } from '../types/types'
import apiFetch from './client'

export function createFaction(mapId: string, data: Omit<Faction, 'id'>): Promise<Faction> {
  return apiFetch(`/api/maps/${mapId}/factions`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// PUT returns the same summary as GET (id = stableId)
export function editFaction(mapId: string, stableId: number, data: Omit<Faction, 'id'>): Promise<Faction> {
  return apiFetch(`/api/maps/${mapId}/factions/${stableId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteFaction(mapId: string, stableId: number): Promise<number> {
  return apiFetch(`/api/maps/${mapId}/factions/${stableId}`, {
    method: 'DELETE',
  })
}

export function getMapFactions(mapId: string, draft: boolean): Promise<Faction[]> {
  return apiFetch(`/api/maps/${mapId}/factions?draft=${draft}`, {
    method: 'GET'
  })
}
