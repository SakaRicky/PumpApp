import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import type {
  ShiftResponse,
  WorkerResponse,
  UserResponse,
  ProductResponse,
} from "@pumpapp/shared"
import { ShiftStatus } from "@pumpapp/shared"
import { PageLayout } from "@/components/layout/PageLayout"
import { CalendarClock } from "@/components/icons"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  StockCountGrid,
} from "@/components/shift/StockCountGrid"
import { PumpReadingsGrid } from "@/components/shift/PumpReadingsGrid"
import { deriveStockRow, type StockCountRow } from "@/components/shift/stockCount"
import type { PumpReadingGridRow } from "@/components/shift/pumpReadings"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/authContext"
import { cn } from "@/lib/utils"

type ShiftWithWorkers = ShiftResponse & {
  workers?: WorkerResponse[]
}

const formatIsoDate = (iso: string): string =>
  new Date(iso).toLocaleDateString()

const formatIsoTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })

/** `datetime-local` value is YYYY-MM-DDTHH:mm — replace date, keep clock time. */
const withDatePreservingTime = (
  datetimeLocal: string,
  dateYmd: string,
  fallback: { h: number; m: number }
): string => {
  if (!dateYmd) return datetimeLocal
  const pad = (n: number) => String(n).padStart(2, "0")
  const m = datetimeLocal.match(/T(\d{2}):(\d{2})/)
  const hh = m?.[1] ?? pad(fallback.h)
  const mm = m?.[2] ?? pad(fallback.m)
  return `${dateYmd}T${hh}:${mm}`
}

const SHIFT_STATUS_FILTER_ALL = "ALL" as const

const SHIFT_STATUS_ORDER: ShiftStatus[] = [
  ShiftStatus.PLANNED,
  ShiftStatus.OPEN,
  ShiftStatus.CLOSED,
  ShiftStatus.RECONCILED,
]

const shiftStatusBadgeClassName = (status: ShiftStatus): string =>
  cn(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-tight",
    {
      "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100":
        status === ShiftStatus.PLANNED,
      "border-emerald-400/80 bg-emerald-100 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-50":
        status === ShiftStatus.OPEN,
      "border-amber-400/80 bg-amber-100 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-50":
        status === ShiftStatus.CLOSED,
      "border-violet-400/80 bg-violet-100 text-violet-950 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-50":
        status === ShiftStatus.RECONCILED,
    }
  )

