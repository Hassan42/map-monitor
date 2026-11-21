import apiFetch from './client'

// a Telegram channel the map watches: its new posts become draft events
export interface ChannelWatch {
  id: number
  channel: string // the username, without @
  active: boolean
}

export function getChannelWatches(mapId: string): Promise<ChannelWatch[]> {
  return apiFetch(`/api/maps/${mapId}/channels`, { method: 'GET' })
}

// channel: a t.me link, @name or name
export function addChannelWatch(mapId: string, channel: string): Promise<ChannelWatch> {
  return apiFetch(`/api/maps/${mapId}/channels`, {
    method: 'POST',
    body: JSON.stringify({ channel }),
  })
}

// stop watching; events it already added stay on the map
export function removeChannelWatch(mapId: string, watchId: number): Promise<void> {
  return apiFetch(`/api/maps/${mapId}/channels/${watchId}`, { method: 'DELETE' })
}
