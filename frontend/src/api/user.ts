import apiFetch from './client'


export function getMe(): Promise<{username: string | null}> {
  return apiFetch('/api/users/me', { method: 'GET' })
}

export function saveUsername(username: string): Promise<{ username: string }> {
  return apiFetch('/api/users/me', { method: 'PATCH', body: JSON.stringify({ username }) })
}