export const ShiftsPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === "ADMIN"
  const [shifts, setShifts] = useState<ShiftWithWorkers[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>(
    SHIFT_STATUS_FILTER_ALL
  )
  const [dateFilter, setDateFilter] = useState("")

  const [createOpen, setCreateOpen] = useState(false)
  const [editShift, setEditShift] = useState<ShiftResponse | null>(null)

  const [createDate, setCreateDate] = useState("")
  const [createStartTime, setCreateStartTime] = useState("")
  const [createEndTime, setCreateEndTime] = useState("")

  const [editDate, setEditDate] = useState("")
  const [editStartTime, setEditStartTime] = useState("")
  const [editEndTime, setEditEndTime] = useState("")
  const [editStatus, setEditStatus] = useState<ShiftStatus>(ShiftStatus.PLANNED)
  const [editNotes, setEditNotes] = useState("")
  const [editShopAccountableWorkerId, setEditShopAccountableWorkerId] =
    useState("")
  const [createShopAccountableWorkerId, setCreateShopAccountableWorkerId] =
    useState("")

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [allWorkers, setAllWorkers] = useState<WorkerResponse[]>([])
  const [allUsers, setAllUsers] = useState<UserResponse[]>([])

  // One-shot team dialog (workers + pump assignments + accountable seller)
  const [teamOpen, setTeamOpen] = useState(false)
  const [teamShift, setTeamShift] = useState<ShiftResponse | null>(null)
  const [teamLoading, setTeamLoading] = useState(false)
  const [teamSaving, setTeamSaving] = useState(false)
  const [teamError, setTeamError] = useState<string | null>(null)
  const [teamWorkerIds, setTeamWorkerIds] = useState<number[]>([])
  const [teamSellerId, setTeamSellerId] = useState<string>("")

  const [stockOpen, setStockOpen] = useState(false)
  const [stockLoading, setStockLoading] = useState(false)
  const [stockError, setStockError] = useState<string | null>(null)
  const [stockSaving, setStockSaving] = useState(false)
  const [selectedShiftForStock, setSelectedShiftForStock] =
    useState<ShiftResponse | null>(null)

  const [stockRows, setStockRows] = useState<StockCountRow[]>([])
  const [stockSearch, setStockSearch] = useState("")
  const [stockOnlyChanged, setStockOnlyChanged] = useState(false)

  const [pumpDialogShift, setPumpDialogShift] = useState<ShiftResponse | null>(
    null
  )
  const [pumpReadingsLoading, setPumpReadingsLoading] = useState(false)
  const [pumpReadingsError, setPumpReadingsError] = useState<string | null>(
    null
  )
  const [pumpReadingRows, setPumpReadingRows] = useState<
    PumpReadingGridRow[]
  >([])
  const [pumpOverrideRow, setPumpOverrideRow] =
    useState<PumpReadingGridRow | null>(null)
  const [pumpOverrideReason, setPumpOverrideReason] = useState("")

  type PumpAssignmentRow = {
    pumpId: number
    pumpName: string
    workerId: number | null
  }
  const [teamAssignments, setTeamAssignments] = useState<PumpAssignmentRow[]>(
    []
  )

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await api.getShifts()
      setShifts(res)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t("shifts.errorLoad"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!isAdmin) return
    void api
      .getWorkers()
      .then((w) => setAllWorkers(w))
      .catch(() => {})
  }, [isAdmin])

  const [quickOpening, setQuickOpening] = useState(false)

  const handleQuickOpen = async () => {
    setQuickOpening(true)
    setLoadError(null)
    try {
      await api.quickOpenShift()
      await load()
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : t("shifts.errors.createFailed")
      )
    } finally {
      setQuickOpening(false)
    }
  }

  const openCreate = () => {
    const today = new Date()
    const isoDate = today.toISOString().slice(0, 10)
    setCreateDate(isoDate)
    setCreateStartTime(`${isoDate}T08:00`)
    setCreateEndTime(`${isoDate}T17:00`)
    setCreateShopAccountableWorkerId("")
    setSubmitError(null)
    setCreateOpen(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createDate || !createStartTime || !createEndTime) {
      setSubmitError(t("shifts.errors.dateAndTimesRequired"))
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.createShift({
        date: createDate,
        startTime: createStartTime,
        endTime: createEndTime,
        status: ShiftStatus.PLANNED,
        ...(createShopAccountableWorkerId !== "" && {
          shopAccountableWorkerId: Number.parseInt(
            createShopAccountableWorkerId,
            10
          ),
        }),
      })
      setCreateOpen(false)
      await load()
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : t("shifts.errors.createFailed")
      )
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (shift: ShiftResponse) => {
    setEditShift(shift)
    setEditDate(shift.date.slice(0, 10))
    setEditStartTime(shift.startTime.slice(0, 16))
    setEditEndTime(shift.endTime.slice(0, 16))
    setEditStatus(shift.status)
    setEditNotes(shift.notes ?? "")
    setEditShopAccountableWorkerId(
      shift.shopAccountableWorkerId != null
        ? String(shift.shopAccountableWorkerId)
        : ""
    )
    setSubmitError(null)
  }

  const closeEdit = () => {
    setEditShift(null)
    setSubmitError(null)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editShift) return
    if (!editDate || !editStartTime || !editEndTime) {
      setSubmitError(t("shifts.errors.dateAndTimesRequired"))
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.updateShift(editShift.id, {
        date: editDate,
        startTime: editStartTime,
        endTime: editEndTime,
        status: editStatus,
        notes: editNotes || undefined,
        shopAccountableWorkerId:
          editShopAccountableWorkerId === ""
            ? null
            : Number.parseInt(editShopAccountableWorkerId, 10),
      })
      closeEdit()
      await load()
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : t("shifts.errors.updateFailed")
      )
    } finally {
      setSubmitting(false)
    }
  }

  const statusLabel = useCallback(
    (status: ShiftStatus): string => t(`shifts.status.${status}`),
    [t]
  )

  const statusOptions = useMemo(
    () => [
      ShiftStatus.PLANNED,
      ShiftStatus.OPEN,
      ShiftStatus.CLOSED,
      ShiftStatus.RECONCILED,
    ],
    []
  )

  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      if (
        statusFilter !== SHIFT_STATUS_FILTER_ALL &&
        s.status !== statusFilter
      ) {
        return false
      }
      if (dateFilter) {
        const ymd = s.date.slice(0, 10)
        if (ymd !== dateFilter) return false
      }
      return true
    })
  }, [shifts, statusFilter, dateFilter])

  const hasActiveFilters =
    statusFilter !== SHIFT_STATUS_FILTER_ALL || Boolean(dateFilter)

  const openTeam = async (shift: ShiftResponse) => {
    setTeamShift(shift)
    setTeamOpen(true)
    setTeamLoading(true)
    setTeamError(null)
    try {
      const [workersRes, usersRes, shiftWorkersRes, assignments] =
        await Promise.all([
          api.getWorkers(),
          api.getUsers(),
          api.getShiftWorkers(shift.id),
          api.getShiftPumpAssignments(shift.id),
        ])
      setAllWorkers(workersRes)
      setAllUsers(usersRes)
      setTeamWorkerIds(shiftWorkersRes.map((w) => w.id))
      setTeamAssignments(
        assignments.map((a) => ({
          pumpId: a.pumpId,
          pumpName: a.pumpName,
          workerId: a.workerId,
        }))
      )
      setTeamSellerId(
        shift.shopAccountableWorkerId != null
          ? String(shift.shopAccountableWorkerId)
          : ""
      )
    } catch (e) {
      setTeamError(
        e instanceof Error ? e.message : t("shifts.errors.loadWorkersFailed")
      )
    } finally {
      setTeamLoading(false)
    }
  }

  const closeTeam = () => {
    setTeamOpen(false)
    setTeamShift(null)
    setTeamError(null)
    setTeamWorkerIds([])
    setTeamAssignments([])
    setTeamSellerId("")
  }

  const toggleTeamWorker = (workerId: number) => {
    setTeamWorkerIds((prev) =>
      prev.includes(workerId)
        ? prev.filter((id) => id !== workerId)
        : [...prev, workerId]
    )
    // Unchecking a worker also clears their pump assignments and seller role.
    setTeamAssignments((prev) =>
      prev.map((row) =>
        row.workerId === workerId ? { ...row, workerId: null } : row
      )
    )
    setTeamSellerId((prev) => (prev === String(workerId) ? "" : prev))
  }

  const setTeamPumpWorker = (pumpId: number, workerId: number | null) => {
    setTeamAssignments((prev) =>
      prev.map((row) => (row.pumpId === pumpId ? { ...row, workerId } : row))
    )
    if (workerId !== null) {
      setTeamWorkerIds((prev) =>
        prev.includes(workerId) ? prev : [...prev, workerId]
      )
    }
  }

  const handleTeamSave = async () => {
    if (!teamShift) return
    setTeamSaving(true)
    setTeamError(null)
    try {
      await api.updateShiftTeam(teamShift.id, {
        workerIds: teamWorkerIds,
        pumpAssignments: teamAssignments.map(({ pumpId, workerId }) => ({
          pumpId,
          workerId,
        })),
        shopAccountableWorkerId:
          teamSellerId === "" ? null : Number(teamSellerId),
      })
      closeTeam()
      await load()
    } catch (e) {
      setTeamError(
        e instanceof Error ? e.message : t("shifts.errors.updateWorkersFailed")
      )
    } finally {
      setTeamSaving(false)
    }
  }

  const workerRoleLabel = (workerId: number): string | null => {
    const user = allUsers.find((u) => u.workerId === workerId)
    if (!user) return null
    return t(`users.role.${user.role}`)
  }

  const isFuelSideWorker = (worker: WorkerResponse): boolean => {
    const role = allUsers.find((u) => u.workerId === worker.id)?.role
    const designation = (worker.designation ?? "").toLowerCase()
    return role === "PUMPIST" || /\bpump/.test(designation)
  }

  const isShopSideWorker = (worker: WorkerResponse): boolean => {
    const role = allUsers.find((u) => u.workerId === worker.id)?.role
    const designation = (worker.designation ?? "").toLowerCase()
    return role === "SALE" || /\bshop\b/.test(designation) || /\bcashier\b/.test(designation)
  }

  const openStock = async (shift: ShiftResponse) => {
    setSelectedShiftForStock(shift)
    setStockOpen(true)
    setStockLoading(true)
    setStockError(null)
    try {
      const [products, stock] = await Promise.all([
        api.getProducts(),
        api.getShiftStock(shift.id),
      ])
      const stockByProduct = new Map(
        stock.map((s) => [s.productId, s] as const)
      )
      const rows: StockCountRow[] = products
        .filter((p) => p.active)
        .map((p: ProductResponse) => {
          const s = stockByProduct.get(p.id)
          const opening =
            s?.openingQty != null
              ? Number(s.openingQty)
              : Number(p.currentStock)
          const received = s?.receivedQty != null ? Number(s.receivedQty) : 0
          const closingSuggested = s?.closingQty == null
          const closing =
            s?.closingQty != null ? Number(s.closingQty) : opening + received
          return {
            productId: p.id,
            productName: p.name,
            categoryName: p.category?.name ?? `#${p.categoryId.toString()}`,
            openingQty: opening.toString(),
            receivedQty: received.toString(),
            closingQty: closing.toString(),
            sellingPrice: Number(p.sellingPrice),
            closingSuggested,
          }
        })
      setStockRows(rows)
    } catch (e) {
      setStockError(
        e instanceof Error ? e.message : t("shifts.errors.loadStockFailed")
      )
    } finally {
      setStockLoading(false)
    }
  }

  const closeStock = () => {
    setStockOpen(false)
    setSelectedShiftForStock(null)
    setStockError(null)
    setStockSaving(false)
    setStockSearch("")
    setStockOnlyChanged(false)
    setStockRows([])
  }

  const updateStockRow = (
    productId: number,
    field: "openingQty" | "receivedQty" | "closingQty",
    value: string
  ) => {
    setStockRows((prev) =>
      prev.map((row) =>
        row.productId === productId
          ? {
              ...row,
              [field]: value,
              ...(field === "closingQty" && { closingSuggested: false }),
            }
          : row
      )
    )
  }

  const fillAllStockSuggestions = () => {
    setStockRows((prev) =>
      prev.map((row) => {
        if (!row.closingSuggested) return row
        const opening = Number(row.openingQty)
        const received = Number(row.receivedQty)
        return {
          ...row,
          closingQty: (opening + received).toString(),
        }
      })
    )
  }

  const parsedRows = stockRows.map(deriveStockRow)

  const stockSummary = parsedRows.reduce(
    (acc, row) => {
      if (row.opening !== row.closing || row.received !== 0) acc.edited += 1
      if (row.warning) acc.warnings += 1
      acc.totalRevenue += row.revenue
      return acc
    },
    { totalRevenue: 0, edited: 0, warnings: 0 }
  )

  const canEditStock =
    selectedShiftForStock &&
    (selectedShiftForStock.status === ShiftStatus.PLANNED ||
      selectedShiftForStock.status === ShiftStatus.OPEN)

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedShiftForStock) return
    if (parsedRows.some((row) => row.warning)) {
      setStockError(t("shifts.stock.negativeBlocked"))
      return
    }
    setStockSaving(true)
    setStockError(null)
    try {
      const body = parsedRows.map((row) => ({
        productId: row.productId,
        openingQty: row.opening,
        receivedQty: row.received,
        closingQty: row.closing,
      }))
      await api.upsertShiftStock(selectedShiftForStock.id, body)
      closeStock()
    } catch (e) {
      setStockError(
        e instanceof Error ? e.message : t("shifts.errors.saveStockFailed")
      )
      setStockSaving(false)
    }
  }

  const openPumpReadings = async (shift: ShiftResponse) => {
    setPumpDialogShift(shift)
    setPumpReadingsLoading(true)
    setPumpReadingsError(null)
    try {
      const canEdit =
        shift.status === ShiftStatus.PLANNED ||
        shift.status === ShiftStatus.OPEN
      const [pumps, readings, assignments, prefill] = await Promise.all([
        api.getPumps(),
        api.getShiftPumpReadings(shift.id),
        api.getShiftPumpAssignments(shift.id),
        canEdit
          ? api.getShiftPumpReadingPrefill(shift.id).catch(() => [])
          : Promise.resolve([]),
      ])
      const byPumpId = new Map(readings.map((r) => [r.pumpId, r]))
      const assignByPumpId = new Map(assignments.map((a) => [a.pumpId, a]))
      const prefillByPumpId = new Map(
        prefill.map((p) => [p.pumpId, p])
      )
      const rows: PumpReadingGridRow[] = pumps.map((pump) => {
        const r = byPumpId.get(pump.id)
        const a = assignByPumpId.get(pump.id)
        const workerName =
          r != null ? (r.workerName ?? null) : (a?.workerName ?? null)
        // Spec 6.2: opening index pre-filled from this pump's last closing.
        const prefillItem = prefillByPumpId.get(pump.id)
        const suggestedOpening = prefillItem?.lastClosingReading
        return {
          pumpId: pump.id,
          pumpName: pump.name,
          readingId: r?.id,
          workerName,
          openingReading:
            r?.openingReading != null
              ? String(r.openingReading)
              : suggestedOpening != null
                ? String(suggestedOpening)
                : "",
          closingReading:
            r?.closingReading != null ? String(r.closingReading) : "",
          recentAverageVolume: prefillItem?.recentAverageVolume ?? null,
          volumeCeiling: prefillItem?.volumeCeiling ?? null,
        }
      })
      setPumpReadingRows(rows)
    } catch (e) {
      setPumpReadingsError(
        e instanceof Error ? e.message : t("shifts.errors.errorLoad")
      )
    } finally {
      setPumpReadingsLoading(false)
    }
  }

  const closePumpReadings = () => {
    setPumpDialogShift(null)
    setPumpReadingsError(null)
    setPumpReadingRows([])
    setPumpOverrideRow(null)
    setPumpOverrideReason("")
  }

  const updatePumpReadingRow = (
    pumpId: number,
    field: "openingReading" | "closingReading",
    value: string
  ) => {
    setPumpReadingRows((prev) =>
      prev.map((row) =>
        row.pumpId === pumpId ? { ...row, [field]: value } : row
      )
    )
  }

  const canEditPumpReadings = Boolean(
    pumpDialogShift &&
      (pumpDialogShift.status === ShiftStatus.PLANNED ||
        pumpDialogShift.status === ShiftStatus.OPEN)
  )

  const savePumpReadingRow = async (
    row: PumpReadingGridRow,
    override?: { overrideCeiling: boolean; overrideReason: string }
  ) => {
    if (!pumpDialogShift) return
    const opening = Number(row.openingReading)
    const closing = Number(row.closingReading)
    if (row.readingId != null) {
      await api.updatePumpReading(row.readingId, {
        openingReading: opening,
        closingReading: closing,
        ...override,
      })
    } else {
      if (!row.workerName) return
      await api.createShiftPumpReading(pumpDialogShift.id, {
        pumpId: row.pumpId,
        openingReading: opening,
        closingReading: closing,
        ...override,
      })
    }
  }

  const handleSavePumpReadings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pumpDialogShift) return
    setPumpReadingsLoading(true)
    setPumpReadingsError(null)
    const rowsNeedingAssignment = pumpReadingRows.filter(
      (row) =>
        row.openingReading.trim() !== "" &&
        row.closingReading.trim() !== "" &&
        row.readingId == null &&
        !row.workerName
    )
    if (rowsNeedingAssignment.length > 0) {
      setPumpReadingsError(t("shifts.errors.pumpReadingsNeedAssignment"))
      setPumpReadingsLoading(false)
      return
    }
    for (const row of pumpReadingRows) {
      if (!row.openingReading.trim() || !row.closingReading.trim()) continue
      const opening = Number(row.openingReading)
      const closing = Number(row.closingReading)
      if (Number.isNaN(opening) || Number.isNaN(closing)) {
        setPumpReadingsError(
          t("shifts.errors.pumpReadingsInvalidNumber", {
            pump: row.pumpName,
          })
        )
        setPumpReadingsLoading(false)
        return
      }
      if (closing < opening) {
        setPumpReadingsError(
          t("shifts.errors.pumpReadingsClosingBeforeOpening", {
            pump: row.pumpName,
          })
        )
        setPumpReadingsLoading(false)
        return
      }
    }
    try {
      for (const row of pumpReadingRows) {
        if (!row.openingReading || !row.closingReading) continue
        const opening = Number(row.openingReading)
        const closing = Number(row.closingReading)
        if (Number.isNaN(opening) || Number.isNaN(closing)) continue
        await savePumpReadingRow(row)
      }
      setPumpReadingsLoading(false)
      closePumpReadings()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("shifts.errors.updateFailed")
      const rowAboveCeiling = pumpReadingRows.find((row) => {
        const opening = Number(row.openingReading)
        const closing = Number(row.closingReading)
        return (
          row.volumeCeiling != null &&
          !Number.isNaN(opening) &&
          !Number.isNaN(closing) &&
          closing - opening > row.volumeCeiling
        )
      })
      if (message.includes("exceeds") && rowAboveCeiling) {
        setPumpOverrideRow(rowAboveCeiling)
      }
      setPumpReadingsError(
        message
      )
      setPumpReadingsLoading(false)
    }
  }

  const handleForcePumpReading = async () => {
    if (!pumpOverrideRow || !pumpOverrideReason.trim()) return
    setPumpReadingsLoading(true)
    setPumpReadingsError(null)
    try {
      await savePumpReadingRow(pumpOverrideRow, {
        overrideCeiling: true,
        overrideReason: pumpOverrideReason.trim(),
      })
      setPumpOverrideRow(null)
      setPumpOverrideReason("")
      setPumpReadingsLoading(false)
      closePumpReadings()
    } catch (e) {
      setPumpReadingsError(
        e instanceof Error ? e.message : t("shifts.errors.updateFailed")
      )
      setPumpReadingsLoading(false)
    }
  }

  return (
    <PageLayout title={t("shifts.title")}>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 text-muted-foreground">
            <CalendarClock className="size-5 shrink-0 mt-0.5" aria-hidden />
            <p>{t("shifts.intro")}</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button onClick={handleQuickOpen} disabled={quickOpening}>
                {quickOpening ? t("auth.loading") : t("shifts.quickOpen")}
              </Button>
            )}
            <Button variant="outline" onClick={openCreate}>
              {t("shifts.addShift")}
            </Button>
          </div>
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {!loading && shifts.length > 0 && (
          <div className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="shift-filter-status">
                {t("shifts.filters.status")}
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="shift-filter-status" className="w-[220px]">
                  <SelectValue placeholder={t("shifts.filters.statusAll")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SHIFT_STATUS_FILTER_ALL}>
                    {t("shifts.filters.statusAll")}
                  </SelectItem>
                  {SHIFT_STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-filter-date">
                {t("shifts.filters.date")}
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <DatePicker
                  id="shift-filter-date"
                  value={dateFilter}
                  onChange={setDateFilter}
                  placeholder={t("shifts.filters.dateAll")}
                  className="w-[min(100%,240px)]"
                />
                {dateFilter ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDateFilter("")}
                  >
                    {t("shifts.filters.clearDate")}
                  </Button>
                ) : null}
              </div>
            </div>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="sm:mb-0.5"
                onClick={() => {
                  setStatusFilter(SHIFT_STATUS_FILTER_ALL)
                  setDateFilter("")
                }}
              >
                {t("shifts.filters.clearAll")}
              </Button>
            ) : null}
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground">{t("auth.loading")}</p>
        ) : shifts.length === 0 ? (
          <p className="text-muted-foreground">{t("shifts.noShifts")}</p>
        ) : filteredShifts.length === 0 ? (
          <p className="text-muted-foreground">
            {t("shifts.filters.noMatches")}
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>{t("shifts.table.date")}</TableHead>
                  <TableHead>{t("shifts.table.startTime")}</TableHead>
                  <TableHead>{t("shifts.table.endTime")}</TableHead>
                  <TableHead>{t("shifts.table.status")}</TableHead>
                  <TableHead className="w-[220px]">
                    {t("shifts.table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell>{shift.id}</TableCell>
                    <TableCell>{formatIsoDate(shift.date)}</TableCell>
                    <TableCell>{formatIsoTime(shift.startTime)}</TableCell>
                    <TableCell>{formatIsoTime(shift.endTime)}</TableCell>
                    <TableCell>
                      <span className={shiftStatusBadgeClassName(shift.status)}>
                        {statusLabel(shift.status)}
                      </span>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(shift)}
                      >
                        {t("shifts.edit")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void openTeam(shift)}
                      >
                        {t("shifts.team.button")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void openStock(shift)}
                      >
                        {t("shifts.stock.openButton")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void openPumpReadings(shift)}
                      >
                        {t("shifts.pumpReadings")}
                      </Button>
                      {isAdmin && shift.status === ShiftStatus.OPEN && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            navigate(`/shifts/${String(shift.id)}/close`)
                          }
                        >
                          {t("shifts.closeShift")}
                        </Button>
                      )}
                      {isAdmin &&
                        (shift.status === ShiftStatus.CLOSED ||
                          shift.status === ShiftStatus.RECONCILED) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              navigate(
                                `/reconciliation?shiftId=${String(shift.id)}`
                              )
                            }
                          >
                            {t("shifts.reconcile")}
                          </Button>
                        )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create shift dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("shifts.createShift")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="create-date">{t("shifts.form.date")}</Label>
              <DatePicker
                id="create-date"
                value={createDate}
                onChange={(nextDate) => {
                  setCreateDate(nextDate)
                  setCreateStartTime((prev) =>
                    withDatePreservingTime(prev, nextDate, { h: 8, m: 0 })
                  )
                  setCreateEndTime((prev) =>
                    withDatePreservingTime(prev, nextDate, { h: 17, m: 0 })
                  )
                }}
                placeholder={t("shifts.form.pickDate")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-startTime">
                {t("shifts.form.startTime")}
              </Label>
              <Input
                id="create-startTime"
                type="datetime-local"
                value={createStartTime}
                onChange={(e) => setCreateStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-endTime">{t("shifts.form.endTime")}</Label>
              <Input
                id="create-endTime"
                type="datetime-local"
                value={createEndTime}
                onChange={(e) => setCreateEndTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("shifts.form.shopAccountable")}</Label>
              <Select
                value={createShopAccountableWorkerId || "__none__"}
                onValueChange={(v) =>
                  setCreateShopAccountableWorkerId(v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("shifts.form.shopAccountablePlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    {t("shifts.form.shopAccountableNone")}
                  </SelectItem>
                  {allWorkers
                    .filter((w) => w.active)
                    .map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {w.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("shifts.form.shopAccountableHint")}
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                {t("shifts.cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("auth.loading") : t("shifts.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit shift dialog */}
      <Dialog open={!!editShift} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("shifts.editShift")}</DialogTitle>
          </DialogHeader>
          {editShift && (
            <form onSubmit={handleEdit} className="space-y-4">
              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-date">{t("shifts.form.date")}</Label>
                <DatePicker
                  id="edit-date"
                  value={editDate}
                  onChange={(nextDate) => {
                    setEditDate(nextDate)
                    setEditStartTime((prev) =>
                      withDatePreservingTime(prev, nextDate, { h: 8, m: 0 })
                    )
                    setEditEndTime((prev) =>
                      withDatePreservingTime(prev, nextDate, { h: 17, m: 0 })
                    )
                  }}
                  placeholder={t("shifts.form.pickDate")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-startTime">
                  {t("shifts.form.startTime")}
                </Label>
                <Input
                  id="edit-startTime"
                  type="datetime-local"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endTime">{t("shifts.form.endTime")}</Label>
                <Input
                  id="edit-endTime"
                  type="datetime-local"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">{t("shifts.form.notes")}</Label>
                <Input
                  id="edit-notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">{t("shifts.form.status")}</Label>
                <select
                  id="edit-status"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as ShiftStatus)}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("shifts.form.shopAccountable")}</Label>
                <Select
                  value={editShopAccountableWorkerId || "__none__"}
                  onValueChange={(v) =>
                    setEditShopAccountableWorkerId(v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("shifts.form.shopAccountablePlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      {t("shifts.form.shopAccountableNone")}
                    </SelectItem>
                    {allWorkers
                      .filter((w) => w.active)
                      .map((w) => (
                        <SelectItem key={w.id} value={String(w.id)}>
                          {w.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t("shifts.form.shopAccountableHint")}
                </p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeEdit}>
                  {t("shifts.cancel")}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? t("auth.loading") : t("shifts.save")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Team dialog: workers + pump assignments + accountable seller */}
      <Dialog open={teamOpen} onOpenChange={(open) => !open && closeTeam()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("shifts.team.title")}</DialogTitle>
          </DialogHeader>
          {teamShift && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {formatIsoDate(teamShift.date)} •{" "}
                {formatIsoTime(teamShift.startTime)} –{" "}
                {formatIsoTime(teamShift.endTime)} •{" "}
                {statusLabel(teamShift.status)}
              </p>
              {teamError && (
                <Alert variant="destructive">
                  <AlertDescription>{teamError}</AlertDescription>
                </Alert>
              )}
              {teamLoading ? (
                <p className="text-muted-foreground text-sm">
                  {t("auth.loading")}
                </p>
              ) : (
                <div className="space-y-5">
                  <section>
                    <h3 className="mb-2 text-sm font-semibold">
                      {t("shifts.team.workers")}
                    </h3>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead />
                            <TableHead>{t("workers.table.name")}</TableHead>
                            <TableHead>
                              {t("workers.table.designation")}
                            </TableHead>
                            <TableHead
                              title={t("shifts.workerPickerLoginRoleHint")}
                            >
                              {t("shifts.workerPickerLoginRole")}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allWorkers
                            .filter((w) => w.active)
                            .map((worker) => (
                              <TableRow key={worker.id}>
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    aria-label={t(
                                      "shifts.assignWorkerCheckbox",
                                      { name: worker.name }
                                    )}
                                    checked={teamWorkerIds.includes(worker.id)}
                                    onChange={() =>
                                      toggleTeamWorker(worker.id)
                                    }
                                    className="h-4 w-4 rounded border-input"
                                  />
                                </TableCell>
                                <TableCell>{worker.name}</TableCell>
                                <TableCell>
                                  {worker.designation ??
                                    t("workers.noDesignation")}
                                </TableCell>
                                <TableCell>
                                  {workerRoleLabel(worker.id) ??
                                    t("users.role.USER")}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </section>

                  <section>
                    <h3 className="mb-2 text-sm font-semibold">
                      {t("shifts.team.pumps")}
                    </h3>
                    {teamAssignments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {t("pumps.noPumps")}
                      </p>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("shifts.pump")}</TableHead>
                              <TableHead>{t("shifts.worker")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {teamAssignments.map((row) => (
                              <TableRow key={row.pumpId}>
                                <TableCell>{row.pumpName}</TableCell>
                                <TableCell>
                                  <select
                                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={row.workerId ?? ""}
                                    onChange={(e) =>
                                      setTeamPumpWorker(
                                        row.pumpId,
                                        e.target.value
                                          ? Number(e.target.value)
                                          : null
                                      )
                                    }
                                  >
                                    <option value="">
                                      {t("shifts.assignPumpsSelectWorker")}
                                    </option>
                                    {allWorkers
                                      .filter(
                                        (w) =>
                                          w.active &&
                                          isFuelSideWorker(w) &&
                                          !isShopSideWorker(w)
                                      )
                                      .map((worker) => (
                                        <option
                                          key={worker.id}
                                          value={worker.id}
                                        >
                                          {worker.name}
                                        </option>
                                      ))}
                                  </select>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-2 text-sm font-semibold">
                      {t("shifts.team.seller")}
                    </h3>
                    <select
                      className="h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={teamSellerId}
                      onChange={(e) => setTeamSellerId(e.target.value)}
                    >
                      <option value="">{t("shifts.team.noSeller")}</option>
                      {allWorkers
                        .filter((w) => w.active && isShopSideWorker(w))
                        .map((worker) => (
                          <option key={worker.id} value={worker.id}>
                            {worker.name}
                          </option>
                        ))}
                    </select>
                  </section>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeTeam}>
                  {t("shifts.cancel")}
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleTeamSave()}
                  disabled={teamSaving || teamLoading}
                >
                  {teamSaving ? t("auth.loading") : t("shifts.team.save")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Shift stock dialog */}
      <Dialog open={stockOpen} onOpenChange={(open) => !open && closeStock()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("shifts.stock.title")}</DialogTitle>
          </DialogHeader>
          {selectedShiftForStock && (
            <form onSubmit={handleSaveStock} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {formatIsoDate(selectedShiftForStock.date)} •{" "}
                {formatIsoTime(selectedShiftForStock.startTime)} –{" "}
                {formatIsoTime(selectedShiftForStock.endTime)} •{" "}
                {statusLabel(selectedShiftForStock.status)}
              </p>
              {stockError && (
                <Alert variant="destructive">
                  <AlertDescription>{stockError}</AlertDescription>
                </Alert>
              )}
              {stockLoading ? (
                <p className="text-muted-foreground text-sm">
                  {t("auth.loading")}
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1 text-sm">
                      <div>
                        {t("shifts.stock.expectedTotal")}:{" "}
                        {stockSummary.totalRevenue.toFixed(2)}
                      </div>
                      <div>
                        {t("shifts.stock.summary.editedCount")}:{" "}
                        {stockSummary.edited}
                      </div>
                      <div>
                        {t("shifts.stock.summary.warningCount")}:{" "}
                        {stockSummary.warnings}
                      </div>
                    </div>
                  </div>
                  <StockCountGrid
                    rows={parsedRows}
                    canEdit={Boolean(canEditStock)}
                    search={stockSearch}
                    onlyChanged={stockOnlyChanged}
                    onSearchChange={setStockSearch}
                    onOnlyChangedChange={setStockOnlyChanged}
                    onRowChange={updateStockRow}
                    onFillAll={fillAllStockSuggestions}
                  />
                </>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeStock}>
                  {t("shifts.close")}
                </Button>
                {canEditStock && !stockLoading && (
                  <Button type="submit" disabled={stockSaving}>
                    {stockSaving ? t("auth.loading") : t("shifts.save")}
                  </Button>
                )}
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Pump readings dialog */}
      <Dialog
        open={!!pumpDialogShift}
        onOpenChange={(open) => !open && closePumpReadings()}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("shifts.pumpReadings")}</DialogTitle>
          </DialogHeader>
          {pumpDialogShift && (
            <form onSubmit={handleSavePumpReadings} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {formatIsoDate(pumpDialogShift.date)} •{" "}
                {formatIsoTime(pumpDialogShift.startTime)} –{" "}
                {formatIsoTime(pumpDialogShift.endTime)} •{" "}
                {statusLabel(pumpDialogShift.status)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("shifts.pumpReadingsLinkedHint")}
              </p>
              {pumpReadingsError && (
                <Alert variant="destructive">
                  <AlertDescription>{pumpReadingsError}</AlertDescription>
                </Alert>
              )}
              {pumpReadingsLoading ? (
                <p className="text-muted-foreground text-sm">
                  {t("auth.loading")}
                </p>
              ) : (
                <PumpReadingsGrid
                  rows={pumpReadingRows}
                  canEdit={canEditPumpReadings}
                  onRowChange={updatePumpReadingRow}
                />
              )}
              {pumpOverrideRow && (
                <div className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-3">
                  <p className="text-sm font-medium text-amber-950">
                    {t("shifts.guards.forceTitle", {
                      pump: pumpOverrideRow.pumpName,
                    })}
                  </p>
                  <Input
                    value={pumpOverrideReason}
                    onChange={(e) => setPumpOverrideReason(e.target.value)}
                    placeholder={t("shifts.guards.overrideReason")}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!pumpOverrideReason.trim() || pumpReadingsLoading}
                    onClick={handleForcePumpReading}
                  >
                    {t("shifts.guards.forceSave")}
                  </Button>
                </div>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closePumpReadings}
                >
                  {t("shifts.close")}
                </Button>
                {canEditPumpReadings && (
                  <Button type="submit" disabled={pumpReadingsLoading}>
                    {pumpReadingsLoading ? t("auth.loading") : t("shifts.save")}
                  </Button>
                )}
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </PageLayout>
  )
}
