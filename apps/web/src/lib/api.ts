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
  TankLevelReadingCreateBody,
  TankLevelReadingUpdateBody,
  TankLevelReadingResponse,
  FuelDeliveryCreateBody,
  FuelDeliveryResponse,
  ShiftPumpAssignmentBody,
  PumpReadingCreateBody,
  PumpReadingResponse,
  PumpReadingUpdateBody,
  CashHandInCreateBody,
  CashHandInPatchBody,
  CashHandInResponse,
  ReconciliationGetResponse,
  ReconciliationSummaryResponse,
  ReconciliationSummaryWriteCreateBody,
  ReconciliationSummaryWriteUpdateBody,
  WeeklyInventoryCloseCreateBody,
  WeeklyInventoryCloseResponse,
  DashboardResponse,
  EventListResponse,
  EventType,
  ExpenseCreateBody,
  ExpenseUpdateBody,
  ExpenseResponse,
  CashDepositCreateBody,
  CashDepositUpdateBody,
  CashDepositResponse,
  ShiftReportRow,
  DailyReportRow,
  TankVarianceReportResponse,
  WorkerShortageBalance,
  WorkerShortageLedgerResponse,
  ShortageSettlementCreateBody,
  ShortageSettlementResponse,
  PumpReadingPrefillItem,
  ShiftClosePreviewResponse,
  ShiftTeamUpdateBody,
  ShiftTeamResponse,
} from "@pumpapp/shared"

const rawApiBase =
  (import.meta as unknown as { env: { VITE_API_URL?: string } }).env
    .VITE_API_URL ?? ""

const isLocalHost = (hostname: string): boolean =>
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname === "::1" ||
  hostname.endsWith(".localhost")

const resolveApiBase = (): string => {
  const value = rawApiBase.trim()
  if (!value) return "/api"

  try {
    const configured = new URL(value)
    if (
      typeof window !== "undefined" &&
      isLocalHost(configured.hostname) &&
      !isLocalHost(window.location.hostname)
    ) {
      return "/api"
    }
  } catch {
    return value
  }

  return value
}

// In dev: use relative /api so Vite proxy forwards to the API. In prod: same
// origin. A localhost VITE_API_URL is ignored on deployed domains.
const API_BASE = resolveApiBase()

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
  const url = `${API_BASE}${pathStr}`
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
  if (res.status === 204) {
    return undefined as T
  }
  const raw = await res.text()
  let data: T | ApiError = {} as T | ApiError
  if (raw) {
    try {
      data = JSON.parse(raw) as T | ApiError
    } catch {
      data = {} as T | ApiError
    }
  }
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
    let msg = err?.error ?? `Request failed: ${res.status}`
    if (
      msg === "Validation failed" &&
      err.details &&
      typeof err.details === "object" &&
      "errors" in err.details &&
      err.details.errors &&
      typeof err.details.errors === "object"
    ) {
      const fieldErrors = err.details.errors as Record<
        string,
        string[] | undefined
      >
      const first = Object.values(fieldErrors)
        .flat()
        .find((m) => typeof m === "string" && m.length > 0)
      if (first) msg = first
    }
    throw new Error(msg)
  }
  return data as T
}

