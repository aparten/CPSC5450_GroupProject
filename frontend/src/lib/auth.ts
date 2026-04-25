import { redirect } from '@tanstack/react-router'

const TOKEN_KEY = 'access_token'
const API_BASE = 'http://localhost:8000/api/v1'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export async function requireAuth() {
  // Skip auth check during SSR — localStorage is not available on the server.
  // The client-side hydration will re-run beforeLoad and enforce auth.
  if (typeof window === 'undefined') return

  const token = getToken()

  if (!token) {
    throw redirect({ to: '/auth/login' })
  }

  try {
    const res = await fetch(`${API_BASE}/login/test-token`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      clearToken()
      throw redirect({ to: '/auth/login' })
    }
  } catch (err) {
    if (err && typeof err === 'object' && 'to' in err) throw err
    clearToken()
    throw redirect({ to: '/auth/login' })
  }
}

export async function login(email: string, password: string) {
  const body = new URLSearchParams({ username: email, password })

  const res = await fetch(`${API_BASE}/login/access-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.detail ?? 'Invalid email or password')
  }

  const data: { access_token: string } = await res.json()
  setToken(data.access_token)
  return data
}

export async function register(email: string, password: string, name: string) {
  const res = await fetch(`${API_BASE}/users/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name: name }),
  })

  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.detail ?? 'Registration failed')
  }

  return res.json()
}

export function logout() {
  clearToken()
  window.location.href = '/auth/login'
}

export async function ingestInbox(): Promise<{ queued_count: number; failed_count: number; remaining_count: number }> {
  const token = getToken()
  const res = await fetch(`${API_BASE}/email/ingest/inbox`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.detail ?? 'Ingestion failed')
  }
  return res.json()
}
