import type {
  LoginResponse,
  LoginResponseUser,
  UserResponse,
  UserCreateBody,
  UserUpdateBody,
  WorkerResponse,
  WorkerCreateBody,
  WorkerUpdateBody,
} from "@pumpapp/shared"

const API_BASE =
  (import.meta as unknown as { env: { VITE_API_URL?: string } }).env
    .VITE_API_URL ?? "http://localhost:5000/api"

const TOKEN_KEY = "pumpapp_token"

const getToken = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  body?: unknown
}

interface ApiError {
  error: string
  code?: string
  details?: Record<string, unknown>
}

const request = async <T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { method = "GET", body } = options
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`
  const token = getToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  }
  const res = await fetch(url, {
    method,
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  })
  const data = (await res.json().catch(() => ({}))) as T | ApiError
  if (!res.ok) {
    const err = data as ApiError
    throw new Error(err?.error ?? `Request failed: ${res.status}`)
  }
  return data as T
}

export const api = {
  login: (username: string, password: string): Promise<LoginResponse> =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: { username, password },
    }),

  getUsers: (): Promise<UserResponse[]> => request<UserResponse[]>("/users"),
  createUser: (body: UserCreateBody): Promise<UserResponse> =>
    request<UserResponse>("/users", { method: "POST", body }),
  updateUser: (id: number, body: UserUpdateBody): Promise<UserResponse> =>
    request<UserResponse>(`/users/${id}`, { method: "PATCH", body }),

  getWorkers: (): Promise<WorkerResponse[]> =>
    request<WorkerResponse[]>("/workers"),
  createWorker: (body: WorkerCreateBody): Promise<WorkerResponse> =>
    request<WorkerResponse>("/workers", { method: "POST", body }),
  updateWorker: (id: number, body: WorkerUpdateBody): Promise<WorkerResponse> =>
    request<WorkerResponse>(`/workers/${id}`, { method: "PATCH", body }),
}

export type { LoginResponseUser }