const requestText = async (
  path: string,
  options: RequestOptions = {}
): Promise<string> => {
  const { method = "GET", body } = options
  const pathStr = path.startsWith("/") ? path : `/${path}`
  const url = `${API_BASE}${pathStr}`
  const token = getToken()
  const headers: Record<string, string> = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(body !== undefined && { "Content-Type": "application/json" }),
  }
  const res = await fetch(url, {
    method,
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  })
  const text = await res.text()
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem("pumpapp_user")
      window.location.href = "/login"
    }
    throw new Error("Session expired")
  }
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`
    try {
      const err = JSON.parse(text) as ApiError
      if (err?.error) msg = err.error
    } catch {
      if (text) msg = text
    }
    throw new Error(msg)
  }
  return text
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

  getTankLevelReadings: (
    tankId: number,
    params?: { from?: string; to?: string; limit?: number }
  ): Promise<TankLevelReadingResponse[]> => {
    const sp = new URLSearchParams()
    if (params?.from) sp.set("from", params.from)
    if (params?.to) sp.set("to", params.to)
    if (params?.limit !== undefined) sp.set("limit", String(params.limit))
    const qs = sp.toString()
    return request<TankLevelReadingResponse[]>(
      `/tanks/${tankId}/level-readings${qs ? `?${qs}` : ""}`
    )
  },
  createTankLevelReading: (
    tankId: number,
    body: TankLevelReadingCreateBody
  ): Promise<TankLevelReadingResponse> =>
    request<TankLevelReadingResponse>(`/tanks/${tankId}/level-readings`, {
      method: "POST",
      body,
    }),
  updateTankLevelReading: (
    tankId: number,
    readingId: number,
    body: TankLevelReadingUpdateBody
  ): Promise<TankLevelReadingResponse> =>
    request<TankLevelReadingResponse>(
      `/tanks/${tankId}/level-readings/${readingId}`,
      { method: "PATCH", body }
    ),

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
  getShift: (id: number): Promise<ShiftResponse> =>
    request<ShiftResponse>(`/shifts/${id}`),
  getShiftClosePreview: (id: number): Promise<ShiftClosePreviewResponse> =>
    request<ShiftClosePreviewResponse>(`/shifts/${id}/close-preview`),
  createShift: (body: ShiftCreateBody): Promise<ShiftResponse> =>
    request<ShiftResponse>("/shifts", { method: "POST", body }),
  quickOpenShift: (): Promise<ShiftResponse> =>
    request<ShiftResponse>("/shifts/quick-open", { method: "POST" }),
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
  updateShiftTeam: (
    shiftId: number,
    body: ShiftTeamUpdateBody
  ): Promise<ShiftTeamResponse> =>
    request<ShiftTeamResponse>(`/shifts/${shiftId}/team`, {
      method: "PUT",
      body,
    }),
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

  getShiftPumpReadings: (shiftId: number): Promise<PumpReadingResponse[]> =>
    request<PumpReadingResponse[]>(`/shifts/${shiftId}/pump-readings`),
  getShiftPumpReadingPrefill: (
    shiftId: number
  ): Promise<PumpReadingPrefillItem[]> =>
    request<PumpReadingPrefillItem[]>(
      `/shifts/${shiftId}/pump-readings/prefill`
    ),
  createShiftPumpReading: (
    shiftId: number,
    body: PumpReadingCreateBody
  ): Promise<PumpReadingResponse> =>
    request<PumpReadingResponse>(`/shifts/${shiftId}/pump-readings`, {
      method: "POST",
      body,
    }),
  updatePumpReading: (
    id: number,
    body: PumpReadingUpdateBody
  ): Promise<PumpReadingResponse> =>
    request<PumpReadingResponse>(`/pump-readings/${id}`, {
      method: "PATCH",
      body,
    }),

  getShiftCashHandIns: (shiftId: number): Promise<CashHandInResponse[]> =>
    request<CashHandInResponse[]>(`/shifts/${shiftId}/cash-handins`),
  getShiftCashHandIn: (
    shiftId: number,
    handInId: number
  ): Promise<CashHandInResponse> =>
    request<CashHandInResponse>(`/shifts/${shiftId}/cash-handins/${handInId}`),
  createShiftCashHandIn: (
    shiftId: number,
    body: CashHandInCreateBody
  ): Promise<CashHandInResponse> =>
    request<CashHandInResponse>(`/shifts/${shiftId}/cash-handins`, {
      method: "POST",
      body,
    }),
  patchShiftCashHandIn: (
    shiftId: number,
    handInId: number,
    body: CashHandInPatchBody
  ): Promise<CashHandInResponse> =>
    request<CashHandInResponse>(`/shifts/${shiftId}/cash-handins/${handInId}`, {
      method: "PATCH",
      body,
    }),
  deleteShiftCashHandIn: (shiftId: number, handInId: number): Promise<void> =>
    request<void>(`/shifts/${shiftId}/cash-handins/${handInId}`, {
      method: "DELETE",
    }),

  getShiftReconciliation: (
    shiftId: number
  ): Promise<ReconciliationGetResponse> =>
    request<ReconciliationGetResponse>(`/shifts/${shiftId}/reconciliation`),
  createShiftReconciliation: (
    shiftId: number,
    body: ReconciliationSummaryWriteCreateBody
  ): Promise<ReconciliationSummaryResponse> =>
    request<ReconciliationSummaryResponse>(
      `/shifts/${shiftId}/reconciliation`,
      { method: "POST", body }
    ),
  updateShiftReconciliation: (
    shiftId: number,
    body: ReconciliationSummaryWriteUpdateBody
  ): Promise<ReconciliationSummaryResponse> =>
    request<ReconciliationSummaryResponse>(
      `/shifts/${shiftId}/reconciliation`,
      { method: "PATCH", body }
    ),

  listWeeklyInventoryCloses: (params?: {
    from?: string
    to?: string
    workerId?: number
  }): Promise<WeeklyInventoryCloseResponse[]> => {
    const sp = new URLSearchParams()
    if (params?.from) sp.set("from", params.from)
    if (params?.to) sp.set("to", params.to)
    if (params?.workerId !== undefined) {
      sp.set("workerId", String(params.workerId))
    }
    const qs = sp.toString()
    return request<WeeklyInventoryCloseResponse[]>(
      `/weekly-inventory-closes${qs ? `?${qs}` : ""}`
    )
  },
  createWeeklyInventoryClose: (
    body: WeeklyInventoryCloseCreateBody
  ): Promise<WeeklyInventoryCloseResponse> =>
    request<WeeklyInventoryCloseResponse>("/weekly-inventory-closes", {
      method: "POST",
      body,
    }),
  getWeeklyInventoryClose: (
    id: number
  ): Promise<WeeklyInventoryCloseResponse> =>
    request<WeeklyInventoryCloseResponse>(`/weekly-inventory-closes/${id}`),
  downloadWeeklyInventoryCsv: (month: string): Promise<string> =>
    requestText(
      `/weekly-inventory-closes/export.csv?month=${encodeURIComponent(month)}`
    ),

  getDashboard: (): Promise<DashboardResponse> =>
    request<DashboardResponse>("/dashboard"),

  getExpenses: (params?: {
    from?: string
    to?: string
    category?: string
  }): Promise<ExpenseResponse[]> => {
    const sp = new URLSearchParams()
    if (params?.from) sp.set("from", params.from)
    if (params?.to) sp.set("to", params.to)
    if (params?.category) sp.set("category", params.category)
    const qs = sp.toString()
    return request<ExpenseResponse[]>(`/expenses${qs ? `?${qs}` : ""}`)
  },
  createExpense: (body: ExpenseCreateBody): Promise<ExpenseResponse> =>
    request<ExpenseResponse>("/expenses", { method: "POST", body }),
  updateExpense: (
    id: number,
    body: ExpenseUpdateBody
  ): Promise<ExpenseResponse> =>
    request<ExpenseResponse>(`/expenses/${id}`, { method: "PATCH", body }),
  deleteExpense: (id: number): Promise<void> =>
    request<void>(`/expenses/${id}`, { method: "DELETE" }),

  getCashDeposits: (params?: {
    from?: string
    to?: string
  }): Promise<CashDepositResponse[]> => {
    const sp = new URLSearchParams()
    if (params?.from) sp.set("from", params.from)
    if (params?.to) sp.set("to", params.to)
    const qs = sp.toString()
    return request<CashDepositResponse[]>(`/cash-deposits${qs ? `?${qs}` : ""}`)
  },
  createCashDeposit: (
    body: CashDepositCreateBody
  ): Promise<CashDepositResponse> =>
    request<CashDepositResponse>("/cash-deposits", { method: "POST", body }),
  updateCashDeposit: (
    id: number,
    body: CashDepositUpdateBody
  ): Promise<CashDepositResponse> =>
    request<CashDepositResponse>(`/cash-deposits/${id}`, {
      method: "PATCH",
      body,
    }),
  deleteCashDeposit: (id: number): Promise<void> =>
    request<void>(`/cash-deposits/${id}`, { method: "DELETE" }),

  getShiftReport: (params?: {
    from?: string
    to?: string
  }): Promise<ShiftReportRow[]> => {
    const sp = new URLSearchParams()
    if (params?.from) sp.set("from", params.from)
    if (params?.to) sp.set("to", params.to)
    const qs = sp.toString()
    return request<ShiftReportRow[]>(`/reports/shifts${qs ? `?${qs}` : ""}`)
  },
  getDailyReport: (params?: {
    from?: string
    to?: string
  }): Promise<DailyReportRow[]> => {
    const sp = new URLSearchParams()
    if (params?.from) sp.set("from", params.from)
    if (params?.to) sp.set("to", params.to)
    const qs = sp.toString()
    return request<DailyReportRow[]>(`/reports/daily${qs ? `?${qs}` : ""}`)
  },
  getTankVarianceReport: (
    tankId: number,
    params?: { from?: string; to?: string }
  ): Promise<TankVarianceReportResponse> => {
    const sp = new URLSearchParams()
    sp.set("tankId", String(tankId))
    if (params?.from) sp.set("from", params.from)
    if (params?.to) sp.set("to", params.to)
    return request<TankVarianceReportResponse>(
      `/reports/tank-variance?${sp.toString()}`
    )
  },
  downloadReportCsv: (
    report: "shifts" | "daily" | "tank-variance",
    params: Record<string, string>
  ): Promise<string> => {
    const sp = new URLSearchParams(params)
    sp.set("format", "csv")
    return requestText(`/reports/${report}?${sp.toString()}`)
  },

  getShortageBalances: (): Promise<WorkerShortageBalance[]> =>
    request<WorkerShortageBalance[]>("/shortages"),
  getWorkerShortageLedger: (
    workerId: number
  ): Promise<WorkerShortageLedgerResponse> =>
    request<WorkerShortageLedgerResponse>(`/shortages?workerId=${workerId}`),
  createShortageSettlement: (
    body: ShortageSettlementCreateBody
  ): Promise<ShortageSettlementResponse> =>
    request<ShortageSettlementResponse>("/shortages/settlements", {
      method: "POST",
      body,
    }),

  getEvents: (params?: {
    type?: EventType
    shiftId?: number
    workerId?: number
    from?: string
    to?: string
    limit?: number
    offset?: number
  }): Promise<EventListResponse> => {
    const sp = new URLSearchParams()
    if (params?.type) sp.set("type", params.type)
    if (params?.shiftId !== undefined) sp.set("shiftId", String(params.shiftId))
    if (params?.workerId !== undefined) {
      sp.set("workerId", String(params.workerId))
    }
    if (params?.from) sp.set("from", params.from)
    if (params?.to) sp.set("to", params.to)
    if (params?.limit !== undefined) sp.set("limit", String(params.limit))
    if (params?.offset !== undefined) sp.set("offset", String(params.offset))
    const qs = sp.toString()
    return request<EventListResponse>(`/events${qs ? `?${qs}` : ""}`)
  },
}

export type { LoginResponseUser }
