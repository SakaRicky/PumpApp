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

// --- Tank level readings (dip history) ---

export interface TankLevelReadingCreateBody {
  quantity: number
  measuredAt?: string
}

export interface TankLevelReadingUpdateBody {
  quantity?: number
  measuredAt?: string
}

export interface TankLevelReadingResponse {
  id: number
  tankId: number
  measuredAt: string
  quantity: number
  theoreticalQuantityAtTime: number | null
  createdAt: string
}

// --- Shifts ---

export interface ShiftCreateBody {
  date: string
  startTime: string
  endTime: string
  status: ShiftStatus
  notes?: string
  shopAccountableWorkerId?: number
}

export interface ShiftUpdateBody {
  date?: string
  startTime?: string
  endTime?: string
  status?: ShiftStatus
  notes?: string
  shopAccountableWorkerId?: number | null
}

export interface ShiftResponse {
  id: number
  date: string
  startTime: string
  endTime: string
  status: ShiftStatus
  notes: string | null
  shopAccountableWorkerId: number | null
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
  /** Purchases/deliveries during the shift (defaults to 0). */
  receivedQty?: number
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
  /** Worker responsible for this pump on the shift (from assignment when recorded). */
  workerId: number | null
  workerName: string | null
  recordedById: number
  recordedAt: string
  volume?: number
}

// --- Cash hand-in ---

export interface CashHandInCreateBody {
  workerId: number
  amount: number
  /** Positive = missing / short; negative = surplus. Omit if none. */
  varianceAmount?: number
  varianceNote?: string | null
}

export interface CashHandInVariancePatchBody {
  varianceAmount?: number | null
  varianceNote?: string | null
}

export interface CashHandInResponse {
  id: number
  shiftId: number
  workerId: number
  amount: number
  varianceAmount: number | null
  varianceNote: string | null
  recordedById: number
  recordedAt: string
}

// --- Shift reconciliation summary (server computes discrepancy & effective totals) ---

export type Phase1ShopSalesSource =
  | typeof ShopSalesSource.SHIFT_SUMMARY_ENTRY
  | typeof ShopSalesSource.MANUAL

export interface ReconciliationSummaryWriteCreateBody {
  shopSalesSource: Phase1ShopSalesSource
  manualShopSalesTotal?: number
  manualShopSalesReason?: string | null
  fuelSalesTotal?: number
  fuelSalesOverrideReason?: string | null
  cashHandedTotal?: number
  cashHandedTotalOverrideReason?: string | null
  notes?: string | null
}

export interface ReconciliationSummaryWriteUpdateBody {
  shopSalesSource?: Phase1ShopSalesSource
  manualShopSalesTotal?: number
  manualShopSalesReason?: string | null
  fuelSalesTotal?: number
  fuelSalesOverrideReason?: string | null
  cashHandedTotal?: number
  cashHandedTotalOverrideReason?: string | null
  reviewedById?: number | null
  notes?: string | null
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
  fuelSalesOverrideReason: string | null
  cashHandedTotal: number
  cashHandedTotalOverrideReason: string | null
  discrepancyAmount: number
  reviewedById: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
  /** From ShiftProductStock × selling price (hint for UI). */
  computedShopSalesTotal: number
  /** From pump readings × fuel price; null if computation failed. */
  computedFuelSalesTotal: number | null
  /** Sum of CashHandIn amounts for this shift. */
  sumCashHandIns: number
  /** Present when computedFuelSalesTotal is null. */
  fuelComputationError?: string | null
}

/** GET /shifts/:id/reconciliation — current snapshot + hints (summary null if not created yet). */
export interface ReconciliationGetResponse {
  summary: ReconciliationSummaryResponse | null
  computedShopSalesTotal: number
  computedFuelSalesTotal: number | null
  sumCashHandIns: number
  fuelComputationError: string | null
}

// --- Weekly inventory close ---

export interface WeeklyInventoryCountLineBody {
  productId: number
  physicalQty: number
}

export interface WeeklyInventoryCloseCreateBody {
  weekStart: string
  weekEnd: string
  workerId: number
  enforcedShortfall: number
  notes?: string
  physicalCountAt?: string | null
  lines?: WeeklyInventoryCountLineBody[]
}

export interface WeeklyInventoryCountLineResponse {
  id: number
  productId: number
  physicalQty: number
}

export interface WeeklyInventoryCloseResponse {
  id: number
  weekStart: string
  weekEnd: string
  workerId: number
  workerName: string
  enforcedShortfall: number
  notes: string | null
  physicalCountAt: string | null
  recordedById: number
  createdAt: string
  updatedAt: string
  /** Sum of per-worker admin-recorded cash variances on shifts in this week for this worker. */
  sumDailyCashShortfalls: number
  lines: WeeklyInventoryCountLineResponse[]
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
