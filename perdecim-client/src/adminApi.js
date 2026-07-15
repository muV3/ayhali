export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7237'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function readResponse(response) {
  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) return response.json()
  return response.text()
}

export async function apiRequest(path, { token, onUnauthorized, body, headers, ...options } = {}) {
  const requestHeaders = new Headers(headers)
  if (token) requestHeaders.set('Authorization', `Bearer ${token}`)
  if (body && !(body instanceof FormData)) requestHeaders.set('Content-Type', 'application/json')

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: requestHeaders,
    body: body && !(body instanceof FormData) ? JSON.stringify(body) : body,
  })

  const result = await readResponse(response)

  if (!response.ok) {
    if (response.status === 401 && onUnauthorized) onUnauthorized()
    const message = typeof result === 'object' && result?.message
      ? result.message
      : 'İşlem tamamlanamadı. Lütfen tekrar deneyin.'
    throw new ApiError(message, response.status)
  }

  return result
}

export function resolveImageUrl(url) {
  if (!url) return ''
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`
}
