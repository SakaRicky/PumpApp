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
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/authContext"

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

export const ShiftsPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === "ADMIN"
  const [shifts, setShifts] = useState<ShiftWithWorkers[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

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

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [manageWorkersOpen, setManageWorkersOpen] = useState(false)
  const [workersLoading, setWorkersLoading] = useState(false)
  const [workersError, setWorkersError] = useState<string | null>(null)
  const [allWorkers, setAllWorkers] = useState<WorkerResponse[]>([])
  const [allUsers, setAllUsers] = useState<UserResponse[]>([])
  const [selectedShiftForWorkers, setSelectedShiftForWorkers] =
    useState<ShiftResponse | null>(null)
  const [assignedWorkerIds, setAssignedWorkerIds] = useState<number[]>([])

  const [stockOpen, setStockOpen] = useState(false)
  const [stockLoading, setStockLoading] = useState(false)
  const [stockError, setStockError] = useState<string | null>(null)
  const [stockSaving, setStockSaving] = useState(false)
  const [selectedShiftForStock, setSelectedShiftForStock] =
    useState<ShiftResponse | null>(null)

  type StockRow = {
    productId: number
    productName: string
    categoryName: string
    openingQty: string
    closingQty: string
    sellingPrice: number
  }
  const [stockRows, setStockRows] = useState<StockRow[]>([])
  const [stockSearch, setStockSearch] = useState("")
  const [stockOnlyChanged, setStockOnlyChanged] = useState(false)

  const [pumpDialogShift, setPumpDialogShift] = useState<ShiftResponse | null>(
    null
  )
  const [pumpReadingsLoading, setPumpReadingsLoading] = useState(false)
  const [pumpReadingsError, setPumpReadingsError] = useState<string | null>(
    null
  )
  type PumpReadingRow = {
    pumpId: number
    pumpName: string
    openingReading: string
    closingReading: string
  }
  const [pumpReadingRows, setPumpReadingRows] = useState<PumpReadingRow[]>([])

  const [pumpAssignmentsOpen, setPumpAssignmentsOpen] = useState(false)
  const [selectedShiftForPumpAssignments, setSelectedShiftForPumpAssignments] =
    useState<ShiftResponse | null>(null)
  type PumpAssignmentRow = {
    pumpId: number
    pumpName: string
    workerId: number | null
  }
  const [pumpAssignmentRows, setPumpAssignmentRows] = useState<
    PumpAssignmentRow[]
  >([])
  const [pumpAssignmentsError, setPumpAssignmentsError] = useState<
    string | null
  >(null)
  const [pumpAssignmentsLoading, setPumpAssignmentsLoading] = useState(false)

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

  const openCreate = () => {
    const today = new Date()
    const isoDate = today.toISOString().slice(0, 10)
    setCreateDate(isoDate)
    setCreateStartTime(`${isoDate}T08:00`)
    setCreateEndTime(`${isoDate}T17:00`)
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

  const openManageWorkers = async (shift: ShiftResponse) => {
    setSelectedShiftForWorkers(shift)
    setManageWorkersOpen(true)
    setWorkersLoading(true)
    setWorkersError(null)
    try {
      const [workersRes, usersRes, shiftWorkersRes] = await Promise.all([
        api.getWorkers(),
        api.getUsers(),
        api.getShiftWorkers(shift.id),
      ])
      setAllWorkers(workersRes)
      setAllUsers(usersRes)
      setAssignedWorkerIds(shiftWorkersRes.map((w) => w.id))
    } catch (e) {
      setWorkersError(
        e instanceof Error ? e.message : t("shifts.errors.loadWorkersFailed")
      )
    } finally {
      setWorkersLoading(false)
    }
  }

  const closeManageWorkers = () => {
    setManageWorkersOpen(false)
    setSelectedShiftForWorkers(null)
    setWorkersError(null)
    setAssignedWorkerIds([])
  }

  const isWorkerAssigned = (workerId: number): boolean =>
    assignedWorkerIds.includes(workerId)

  const workerRoleLabel = (workerId: number): string | null => {
    const user = allUsers.find((u) => u.workerId === workerId)
    if (!user) return null
    return t(`users.role.${user.role}`)
  }

  const toggleWorker = async (worker: WorkerResponse) => {
    if (!selectedShiftForWorkers) return
    const shiftId = selectedShiftForWorkers.id
    const currentlyAssigned = isWorkerAssigned(worker.id)
    try {
      if (currentlyAssigned) {
        await api.unassignShiftWorker(shiftId, worker.id)
        setAssignedWorkerIds((prev) => prev.filter((id) => id !== worker.id))
      } else {
        await api.assignShiftWorkers(shiftId, { workerId: worker.id })
        setAssignedWorkerIds((prev) => [...prev, worker.id])
      }
    } catch (e) {
      setWorkersError(
        e instanceof Error ? e.message : t("shifts.errors.updateWorkersFailed")
      )
    }
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
      const rows: StockRow[] = products
        .filter((p) => p.active)
        .map((p: ProductResponse) => {
          const s = stockByProduct.get(p.id)
          const opening =
            s?.openingQty != null
              ? Number(s.openingQty)
              : Number(p.currentStock)
          const closing =
            s?.closingQty != null
              ? Number(s.closingQty)
              : Number(p.currentStock)
          return {
            productId: p.id,
            productName: p.name,
            categoryName: p.category?.name ?? `#${p.categoryId.toString()}`,
            openingQty: opening.toString(),
            closingQty: closing.toString(),
            sellingPrice: Number(p.sellingPrice),
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
    field: "openingQty" | "closingQty",
    value: string
  ) => {
    setStockRows((prev) =>
      prev.map((row) =>
        row.productId === productId ? { ...row, [field]: value } : row
      )
    )
  }

  const parsedRows = stockRows.map((row) => {
    const opening = Number(row.openingQty)
    const closing = Number(row.closingQty)
    const sold = opening - closing
    const revenue = sold * row.sellingPrice
    const warning = closing > opening || sold < 0
    return { ...row, opening, closing, sold, revenue, warning }
  })

  const filteredRows = parsedRows.filter((row) => {
    if (
      stockSearch &&
      !row.productName.toLowerCase().includes(stockSearch.toLowerCase())
    ) {
      return false
    }
    if (stockOnlyChanged && row.opening === row.closing) {
      return false
    }
    return true
  })

  const stockSummary = parsedRows.reduce(
    (acc, row) => {
      if (row.opening !== row.closing) acc.edited += 1
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
    setStockSaving(true)
    setStockError(null)
    try {
      const body = parsedRows.map((row) => ({
        productId: row.productId,
        openingQty: row.opening,
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
      const [pumps, readings] = await Promise.all([
        api.getPumps(),
        api.getShiftPumpReadings(shift.id),
      ])
      const byPumpId = new Map(readings.map((r) => [r.pumpId, r]))
      const rows: PumpReadingRow[] = pumps.map((pump) => {
        const r = byPumpId.get(pump.id)
        return {
          pumpId: pump.id,
          pumpName: pump.name,
          openingReading:
            r?.openingReading != null ? String(r.openingReading) : "",
          closingReading:
            r?.closingReading != null ? String(r.closingReading) : "",
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

  const canEditPumpReadings =
    pumpDialogShift &&
    (pumpDialogShift.status === ShiftStatus.PLANNED ||
      pumpDialogShift.status === ShiftStatus.OPEN)

  const handleSavePumpReadings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pumpDialogShift) return
    setPumpReadingsLoading(true)
    setPumpReadingsError(null)
    try {
      for (const row of pumpReadingRows) {
        if (!row.openingReading || !row.closingReading) continue
        const opening = Number(row.openingReading)
        const closing = Number(row.closingReading)
        if (Number.isNaN(opening) || Number.isNaN(closing)) continue
        await api.createShiftPumpReading(pumpDialogShift.id, {
          pumpId: row.pumpId,
          openingReading: opening,
          closingReading: closing,
        })
      }
      closePumpReadings()
    } catch (e) {
      setPumpReadingsError(
        e instanceof Error ? e.message : t("shifts.errors.updateFailed")
      )
      setPumpReadingsLoading(false)
    }
  }

  const openPumpAssignments = async (shift: ShiftResponse) => {
    setSelectedShiftForPumpAssignments(shift)
    setPumpAssignmentsOpen(true)
    setPumpAssignmentsLoading(true)
    setPumpAssignmentsError(null)
    try {
      const assignments = await api.getShiftPumpAssignments(shift.id)
      const rows: PumpAssignmentRow[] = assignments.map((a) => ({
        pumpId: a.pumpId,
        pumpName: a.pumpName,
        workerId: a.workerId,
      }))
      setPumpAssignmentRows(rows)
    } catch (e) {
      setPumpAssignmentsError(
        e instanceof Error ? e.message : t("shifts.errors.loadWorkersFailed")
      )
    } finally {
      setPumpAssignmentsLoading(false)
    }
  }

  const closePumpAssignments = () => {
    setPumpAssignmentsOpen(false)
    setSelectedShiftForPumpAssignments(null)
    setPumpAssignmentsError(null)
    setPumpAssignmentRows([])
  }

  const handleAssignPumpWorker = async (
    pumpId: number,
    workerId: number | null
  ) => {
    if (!selectedShiftForPumpAssignments || workerId == null) return
    try {
      await api.assignShiftPump(selectedShiftForPumpAssignments.id, {
        pumpId,
        workerId,
      })
      setPumpAssignmentRows((prev) =>
        prev.map((row) => (row.pumpId === pumpId ? { ...row, workerId } : row))
      )
    } catch (e) {
      setPumpAssignmentsError(
        e instanceof Error ? e.message : t("shifts.errors.updateWorkersFailed")
      )
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
          <Button onClick={openCreate}>{t("shifts.addShift")}</Button>
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <p className="text-muted-foreground">{t("auth.loading")}</p>
        ) : shifts.length === 0 ? (
          <p className="text-muted-foreground">{t("shifts.noShifts")}</p>
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
                {shifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell>{shift.id}</TableCell>
                    <TableCell>{formatIsoDate(shift.date)}</TableCell>
                    <TableCell>{formatIsoTime(shift.startTime)}</TableCell>
                    <TableCell>{formatIsoTime(shift.endTime)}</TableCell>
                    <TableCell>{statusLabel(shift.status)}</TableCell>
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
                        onClick={() => void openManageWorkers(shift)}
                      >
                        {t("shifts.manageWorkers")}
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void openPumpAssignments(shift)}
                      >
                        {t("shifts.assignPumps")}
                      </Button>
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
                onChange={setCreateDate}
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
                  onChange={setEditDate}
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

      {/* Manage workers dialog */}
      <Dialog
        open={manageWorkersOpen}
        onOpenChange={(open) => !open && closeManageWorkers()}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("shifts.manageWorkersTitle")}</DialogTitle>
          </DialogHeader>
          {selectedShiftForWorkers && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("shifts.manageWorkersForShift", {
                  id: selectedShiftForWorkers.id,
                  date: formatIsoDate(selectedShiftForWorkers.date),
                })}
              </p>
              {workersError && (
                <Alert variant="destructive">
                  <AlertDescription>{workersError}</AlertDescription>
                </Alert>
              )}
              {workersLoading ? (
                <p className="text-muted-foreground text-sm">
                  {t("auth.loading")}
                </p>
              ) : allWorkers.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t("workers.noWorkers")}
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead />
                        <TableHead>{t("workers.table.name")}</TableHead>
                        <TableHead>{t("workers.table.designation")}</TableHead>
                        <TableHead>{t("users.table.role")}</TableHead>
                        <TableHead>{t("workers.table.active")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allWorkers.map((worker) => (
                        <TableRow key={worker.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              aria-label={t("shifts.assignWorkerCheckbox", {
                                name: worker.name,
                              })}
                              checked={isWorkerAssigned(worker.id)}
                              onChange={() => void toggleWorker(worker)}
                              className="h-4 w-4 rounded border-input"
                            />
                          </TableCell>
                          <TableCell>{worker.name}</TableCell>
                          <TableCell>
                            {worker.designation ?? t("workers.noDesignation")}
                          </TableCell>
                          <TableCell>
                            {workerRoleLabel(worker.id) ?? t("users.role.USER")}
                          </TableCell>
                          <TableCell>
                            {worker.active
                              ? t("workers.activeYes")
                              : t("workers.activeNo")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeManageWorkers}
                >
                  {t("shifts.close")}
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
                        {t("shifts.stock.summary.totalRevenue")}:{" "}
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
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        className="w-full sm:w-60"
                        placeholder={t("shifts.stock.filters.search")}
                        value={stockSearch}
                        onChange={(e) => setStockSearch(e.target.value)}
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-input"
                          checked={stockOnlyChanged}
                          onChange={(e) =>
                            setStockOnlyChanged(e.target.checked)
                          }
                        />
                        {t("shifts.stock.filters.onlyChanged")}
                      </label>
                    </div>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            {t("shifts.stock.table.product")}
                          </TableHead>
                          <TableHead>
                            {t("shifts.stock.table.category")}
                          </TableHead>
                          <TableHead className="w-[90px]">
                            {t("shifts.stock.table.opening")}
                          </TableHead>
                          <TableHead className="w-[90px]">
                            {t("shifts.stock.table.closing")}
                          </TableHead>
                          <TableHead className="w-[90px]">
                            {t("shifts.stock.table.sold")}
                          </TableHead>
                          <TableHead className="w-[110px]">
                            {t("shifts.stock.table.revenue")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRows.map((row) => (
                          <TableRow
                            key={row.productId}
                            className={row.warning ? "bg-amber-50" : undefined}
                          >
                            <TableCell>{row.productName}</TableCell>
                            <TableCell>{row.categoryName}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.001"
                                min="0"
                                value={row.openingQty}
                                disabled={!canEditStock}
                                onChange={(e) =>
                                  updateStockRow(
                                    row.productId,
                                    "openingQty",
                                    e.target.value
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.001"
                                min="0"
                                value={row.closingQty}
                                disabled={!canEditStock}
                                onChange={(e) =>
                                  updateStockRow(
                                    row.productId,
                                    "closingQty",
                                    e.target.value
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>{row.sold.toFixed(3)}</TableCell>
                            <TableCell>{row.revenue.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
        <DialogContent className="max-w-2xl">
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
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pump</TableHead>
                        <TableHead>Opening reading</TableHead>
                        <TableHead>Closing reading</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pumpReadingRows.map((row) => (
                        <TableRow key={row.pumpId}>
                          <TableCell>{row.pumpName}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.001"
                              value={row.openingReading}
                              disabled={!canEditPumpReadings}
                              onChange={(e) =>
                                updatePumpReadingRow(
                                  row.pumpId,
                                  "openingReading",
                                  e.target.value
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.001"
                              value={row.closingReading}
                              disabled={!canEditPumpReadings}
                              onChange={(e) =>
                                updatePumpReadingRow(
                                  row.pumpId,
                                  "closingReading",
                                  e.target.value
                                )
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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

      {/* Pump assignments dialog */}
      <Dialog
        open={pumpAssignmentsOpen}
        onOpenChange={(open) => !open && closePumpAssignments()}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("shifts.assignPumps")}</DialogTitle>
          </DialogHeader>
          {selectedShiftForPumpAssignments && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {formatIsoDate(selectedShiftForPumpAssignments.date)} •{" "}
                {formatIsoTime(selectedShiftForPumpAssignments.startTime)} –{" "}
                {formatIsoTime(selectedShiftForPumpAssignments.endTime)} •{" "}
                {statusLabel(selectedShiftForPumpAssignments.status)}
              </p>
              {pumpAssignmentsError && (
                <Alert variant="destructive">
                  <AlertDescription>{pumpAssignmentsError}</AlertDescription>
                </Alert>
              )}
              {pumpAssignmentsLoading ? (
                <p className="text-muted-foreground text-sm">
                  {t("auth.loading")}
                </p>
              ) : pumpAssignmentRows.length === 0 ? (
                <p className="text-muted-foreground text-sm">
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
                      {pumpAssignmentRows.map((row) => (
                        <TableRow key={row.pumpId}>
                          <TableCell>{row.pumpName}</TableCell>
                          <TableCell>
                            <select
                              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              value={row.workerId ?? ""}
                              onChange={(e) =>
                                handleAssignPumpWorker(
                                  row.pumpId,
                                  e.target.value ? Number(e.target.value) : null
                                )
                              }
                            >
                              <option value="">
                                {t("shifts.assignPumpsSelectWorker")}
                              </option>
                              {allWorkers
                                .filter((w) => assignedWorkerIds.includes(w.id))
                                .map((worker) => (
                                  <option key={worker.id} value={worker.id}>
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
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closePumpAssignments}
                >
                  {t("shifts.close")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
