import type {
  CategoryCreateBody,
  CategoryResponse,
  CategoryUpdateBody,
  LoginResponse,
  LoginResponseUser,
  ProductCreateBody,
  ProductResponse,
  ProductUpdateBody,
  PurchasePriceCreateBody,
  PurchasePriceCreateResponse,
  PurchasePriceResponse,
  UserCreateBody,
  UserResponse,
  UserUpdateBody,
  WorkerCreateBody,
  WorkerResponse,
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

  getCategories: (): Promise<CategoryResponse[]> =>
    request<CategoryResponse[]>("/categories"),
  createCategory: (body: CategoryCreateBody): Promise<CategoryResponse> =>
    request<CategoryResponse>("/categories", { method: "POST", body }),
  updateCategory: (
    id: number,
    body: CategoryUpdateBody
  ): Promise<CategoryResponse> =>
    request<CategoryResponse>(`/categories/${id}`, { method: "PATCH", body }),

  getProducts: (): Promise<ProductResponse[]> =>
    request<ProductResponse[]>("/products"),
  createProduct: (body: ProductCreateBody): Promise<ProductResponse> =>
    request<ProductResponse>("/products", { method: "POST", body }),
  updateProduct: (
    id: number,
    body: ProductUpdateBody
  ): Promise<ProductResponse> =>
    request<ProductResponse>(`/products/${id}`, { method: "PATCH", body }),

  getPurchasePrices: (productId: number): Promise<PurchasePriceResponse[]> =>
    request<PurchasePriceResponse[]>(`/products/${productId}/purchase-prices`),
  createPurchasePrice: (
    productId: number,
    body: PurchasePriceCreateBody
  ): Promise<PurchasePriceCreateResponse> =>
    request<PurchasePriceCreateResponse>(
      `/products/${productId}/purchase-prices`,
      { method: "POST", body }
    ),
}

export type { LoginResponseUser }
