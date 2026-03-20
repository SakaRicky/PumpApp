import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  ShopSalesSource,
  ShiftStatus,
  type ReconciliationGetResponse,
  type ReconciliationSummaryResponse,
  type ReconciliationSummaryWriteCreateBody,
  type ReconciliationSummaryWriteUpdateBody,
  type ShiftResponse,
  type WorkerResponse,
  type CashHandInResponse,
} from "@pumpapp/shared"
import { PageLayout } from "@/components/layout/PageLayout"
import { Scale } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/contexts/authContext"
import { api } from "@/lib/api"

const formatIsoDate = (iso: string): string =>
  new Date(iso).toLocaleDateString()
const formatIsoTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })

const money = (n: number): string => n.toFixed(2)

export const ReconciliationPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const isAdmin = user?.role === "ADMIN"

  const [shifts, setShifts] = useState<ShiftResponse[]>([])
  const [workers, setWorkers] = useState<WorkerResponse[]>([])
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null)
  const [reco, setReco] = useState<ReconciliationGetResponse | null>(null)
  const [handIns, setHandIns] = useState<CashHandInResponse[]>([])

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [shopSource, setShopSource] = useState<ShopSalesSource>(
    ShopSalesSource.SHIFT_SUMMARY_ENTRY
  )
  const [manualShopTotal, setManualShopTotal] = useState("")
  const [manualShopReason, setManualShopReason] = useState("")
  const [useFuelOverride, setUseFuelOverride] = useState(false)
  const [fuelOverrideAmount, setFuelOverrideAmount] = useState("")
  const [fuelOverrideReason, setFuelOverrideReason] = useState("")
  const [useCashOverride, setUseCashOverride] = useState(false)
  const [cashOverrideAmount, setCashOverrideAmount] = useState("")
  const [cashOverrideReason, setCashOverrideReason] = useState("")
  const [notes, setNotes] = useState("")

  const [chiWorkerId, setChiWorkerId] = useState("")
  const [chiAmount, setChiAmount] = useState("")
  const [chiSubmitting, setChiSubmitting] = useState(false)
  const [chiError, setChiError] = useState<string | null>(null)

  const eligibleShifts = useMemo(
    () =>
      shifts.filter(
        (s) =>
          s.status === ShiftStatus.CLOSED || s.status === ShiftStatus.RECONCILED
      ),
    [shifts]
  )

  const applySummaryToForm = useCallback(
    (summary: ReconciliationSummaryResponse | null) => {
      if (!summary) {
        setShopSource(ShopSalesSource.SHIFT_SUMMARY_ENTRY)
        setManualShopTotal("")
        setManualShopReason("")
        setUseFuelOverride(false)
        setFuelOverrideAmount("")
        setFuelOverrideReason("")
        setUseCashOverride(false)
        setCashOverrideAmount("")
        setCashOverrideReason("")
        setNotes("")
        return
      }

      setShopSource(
        summary.shopSalesSource === ShopSalesSource.MANUAL
          ? ShopSalesSource.MANUAL
          : ShopSalesSource.SHIFT_SUMMARY_ENTRY
      )
      if (summary.manualShopSalesTotal != null) {
        setManualShopTotal(String(summary.manualShopSalesTotal))
      } else {
        setManualShopTotal("")
      }
      setManualShopReason(summary.manualShopSalesReason ?? "")
      const fuelOv = Boolean(summary.fuelSalesOverrideReason)
      setUseFuelOverride(fuelOv)
      setFuelOverrideAmount(fuelOv ? String(summary.fuelSalesTotal) : "")
      setFuelOverrideReason(summary.fuelSalesOverrideReason ?? "")
      const cashOv = Boolean(summary.cashHandedTotalOverrideReason)
      setUseCashOverride(cashOv)
      setCashOverrideAmount(cashOv ? String(summary.cashHandedTotal) : "")
      setCashOverrideReason(summary.cashHandedTotalOverrideReason ?? "")
      setNotes(summary.notes ?? "")
    },
    []
  )

  const loadShiftData = useCallback(
    async (shiftId: number) => {
      setLoadError(null)
      setLoading(true)
      try {
        const [r, h] = await Promise.all([
          api.getShiftReconciliation(shiftId),
          api.getShiftCashHandIns(shiftId),
        ])
        setReco(r)
        setHandIns(h)
        applySummaryToForm(r.summary)
      } catch (e) {
        setReco(null)
        setHandIns([])
        setLoadError(e instanceof Error ? e.message : "Load failed")
      } finally {
        setLoading(false)
      }
    },
    [applySummaryToForm]
  )

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false)
      return
    }
    const run = async () => {
      try {
        const [shiftList, workerList] = await Promise.all([
          api.getShifts(),
          api.getWorkers(),
        ])
        setShifts(shiftList)
        setWorkers(workerList.filter((w) => w.active))

        const q = searchParams.get("shiftId")
        const fromUrl = q ? Number.parseInt(q, 10) : NaN
        const initial = Number.isFinite(fromUrl) && fromUrl > 0 ? fromUrl : null
        if (initial) {
          setSelectedShiftId(initial)
          await loadShiftData(initial)
        } else {
          setLoading(false)
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Load failed")
        setLoading(false)
      }
    }
    void run()
    // Initial load only; shift changes use onShiftChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- searchParams read once on mount
  }, [isAdmin])

  const onShiftChange = async (value: string) => {
    const id = Number.parseInt(value, 10)
    if (Number.isNaN(id)) return
    setSelectedShiftId(id)
    setSearchParams({ shiftId: String(id) })
    await loadShiftData(id)
  }

  const previewDiscrepancy = useMemo(() => {
    if (!reco) return null
    const shop =
      shopSource === ShopSalesSource.MANUAL
        ? Number.parseFloat(manualShopTotal) || 0
        : reco.computedShopSalesTotal
    let fuel = reco.computedFuelSalesTotal
    if (useFuelOverride) {
      fuel = Number.parseFloat(fuelOverrideAmount) || 0
    }
    if (fuel === null && !useFuelOverride) return null
    const f = fuel ?? 0
    const cash = useCashOverride
      ? Number.parseFloat(cashOverrideAmount) || 0
      : reco.sumCashHandIns
    return Math.round((shop + f - cash) * 100) / 100
  }, [
    reco,
    shopSource,
    manualShopTotal,
    useFuelOverride,
    fuelOverrideAmount,
    useCashOverride,
    cashOverrideAmount,
  ])

  const handleSaveReconciliation = async () => {
    if (!selectedShiftId || !isAdmin) return
    setSaveError(null)

    const src =
      shopSource === ShopSalesSource.MANUAL
        ? ShopSalesSource.MANUAL
        : ShopSalesSource.SHIFT_SUMMARY_ENTRY

    if (src === ShopSalesSource.MANUAL) {
      const mt = Number.parseFloat(manualShopTotal)
      if (!Number.isFinite(mt) || mt < 0) {
        setSaveError(t("reconciliation.errors.manualShopInvalid"))
        return
      }
      if (manualShopReason.trim() === "") {
        setSaveError(t("reconciliation.errors.manualReasonRequired"))
        return
      }
    }

    if (useFuelOverride) {
      const f = Number.parseFloat(fuelOverrideAmount)
      if (!Number.isFinite(f)) {
        setSaveError(t("reconciliation.errors.fuelOverrideInvalid"))
        return
      }
      if (fuelOverrideReason.trim() === "") {
        setSaveError(t("reconciliation.errors.overrideReasonRequired"))
        return
      }
    }

    if (useCashOverride) {
      const c = Number.parseFloat(cashOverrideAmount)
      if (!Number.isFinite(c)) {
        setSaveError(t("reconciliation.errors.cashOverrideInvalid"))
        return
      }
      if (cashOverrideReason.trim() === "") {
        setSaveError(t("reconciliation.errors.overrideReasonRequired"))
        return
      }
    }

    setSaving(true)
    try {
      const notesVal = notes.trim() === "" ? null : notes.trim()

      let summary: ReconciliationSummaryResponse
      if (reco?.summary) {
        const patch: ReconciliationSummaryWriteUpdateBody = {
          shopSalesSource: src,
          notes: notesVal,
        }
        if (src === ShopSalesSource.MANUAL) {
          patch.manualShopSalesTotal = Number.parseFloat(manualShopTotal)
          patch.manualShopSalesReason = manualShopReason.trim()
        }
        if (useFuelOverride) {
          patch.fuelSalesTotal = Number.parseFloat(fuelOverrideAmount)
          patch.fuelSalesOverrideReason = fuelOverrideReason.trim()
        }
        if (useCashOverride) {
          patch.cashHandedTotal = Number.parseFloat(cashOverrideAmount)
          patch.cashHandedTotalOverrideReason = cashOverrideReason.trim()
        }
        summary = await api.updateShiftReconciliation(selectedShiftId, patch)
      } else {
        const post: ReconciliationSummaryWriteCreateBody = {
          shopSalesSource: src,
          notes: notesVal,
        }
        if (src === ShopSalesSource.MANUAL) {
          post.manualShopSalesTotal = Number.parseFloat(manualShopTotal)
          post.manualShopSalesReason = manualShopReason.trim()
        }
        if (useFuelOverride) {
          post.fuelSalesTotal = Number.parseFloat(fuelOverrideAmount)
          post.fuelSalesOverrideReason = fuelOverrideReason.trim()
        }
        if (useCashOverride) {
          post.cashHandedTotal = Number.parseFloat(cashOverrideAmount)
          post.cashHandedTotalOverrideReason = cashOverrideReason.trim()
        }
        summary = await api.createShiftReconciliation(selectedShiftId, post)
      }

      await loadShiftData(selectedShiftId)
      const shiftList = await api.getShifts()
      setShifts(shiftList)

      applySummaryToForm(summary)
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : t("reconciliation.errors.saveFailed")
      )
    } finally {
      setSaving(false)
    }
  }

  const handleAddHandIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedShiftId || !isAdmin) return
    const workerId = Number.parseInt(chiWorkerId, 10)
    const amount = Number.parseFloat(chiAmount)
    if (!Number.isFinite(workerId) || workerId < 1) {
      setChiError(t("reconciliation.errors.workerRequired"))
      return
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setChiError(t("reconciliation.errors.amountInvalid"))
      return
    }
    setChiError(null)
    setChiSubmitting(true)
    try {
      await api.createShiftCashHandIn(selectedShiftId, { workerId, amount })
      setChiWorkerId("")
      setChiAmount("")
      await loadShiftData(selectedShiftId)
    } catch (err) {
      setChiError(
        err instanceof Error
          ? err.message
          : t("reconciliation.errors.handInFailed")
      )
    } finally {
      setChiSubmitting(false)
    }
  }

  const discrepancyLabel =
    previewDiscrepancy == null
      ? null
      : previewDiscrepancy > 0
        ? t("reconciliation.short")
        : previewDiscrepancy < 0
          ? t("reconciliation.over")
          : t("reconciliation.balanced")

  if (!isAdmin) {
    return (
      <PageLayout title={t("reconciliation.title")}>
        <Alert>
          <AlertDescription>{t("reconciliation.adminOnly")}</AlertDescription>
        </Alert>
      </PageLayout>
    )
  }

  return (
    <PageLayout title={t("reconciliation.title")}>
      <div className="space-y-6">
        <div className="flex items-start gap-3 text-muted-foreground">
          <Scale className="size-5 shrink-0 mt-0.5" aria-hidden />
          <p>{t("reconciliation.intro")}</p>
        </div>

        <div className="space-y-2 max-w-md">
          <Label htmlFor="reco-shift">{t("reconciliation.selectShift")}</Label>
          <Select
            value={selectedShiftId ? String(selectedShiftId) : ""}
            onValueChange={(v) => void onShiftChange(v)}
          >
            <SelectTrigger id="reco-shift">
              <SelectValue placeholder={t("reconciliation.shiftPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {eligibleShifts.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  #{s.id} · {formatIsoDate(s.date)} {formatIsoTime(s.startTime)}{" "}
                  ({s.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {selectedShiftId && loading && (
          <p className="text-muted-foreground">{t("auth.loading")}</p>
        )}

        {selectedShiftId && !loading && reco && (
          <>
            <section className="space-y-4 rounded-md border p-4">
              <h2 className="text-lg font-semibold">
                {t("reconciliation.hints.title")}
              </h2>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>
                  {t("reconciliation.hints.shopFromStock")}:{" "}
                  <span className="font-medium text-foreground">
                    {money(reco.computedShopSalesTotal)}
                  </span>
                </li>
                <li>
                  {t("reconciliation.hints.fuelComputed")}:{" "}
                  <span className="font-medium text-foreground">
                    {reco.computedFuelSalesTotal != null
                      ? money(reco.computedFuelSalesTotal)
                      : "—"}
                  </span>
                  {reco.fuelComputationError && (
                    <span className="text-destructive ml-2">
                      ({reco.fuelComputationError})
                    </span>
                  )}
                </li>
                <li>
                  {t("reconciliation.hints.sumCashHandIns")}:{" "}
                  <span className="font-medium text-foreground">
                    {money(reco.sumCashHandIns)}
                  </span>
                </li>
              </ul>
            </section>

            <section className="space-y-4 rounded-md border p-4">
              <h2 className="text-lg font-semibold">
                {t("reconciliation.handIns.title")}
              </h2>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t("reconciliation.handIns.worker")}
                      </TableHead>
                      <TableHead>
                        {t("reconciliation.handIns.amount")}
                      </TableHead>
                      <TableHead>
                        {t("reconciliation.handIns.recordedAt")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {handIns.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-muted-foreground"
                        >
                          {t("reconciliation.handIns.empty")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      handIns.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            {workers.find((w) => w.id === row.workerId)?.name ??
                              `#${row.workerId}`}
                          </TableCell>
                          <TableCell>{money(row.amount)}</TableCell>
                          <TableCell>
                            {new Date(row.recordedAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <form
                onSubmit={(e) => void handleAddHandIn(e)}
                className="flex flex-wrap gap-3 items-end"
              >
                {chiError && (
                  <p className="text-sm text-destructive w-full">{chiError}</p>
                )}
                <div className="space-y-1">
                  <Label>{t("reconciliation.handIns.worker")}</Label>
                  <Select value={chiWorkerId} onValueChange={setChiWorkerId}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {workers.map((w) => (
                        <SelectItem key={w.id} value={String(w.id)}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="chi-amount">
                    {t("reconciliation.handIns.amount")}
                  </Label>
                  <Input
                    id="chi-amount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={chiAmount}
                    onChange={(e) => setChiAmount(e.target.value)}
                    className="w-32"
                  />
                </div>
                <Button type="submit" disabled={chiSubmitting}>
                  {t("reconciliation.handIns.add")}
                </Button>
              </form>
            </section>

            <section className="space-y-4 rounded-md border p-4">
              <h2 className="text-lg font-semibold">
                {t("reconciliation.form.title")}
              </h2>

              {saveError && (
                <Alert variant="destructive">
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              )}

              {reco.summary && (
                <p className="text-sm text-muted-foreground">
                  {t("reconciliation.form.existingSummary")}
                </p>
              )}

              <div className="space-y-2 max-w-md">
                <Label>{t("reconciliation.form.shopSource")}</Label>
                <Select
                  value={shopSource}
                  onValueChange={(v) => setShopSource(v as ShopSalesSource)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ShopSalesSource.SHIFT_SUMMARY_ENTRY}>
                      {t("reconciliation.form.sourceStock")}
                    </SelectItem>
                    <SelectItem value={ShopSalesSource.MANUAL}>
                      {t("reconciliation.form.sourceManual")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {shopSource === ShopSalesSource.MANUAL && (
                <div className="grid gap-3 max-w-md">
                  <div className="space-y-1">
                    <Label htmlFor="manual-total">
                      {t("reconciliation.form.manualTotal")}
                    </Label>
                    <Input
                      id="manual-total"
                      type="number"
                      min={0}
                      step="0.01"
                      value={manualShopTotal}
                      onChange={(e) => setManualShopTotal(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="manual-reason">
                      {t("reconciliation.form.manualReason")}
                    </Label>
                    <Input
                      id="manual-reason"
                      value={manualShopReason}
                      onChange={(e) => setManualShopReason(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useFuelOverride}
                    onChange={(e) => setUseFuelOverride(e.target.checked)}
                  />
                  {t("reconciliation.form.overrideFuel")}
                </label>
                {useFuelOverride && (
                  <div className="grid gap-2 max-w-md pl-6">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={t("reconciliation.form.amount")}
                      value={fuelOverrideAmount}
                      onChange={(e) => setFuelOverrideAmount(e.target.value)}
                    />
                    <Input
                      placeholder={t("reconciliation.form.reason")}
                      value={fuelOverrideReason}
                      onChange={(e) => setFuelOverrideReason(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useCashOverride}
                    onChange={(e) => setUseCashOverride(e.target.checked)}
                  />
                  {t("reconciliation.form.overrideCash")}
                </label>
                {useCashOverride && (
                  <div className="grid gap-2 max-w-md pl-6">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={t("reconciliation.form.amount")}
                      value={cashOverrideAmount}
                      onChange={(e) => setCashOverrideAmount(e.target.value)}
                    />
                    <Input
                      placeholder={t("reconciliation.form.reason")}
                      value={cashOverrideReason}
                      onChange={(e) => setCashOverrideReason(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1 max-w-md">
                <Label htmlFor="reco-notes">
                  {t("reconciliation.form.notes")}
                </Label>
                <Input
                  id="reco-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {previewDiscrepancy != null && (
                <div
                  className={
                    previewDiscrepancy > 0
                      ? "text-amber-600 dark:text-amber-500 font-medium"
                      : previewDiscrepancy < 0
                        ? "text-blue-600 dark:text-blue-400 font-medium"
                        : "text-muted-foreground font-medium"
                  }
                >
                  {t("reconciliation.previewDiscrepancy")}:{" "}
                  {money(previewDiscrepancy)} ({discrepancyLabel})
                </div>
              )}

              <Button
                type="button"
                onClick={() => void handleSaveReconciliation()}
                disabled={saving}
              >
                {reco.summary
                  ? t("reconciliation.form.saveUpdate")
                  : t("reconciliation.form.saveCreate")}
              </Button>
            </section>
          </>
        )}
      </div>
    </PageLayout>
  )
}
