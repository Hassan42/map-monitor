import { auth } from '../firebase/BaseConfig'

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken()
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const text = await res.text()
  return text ? JSON.parse(text) : undefined
}

export default apiFetch
