import type { Profile } from '../types/types'
import apiFetch from './client'
import type { Monitors } from './map'


export function getMe(): Promise<{username: string | null}> {
  return apiFetch('/api/users/me', { method: 'GET' })
}

export function saveUsername(username: string): Promise<{ username: string }> {
  return apiFetch('/api/users/me', { method: 'PATCH', body: JSON.stringify({ username }) })
}

export function getProfile(username: string): Promise<Profile> {
  return apiFetch(`/api/users/profile/${username}`, { method: 'GET' })
}

export function changeDescription(description: string): Promise<{ description: string | null }> {
  return apiFetch('/api/users/me/description', { method: 'PATCH', body: JSON.stringify({ description }) })
}

export function monitorMap(mapID : number): Promise<Monitors> {
  return apiFetch('/api/users/monitorMap', {method: 'POST', body: JSON.stringify( mapID )})
}