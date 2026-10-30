import type { Layer } from '../types/types'
import apiFetch from './client'

export function createLayer(mapId: string, data: Omit<Layer, 'id'>): Promise<Layer> {
  return apiFetch(`/api/maps/${mapId}/layers`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function getMapLayers(mapId: string, draft: boolean): Promise<Layer[]> {
  return apiFetch(`/api/maps/${mapId}/layers?draft=${draft}`, {
    method: 'GET',
  })
}
