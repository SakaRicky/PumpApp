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
  ShiftCreateBody,
  ShiftResponse,
  ShiftUpdateBody,
  ShiftWorkerAssignBody,
  ShiftStockItemBody,
  ShiftStockItemResponse,
  PumpCreateBody,
  PumpUpdateBody,
  PumpResponse,
  FuelPriceCreateBody,
  FuelPriceUpdateBody,
  FuelPriceResponse,
  FuelTypeCreateBody,
  FuelTypeUpdateBody,
  FuelTypeResponse,
  TankCreateBody,
  TankUpdateBody,
  TankResponse,
  FuelDeliveryCreateBody,
  FuelDeliveryResponse,
  ShiftPumpAssignmentBody,
} from "@pumpapp/shared"

// In dev: use relative /api so Vite proxy forwards to the API. In prod: same (empty = same origin).
const API_BASE =
  (import.meta as unknown as { env: { VITE_API_URL?: string } }).env
    .VITE_API_URL ?? ""
const API_PREFIX = API_BASE || "/api"

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
  const pathStr = path.startsWith("/") ? path : `/${path}`
  const base = API_BASE || API_PREFIX
  const url = `${base}${pathStr}`
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
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem("pumpapp_user")
      window.location.href = "/login"
    }
    const err = data as ApiError
    throw new Error(err?.error ?? "Session expired")
  }
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

  getPumps: (): Promise<PumpResponse[]> => request<PumpResponse[]>("/pumps"),
  createPump: (body: PumpCreateBody): Promise<PumpResponse> =>
    request<PumpResponse>("/pumps", { method: "POST", body }),
  updatePump: (id: number, body: PumpUpdateBody): Promise<PumpResponse> =>
    request<PumpResponse>(`/pumps/${id}`, { method: "PATCH", body }),

  getFuelTypes: (): Promise<FuelTypeResponse[]> =>
    request<FuelTypeResponse[]>("/fuel-types"),
  createFuelType: (body: FuelTypeCreateBody): Promise<FuelTypeResponse> =>
    request<FuelTypeResponse>("/fuel-types", { method: "POST", body }),
  updateFuelType: (
    id: number,
    body: FuelTypeUpdateBody
  ): Promise<FuelTypeResponse> =>
    request<FuelTypeResponse>(`/fuel-types/${id}`, { method: "PATCH", body }),

  getTanks: (fuelTypeId?: number): Promise<TankResponse[]> =>
    request<TankResponse[]>(
      fuelTypeId !== undefined ? `/tanks?fuelTypeId=${fuelTypeId}` : "/tanks"
    ),
  createTank: (body: TankCreateBody): Promise<TankResponse> =>
    request<TankResponse>("/tanks", { method: "POST", body }),
  updateTank: (id: number, body: TankUpdateBody): Promise<TankResponse> =>
    request<TankResponse>(`/tanks/${id}`, { method: "PATCH", body }),

  getDeliveries: (tankId?: number): Promise<FuelDeliveryResponse[]> =>
    request<FuelDeliveryResponse[]>(
      tankId !== undefined
        ? `/fuel-deliveries?tankId=${tankId}`
        : "/fuel-deliveries"
    ),
  createDelivery: (
    tankId: number,
    body: FuelDeliveryCreateBody
  ): Promise<FuelDeliveryResponse> =>
    request<FuelDeliveryResponse>(`/tanks/${tankId}/deliveries`, {
      method: "POST",
      body,
    }),

  getFuelPrices: (): Promise<FuelPriceResponse[]> =>
    request<FuelPriceResponse[]>("/fuel-prices"),
  createFuelPrice: (body: FuelPriceCreateBody): Promise<FuelPriceResponse> =>
    request<FuelPriceResponse>("/fuel-prices", { method: "POST", body }),
  updateFuelPrice: (
    id: number,
    body: FuelPriceUpdateBody
  ): Promise<FuelPriceResponse> =>
    request<FuelPriceResponse>(`/fuel-prices/${id}`, {
      method: "PATCH",
      body,
    }),

  // Shifts & workers on shifts
  getShifts: (): Promise<ShiftResponse[]> =>
    request<ShiftResponse[]>("/shifts"),
  createShift: (body: ShiftCreateBody): Promise<ShiftResponse> =>
    request<ShiftResponse>("/shifts", { method: "POST", body }),
  updateShift: (id: number, body: ShiftUpdateBody): Promise<ShiftResponse> =>
    request<ShiftResponse>(`/shifts/${id}`, { method: "PATCH", body }),

  getShiftWorkers: (shiftId: number): Promise<WorkerResponse[]> =>
    request<WorkerResponse[]>(`/shifts/${shiftId}/workers`),
  assignShiftWorkers: (
    shiftId: number,
    body: ShiftWorkerAssignBody
  ): Promise<void> =>
    request<void>(`/shifts/${shiftId}/workers`, { method: "POST", body }),
  unassignShiftWorker: (shiftId: number, workerId: number): Promise<void> =>
    request<void>(`/shifts/${shiftId}/workers/${workerId}`, {
      method: "DELETE",
    }),

  getShiftPumpAssignments: (
    shiftId: number
  ): Promise<
    {
      pumpId: number
      pumpName: string
      workerId: number | null
      workerName: string | null
    }[]
  > => request(`/shifts/${shiftId}/pump-assignments`),
  assignShiftPump: (
    shiftId: number,
    body: ShiftPumpAssignmentBody
  ): Promise<void> =>
    request<void>(`/shifts/${shiftId}/pump-assignments`, {
      method: "POST",
      body,
    }),

  getShiftStock: (shiftId: number): Promise<ShiftStockItemResponse[]> =>
    request<ShiftStockItemResponse[]>(`/shifts/${shiftId}/stock`),
  upsertShiftStock: (
    shiftId: number,
    items: ShiftStockItemBody[]
  ): Promise<void> =>
    request<void>(`/shifts/${shiftId}/stock`, {
      method: "PUT",
      body: items,
    }),

  getShiftPumpReadings: (shiftId: number) =>
    request<
      {
        id: number
        pumpId: number
        shiftId: number
        openingReading: number
        closingReading: number
        recordedById: number
        recordedAt: string
        volume?: number
      }[]
    >(`/shifts/${shiftId}/pump-readings`),
  createShiftPumpReading: (
    shiftId: number,
    body: {
      pumpId: number
      openingReading: number
      closingReading: number
    }
  ): Promise<void> =>
    request<void>(`/shifts/${shiftId}/pump-readings`, {
      method: "POST",
      body,
    }),
}

export type { LoginResponseUser }
