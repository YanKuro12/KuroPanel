const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export async function apiFetch(endpoint, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.error || 'API request failed')
  }

  return res.json()
}

export async function apiGet(endpoint) {
  return apiFetch(endpoint, { method: 'GET' })
}

export async function apiPost(endpoint, data) {
  return apiFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function apiPut(endpoint, data) {
  return apiFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function apiPatch(endpoint, data) {
  return apiFetch(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function apiDelete(endpoint) {
  return apiFetch(endpoint, { method: 'DELETE' })
}

export async function apiUpload(endpoint, formData) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const headers = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.error || 'Upload failed')
  }

  return res.json()
}

export async function apiDownload(endpoint) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const headers = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'GET',
    headers,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.error || 'Download failed')
  }

  return res.blob()
}

export function getApiUrl() {
  return API_URL
}