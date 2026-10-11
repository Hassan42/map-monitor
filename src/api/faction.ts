import type { Faction } from '../types/types'
import apiFetch from './client'

export function createFaction(mapId: string, data: Omit<Faction, 'id'>): Promise<Faction> {
  return apiFetch(`/api/maps/${mapId}/factions`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function getMapFactions(mapId: string, draft: boolean): Promise<Faction[]> {
  return apiFetch(`/api/maps/${mapId}/factions?draft=${draft}`, {
    method: 'GET'
  })
}
