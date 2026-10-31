import apiFetch from './client'

export function createUserProfile(username: string) {
  return apiFetch('/api/users', { method: 'POST', body: JSON.stringify({ username }) })
}

export function getMe(): Promise<{username: string} | null> {
  return apiFetch('/api/users/me', { method: 'GET' })
}