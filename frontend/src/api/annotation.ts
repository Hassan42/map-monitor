import type { Annotation } from '../types/types'
import apiFetch from './client'

// missing numbers (e.g. a backend without the rotation column yet) would turn into NaN while editing
function withDefaults(a: Annotation): Annotation {
  return { ...a, scale: a.scale ?? 1, rotation: a.rotation ?? 0 }
}

// POST/PUT return the raw entity: its `id` is the row id, so map stableId back to `id` like GET does
function toAnnotation(a: Annotation & { stableId: number }): Annotation {
  return withDefaults({
    id: a.stableId,
    kind: a.kind,
    geometry: a.geometry,
    factionId: a.factionId,
    layerId: a.layerId ?? null,
    label: a.label,
    color: a.color,
    scale: a.scale,
    rotation: a.rotation,
    startTime: a.startTime ?? null,
    endTime: a.endTime ?? null,
  })
}

export async function getMapAnnotations(mapId: string, draft: boolean): Promise<Annotation[]> {
  const annotations: Annotation[] = await apiFetch(`/api/maps/${mapId}/annotations?draft=${draft}`, {
    method: 'GET',
  })
  return annotations.map(withDefaults)
}

export async function createAnnotation(mapId: string, data: Omit<Annotation, 'id'>): Promise<Annotation> {
  const a = await apiFetch(`/api/maps/${mapId}/annotations`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return toAnnotation(a)
}

export async function editAnnotation(mapId: string, stableId: number, data: Omit<Annotation, 'id'>): Promise<Annotation> {
  const a = await apiFetch(`/api/maps/${mapId}/annotations/${stableId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return toAnnotation(a)
}

export function deleteAnnotation(mapId: string, stableId: number): Promise<number> {
  return apiFetch(`/api/maps/${mapId}/annotations/${stableId}`, {
    method: 'DELETE',
  })
}
