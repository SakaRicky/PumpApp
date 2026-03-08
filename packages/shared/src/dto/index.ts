import type { Role, ShiftStatus, ShopSalesSource } from "../enums.js"

// --- Auth ---

export interface LoginBody {
  username: string
  password: string
}

export interface LoginResponseUser {
  id: number
  name: string
  role: Role
}

export interface LoginResponse {
  token: string
  user: LoginResponseUser
}

// --- Users ---

export interface UserCreateBody {
  workerId: number
  name: string
  email: string
  password: string
  role: Role
}

export interface UserUpdateBody {
  name?: string
  email?: string
  role?: Role
  active?: boolean
}

export interface UserResponse {
  id: number
  workerId: number
  name: string
  email: string
  role: Role
  active: boolean
  createdAt: string
  updatedAt: string
  worker?: { id: number; name: string }
}

// --- Workers ---

export interface WorkerCreateBody {
  name: string
  designation?: string
}

export interface WorkerUpdateBody {
  name?: string
  designation?: string
  active?: boolean
}

export interface WorkerResponse {
  id: number
  name: string
  designation: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

// --- Categories ---

export interface CategoryCreateBody {
  name: string
  description?: string
}

export interface CategoryUpdateBody {
  name?: string
  description?: string
}

export interface CategoryResponse {
  id: number
  name: string
  description: string | null
}

// --- Products ---

export interface ProductCreateBody {
  name: string
  categoryId: number
  sellingPrice: number
  currentStock?: number
  active?: boolean
}

export interface ProductUpdateBody {
  name?: string
  categoryId?: number
  sellingPrice?: number
  currentStock?: number
  active?: boolean
}

export interface ProductResponse {
  id: number
  name: string
  categoryId: number
  sellingPrice: number
  currentStock: number
  active: boolean
  createdAt: string
  updatedAt: string
  /** Present when the API includes category (e.g. list endpoints) for list UX */
  category?: { id: number; name: string }
}

// --- Purchase price history ---

export interface PurchasePriceCreateBody {
  purchasePrice: number
  effectiveAt: string
  notes?: string
}

export interface PurchasePriceResponse {
  id: number
  productId: number
  purchasePrice: number
  effectiveAt: string
  notes: string | null
}

export interface PurchasePriceCreateResponse extends PurchasePriceResponse {
  alert?: boolean
}

// --- Fuel price history ---

export interface FuelPriceCreateBody {
  pumpId: number
  pricePerUnit: number
  effectiveFrom: string
  effectiveTo?: string
}

export interface FuelPriceUpdateBody {
  pricePerUnit?: number
  effectiveFrom?: string
  effectiveTo?: string
}

export interface FuelPriceResponse {
  id: number
  pumpId: number
  pricePerUnit: number
  effectiveFrom: string
  effectiveTo: string | null
}

// --- Pumps ---

export interface PumpCreateBody {
  name: string
  active?: boolean
}

export interface PumpUpdateBody {
  name?: string
  active?: boolean
}

export interface PumpResponse {
  id: number
  name: string
  active: boolean
}

// --- Shifts ---

export interface ShiftCreateBody {
  date: string
  startTime: string
  endTime: string
  status: ShiftStatus
  notes?: string
}

export interface ShiftUpdateBody {
  date?: string
  startTime?: string
  endTime?: string
  status?: ShiftStatus
  notes?: string
}

export interface ShiftResponse {
  id: number
  date: string
  startTime: string
  endTime: string
  status: ShiftStatus
  notes: string | null
}

// --- Shift workers ---

export interface ShiftWorkerAssignBody {
  workerId?: number
  workerIds?: number[]
}

// --- Pump readings ---

export interface PumpReadingCreateBody {
  pumpId: number
  openingReading: number
  closingReading: number
}

export interface PumpReadingUpdateBody {
  openingReading?: number
  closingReading?: number
}

export interface PumpReadingResponse {
  id: number
  pumpId: number
  shiftId: number
  openingReading: number
  closingReading: number
  recordedById: number
  recordedAt: string
  volume?: number
}

// --- Cash hand-in ---

export interface CashHandInCreateBody {
  workerId?: number
  amount: number
}

export interface CashHandInResponse {
  id: number
  shiftId: number
  workerId: number | null
  amount: number
  recordedById: number
  recordedAt: string
}

// --- Shift reconciliation summary ---

export interface ReconciliationSummaryCreateBody {
  shopSalesSource: ShopSalesSource
  systemShopSalesTotal?: number
  manualShopSalesTotal?: number
  effectiveShopSalesTotal: number
  manualShopSalesReason?: string
  fuelSalesTotal: number
  cashHandedTotal: number
  discrepancyAmount: number
  notes?: string
}

export interface ReconciliationSummaryUpdateBody {
  shopSalesSource?: ShopSalesSource
  systemShopSalesTotal?: number
  manualShopSalesTotal?: number
  effectiveShopSalesTotal?: number
  manualShopSalesReason?: string
  fuelSalesTotal?: number
  cashHandedTotal?: number
  discrepancyAmount?: number
  reviewedById?: number | null
  notes?: string
}

export interface ReconciliationSummaryResponse {
  id: number
  shiftId: number
  shopSalesSource: ShopSalesSource
  systemShopSalesTotal: number | null
  manualShopSalesTotal: number | null
  effectiveShopSalesTotal: number
  manualShopSalesReason: string | null
  fuelSalesTotal: number
  cashHandedTotal: number
  discrepancyAmount: number
  reviewedById: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

// --- Fixed costs ---

export interface FixedCostCreateBody {
  name: string
  monthlyAmount: number
  effectiveMonth: string
  notes?: string
}

export interface FixedCostUpdateBody {
  name?: string
  monthlyAmount?: number
  effectiveMonth?: string
  notes?: string
}

export interface FixedCostResponse {
  id: number
  name: string
  monthlyAmount: number
  effectiveMonth: string
  notes: string | null
}
