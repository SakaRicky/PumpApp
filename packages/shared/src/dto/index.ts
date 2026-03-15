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
  /** Latest purchase price (most recent effectiveAt) when the API includes it (e.g. list) */
  currentPurchasePrice?: number
  /** ISO date when currentPurchasePrice became effective; present when currentPurchasePrice is set */
  currentPurchasePriceEffectiveAt?: string
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
  fuelTypeId: number
  pricePerUnit: number
  purchasePricePerUnit?: number
  effectiveFrom: string
  effectiveTo?: string
}

export interface FuelPriceUpdateBody {
  pricePerUnit?: number
  purchasePricePerUnit?: number
  effectiveFrom?: string
  effectiveTo?: string
}

export interface FuelPriceResponse {
  id: number
  fuelTypeId: number
  pricePerUnit: number
  purchasePricePerUnit: number | null
  effectiveFrom: string
  effectiveTo: string | null
}

// --- Fuel types ---

export interface FuelTypeCreateBody {
  name: string
  active?: boolean
}

export interface FuelTypeUpdateBody {
  name?: string
  active?: boolean
}

export interface FuelTypeResponse {
  id: number
  name: string
  active: boolean
  createdAt: string
  updatedAt: string
}

// --- Pumps ---

export interface PumpCreateBody {
  name: string
  active?: boolean
  tankId?: number
}

export interface PumpUpdateBody {
  name?: string
  active?: boolean
  tankId?: number
}

export interface PumpResponse {
  id: number
  name: string
  active: boolean
  tankId?: number | null
  fuelTypeId?: number | null
  fuelTypeName?: string | null
}

// --- Tanks ---

export interface TankCreateBody {
  fuelTypeId: number
  name: string
  capacity?: number
  active?: boolean
}

export interface TankUpdateBody {
  fuelTypeId?: number
  name?: string
  capacity?: number
  active?: boolean
  actualQuantity?: number
}

export interface TankResponse {
  id: number
  fuelTypeId: number
  name: string
  capacity: number | null
  theoreticalQuantity: number | null
  actualQuantity: number | null
  actualQuantityRecordedAt: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  fuelTypeName?: string
}

// --- Fuel deliveries ---

export interface FuelDeliveryCreateBody {
  quantity: number
  deliveredAt?: string
  notes?: string
}

export interface FuelDeliveryResponse {
  id: number
  tankId: number
  quantity: number
  deliveredAt: string
  notes: string | null
  createdAt: string
  updatedAt: string
  tankName?: string
  fuelTypeName?: string
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

// --- Shift pump assignments ---

export interface ShiftPumpAssignmentBody {
  pumpId: number
  workerId: number
}

// --- Shift stock (per-shift product snapshot) ---

export interface ShiftStockItemBody {
  productId: number
  /**
   * Optional on write; when omitted, the API will default this
   * from the previous shift's closing quantity (or current stock for the first shift).
   */
  openingQty?: number
  closingQty: number
}

export type ShiftStockBulkUpdateBody = ShiftStockItemBody[]

export interface ShiftStockItemResponse {
  productId: number
  openingQty: number
  closingQty: number
  soldQty?: number
  product?: {
    id: number
    name: string
    categoryId: number
    categoryName?: string
  }
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
