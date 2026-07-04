import type {
  EventType,
  Role,
  ShiftStatus,
  ShopSalesSource,
} from "../enums.js"

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
  dipToleranceLiters?: number | null
  dipTolerancePct?: number | null
}

export interface TankUpdateBody {
  fuelTypeId?: number
  name?: string
  capacity?: number
  active?: boolean
  actualQuantity?: number
  dipToleranceLiters?: number | null
  dipTolerancePct?: number | null
}

export interface TankResponse {
  id: number
  fuelTypeId: number
  name: string
  capacity: number | null
  theoreticalQuantity: number | null
  actualQuantity: number | null
  actualQuantityRecordedAt: string | null
  dipToleranceLiters: number | null
  dipTolerancePct: number | null
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
  receivedQty: number
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
  overrideCeiling?: boolean
  overrideReason?: string
}

export interface PumpReadingUpdateBody {
  openingReading?: number
  closingReading?: number
  overrideCeiling?: boolean
  overrideReason?: string
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

export interface CashHandInPatchBody {
  workerId?: number
  amount?: number
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

export interface ReconciliationExpectedFuelHandIn {
  workerId: number
  workerName: string | null
  volume: number
  expectedAmount: number
  pumps: Array<{
    pumpId: number
    pumpName: string
    volume: number
    pricePerUnit: number
    amount: number
  }>
}

export interface ReconciliationAssignmentIssue {
  workerId: number | null
  workerName: string | null
  pumpId: number
  pumpName: string
  message: string
}

/** GET /shifts/:id/reconciliation — current snapshot + hints (summary null if not created yet). */
export interface ReconciliationGetResponse {
  summary: ReconciliationSummaryResponse | null
  computedShopSalesTotal: number
  computedFuelSalesTotal: number | null
  sumCashHandIns: number
  fuelComputationError: string | null
  expectedFuelHandIns: ReconciliationExpectedFuelHandIn[]
  assignmentIssues: ReconciliationAssignmentIssue[]
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

// --- Events (append-only audit journal) ---

export interface EventResponse {
  id: number
  type: EventType
  occurredAt: string
  actorUserId: number | null
  workerId: number | null
  shiftId: number | null
  entity: string | null
  entityId: number | null
  payload: unknown
  correctsEventId: number | null
  notes: string | null
}

export interface EventListResponse {
  items: EventResponse[]
  total: number
}

// --- Dashboard ---

export interface DashboardPendingShift {
  shiftId: number
  date: string
  startTime: string
  endTime: string
  status: ShiftStatus
  /** Whole days since the shift date (aging badge for the pending queue). */
  ageDays: number
}

export interface DashboardToday {
  date: string
  shiftsTotal: number
  shiftsReconciled: number
  currentShiftId: number | null
  currentShiftStatus: ShiftStatus | null
  fuelVolume: number
  /** Null when a fuel price could not be resolved for a shift. */
  fuelRevenue: number | null
  shopRevenue: number
  cashHandedIn: number
  /** Expenses recorded for today. */
  expenses: number
}

export interface DashboardTank {
  id: number
  name: string
  fuelTypeName: string
  capacity: number | null
  theoreticalQuantity: number | null
  actualQuantity: number | null
  actualQuantityRecordedAt: string | null
  /** actual − theoretical when both are known (negative = loss). */
  varianceQuantity: number | null
  /** Verdict of the last variance against the tank's tolerance; null when not verifiable. */
  withinTolerance: boolean | null
}

export interface DashboardRecentDiscrepancy {
  shiftId: number
  date: string
  discrepancyAmount: number
}

export interface DashboardResponse {
  pendingReconciliations: DashboardPendingShift[]
  staleOpenShifts: DashboardPendingShift[]
  today: DashboardToday
  tanks: DashboardTank[]
  recentDiscrepancies: DashboardRecentDiscrepancy[]
  safeBalance: SafeBalanceResponse
}

// --- Expenses & cash deposits (safe money) ---

export interface ExpenseCreateBody {
  date: string
  category: string
  amount: number
  paidBy?: string | null
  description?: string | null
}

export interface ExpenseUpdateBody {
  date?: string
  category?: string
  amount?: number
  paidBy?: string | null
  description?: string | null
}

export interface ExpenseResponse {
  id: number
  date: string
  category: string
  amount: number
  paidBy: string | null
  description: string | null
  recordedById: number
  createdAt: string
  updatedAt: string
}

export interface CashDepositCreateBody {
  date: string
  amount: number
  destination: string
  reference?: string | null
  notes?: string | null
}

export interface CashDepositUpdateBody {
  date?: string
  amount?: number
  destination?: string
  reference?: string | null
  notes?: string | null
}

export interface CashDepositResponse {
  id: number
  date: string
  amount: number
  destination: string
  reference: string | null
  notes: string | null
  recordedById: number
  createdAt: string
  updatedAt: string
}

/** Safe balance projection: cash collected − expenses − deposits. */
export interface SafeBalanceResponse {
  cashCollected: number
  expensesTotal: number
  depositsTotal: number
  balance: number
}

// --- Reports (P4) ---

export interface ShiftReportRow {
  shiftId: number
  date: string
  startTime: string
  endTime: string
  status: ShiftStatus
  reconciled: boolean
  fuelVolume: number
  /** Null when a fuel price could not be resolved and no summary exists. */
  fuelRevenue: number | null
  shopRevenue: number | null
  cashHandedIn: number
  /** Null until the shift is reconciled (server-derived on the summary). */
  discrepancy: number | null
}

export interface DailyReportRow {
  date: string
  shiftsTotal: number
  shiftsReconciled: number
  fuelVolume: number
  fuelRevenue: number | null
  shopRevenue: number | null
  cashHandedIn: number
  discrepancy: number | null
}

export interface TankVarianceRow {
  readingId: number
  measuredAt: string
  actualQuantity: number
  theoreticalQuantity: number | null
  /** actual − theoretical (negative = loss). Null when theoretical unknown. */
  variance: number | null
  /** Running sum of variances over the requested window. */
  cumulativeVariance: number | null
  /** Verdict against the tank's configured tolerance; null when not verifiable. */
  withinTolerance: boolean | null
}

export interface TankVarianceReportResponse {
  tankId: number
  tankName: string
  fuelTypeName: string
  capacity: number | null
  dipToleranceLiters: number | null
  dipTolerancePct: number | null
  rows: TankVarianceRow[]
}

// --- Shortage ledger (P5) ---

export interface ShortageLedgerEntry {
  /** "charge" = weekly close enforced shortfall; "settlement" = repayment/deduction. */
  kind: "charge" | "settlement"
  id: number
  date: string
  amount: number
  /** Running balance after this entry (positive = owed by the worker). */
  balanceAfter: number
  notes: string | null
}

export interface WorkerShortageBalance {
  workerId: number
  workerName: string
  chargesTotal: number
  settlementsTotal: number
  balance: number
}

export interface WorkerShortageLedgerResponse extends WorkerShortageBalance {
  entries: ShortageLedgerEntry[]
}

export interface ShortageSettlementCreateBody {
  workerId: number
  date: string
  amount: number
  notes?: string | null
}

export interface ShortageSettlementResponse {
  id: number
  workerId: number
  date: string
  amount: number
  notes: string | null
  recordedById: number
  createdAt: string
}

// --- Settings (P5) ---

export interface SettingResponse {
  key: string
  value: unknown
  updatedAt: string
}

export interface SettingPutBody {
  value: unknown
}

// --- Selling price history (P5) ---

export interface SellingPriceResponse {
  id: number
  productId: number
  price: number
  effectiveAt: string
  createdAt: string
}

// --- Pump reading prefill (opening = last closing) ---

export interface PumpReadingPrefillItem {
  pumpId: number
  lastClosingReading: number
  recentAverageVolume?: number | null
  volumeCeiling?: number | null
}

// --- Shift close preview ---

export interface ShiftClosePreviewPump {
  pumpId: number
  name: string
  opening: number | null
  closing: number | null
  volume: number | null
  price: number | null
  revenue: number | null
  error: string | null
}

export interface ShiftClosePreviewFuelTotal {
  volume: number
  revenue: number | null
  error: string | null
}

export interface ShiftClosePreviewShopLine {
  productId: number
  productName: string
  opening: number
  received: number
  closing: number
  sold: number
  sellingPrice: number
  value: number
}

export interface ShiftClosePreviewDip {
  tankId: number
  measuredAt: string
  variance: number | null
  withinTolerance: boolean | null
}

export interface ShiftClosePreviewResponse {
  shiftId: number
  pumps: ShiftClosePreviewPump[]
  fuelTotal: ShiftClosePreviewFuelTotal
  shop: {
    lines: ShiftClosePreviewShopLine[]
    expectedTotal: number
    negativeLines: ShiftClosePreviewShopLine[]
  }
  dipsToday: ShiftClosePreviewDip[]
  blockers: string[]
  warnings: string[]
}

// --- Shift team (one-shot workers + pump assignments + seller) ---

export interface ShiftTeamUpdateBody {
  workerIds: number[]
  pumpAssignments: Array<{ pumpId: number; workerId: number | null }>
  shopAccountableWorkerId?: number | null
}

export interface ShiftTeamResponse {
  workerIds: number[]
  pumpAssignments: Array<{ pumpId: number; workerId: number | null }>
  shopAccountableWorkerId: number | null
}
