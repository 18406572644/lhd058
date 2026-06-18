import router from '@/router'

interface ApiRes<T = unknown> {
  success: boolean
  error?: string
  data: T
}

interface RequestOptions {
  method: string
  url: string
  data?: unknown
  params?: Record<string, string | number>
}

async function request<T = unknown>(options: RequestOptions): Promise<ApiRes<T>> {
  const { method, url, data, params } = options

  let queryString = ''
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value))
      }
    })
    const qs = searchParams.toString()
    if (qs) queryString = `?${qs}`
  }

  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${url}${queryString}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  })

  if (res.status === 401) {
    localStorage.removeItem('token')
    router.push('/login')
    throw new Error('Unauthorized')
  }

  const json = await res.json()
  if (!json.success && !json.data) {
    json.data = null
  }
  return json as ApiRes<T>
}

export async function get<T = unknown>(url: string, params?: Record<string, string | number>) {
  return request<T>({ method: 'GET', url, params })
}

export async function post<T = unknown>(url: string, data?: unknown) {
  return request<T>({ method: 'POST', url, data })
}

export async function put<T = unknown>(url: string, data?: unknown) {
  return request<T>({ method: 'PUT', url, data })
}

export async function del<T = unknown>(url: string) {
  return request<T>({ method: 'DELETE', url })
}

export async function patch<T = unknown>(url: string, data?: unknown) {
  return request<T>({ method: 'PATCH', url, data })
}

export async function postForm<T = unknown>(url: string, file: File) {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const formData = new FormData()
  formData.append('image', file)

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (res.status === 401) {
    localStorage.removeItem('token')
    router.push('/login')
    throw new Error('Unauthorized')
  }

  return res.json() as Promise<ApiRes<T>>
}

export type { ApiRes }
