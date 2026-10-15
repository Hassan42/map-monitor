import apiFetch from './client'

export function createUserProfile() {
  return apiFetch('/api/users', { method: 'POST' })
}