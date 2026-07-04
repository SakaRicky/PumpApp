import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import type {
  ProductResponse,
  ShiftClosePreviewResponse,
  ShiftResponse,
  TankResponse,
} from "@pumpapp/shared"
import { ShiftStatus } from "@pumpapp/shared"
import { PageLayout } from "@/components/layout/PageLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Stepper } from "@/components/ui/stepper"
import {
  StockCountGrid,
} from "@/components/shift/StockCountGrid"
import { PumpReadingsGrid } from "@/components/shift/PumpReadingsGrid"
import { deriveStockRow, type StockCountRow } from "@/components/shift/stockCount"
import type { PumpReadingGridRow } from "@/components/shift/pumpReadings"
import { api } from "@/lib/api"

const formatNumber = (n: number): string =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)

export const ShiftClosePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const params = useParams()
  const shiftId = Number.parseInt(params.id ?? "", 10)

  const [step, setStep] = useState(0)
  const [shift, setShift] = useState<ShiftResponse | null>(null)
  const [preview, setPreview] = useState<ShiftClosePreviewResponse | null>(null)
  const [pumpRows, setPumpRows] = useState<PumpReadingGridRow[]>([])
  const [stockRows, setStockRows] = useState<StockCountRow[]>([])
  const [tankRows, setTankRows] = useState<
    Array<{ tank: TankResponse; quantity: string }>
  >([])
  const [stockSearch, setStockSearch] = useState("")
  const [stockOnlyChanged, setStockOnlyChanged] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsedStockRows = useMemo(
    () => stockRows.map(deriveStockRow),
    [stockRows]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [
        shiftRes,
        previewRes,
        pumps,
        readings,
        assignments,
        prefill,
        products,
        stock,
        tanks,
      ] =
        await Promise.all([
          api.getShift(shiftId),
          api.getShiftClosePreview(shiftId),
          api.getPumps(),
          api.getShiftPumpReadings(shiftId),
          api.getShiftPumpAssignments(shiftId),
          api.getShiftPumpReadingPrefill(shiftId).catch(() => []),
          api.getProducts(),
          api.getShiftStock(shiftId),
          api.getTanks(),
        ])
      setShift(shiftRes)
      setPreview(previewRes)

      const byPumpId = new Map(readings.map((r) => [r.pumpId, r]))
      const assignByPumpId = new Map(assignments.map((a) => [a.pumpId, a]))
      const prefillByPumpId = new Map(prefill.map((p) => [p.pumpId, p]))
      setPumpRows(
        pumps.map((pump) => {
          const reading = byPumpId.get(pump.id)
          const assignment = assignByPumpId.get(pump.id)
          const prefillItem = prefillByPumpId.get(pump.id)
          return {
            pumpId: pump.id,
            pumpName: pump.name,
            readingId: reading?.id,
            workerName: reading?.workerName ?? assignment?.workerName ?? null,
            openingReading:
              reading?.openingReading != null
                ? String(reading.openingReading)
                : prefillItem?.lastClosingReading != null
                  ? String(prefillItem.lastClosingReading)
                  : "",
            closingReading:
              reading?.closingReading != null
                ? String(reading.closingReading)
                : "",
            recentAverageVolume: prefillItem?.recentAverageVolume ?? null,
            volumeCeiling: prefillItem?.volumeCeiling ?? null,
          }
        })
      )

      const stockByProduct = new Map(stock.map((s) => [s.productId, s]))
      setStockRows(
        products
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
              openingQty: String(opening),
              receivedQty: String(received),
              closingQty: String(closing),
              sellingPrice: Number(p.sellingPrice),
              closingSuggested,
            }
          })
      )
      setTankRows(
        tanks
          .filter((tank) => tank.active)
          .map((tank) => ({
            tank,
            quantity: "",
          }))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : t("closeWizard.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [shiftId, t])

  useEffect(() => {
    if (Number.isNaN(shiftId)) {
      setError(t("closeWizard.invalidShift"))
      setLoading(false)
      return
    }
    void load()
  }, [load, shiftId, t])

  const updatePumpRow = (
    pumpId: number,
    field: "openingReading" | "closingReading",
    value: string
  ) => {
    setPumpRows((prev) =>
      prev.map((row) => (row.pumpId === pumpId ? { ...row, [field]: value } : row))
    )
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

  const saveReadings = async () => {
    setSaving(true)
    setError(null)
    try {
      for (const row of pumpRows) {
        if (!row.openingReading.trim() || !row.closingReading.trim()) continue
        const openingReading = Number(row.openingReading)
        const closingReading = Number(row.closingReading)
        if (row.readingId != null) {
          await api.updatePumpReading(row.readingId, {
            openingReading,
            closingReading,
          })
        } else if (row.workerName) {
          await api.createShiftPumpReading(shiftId, {
            pumpId: row.pumpId,
            openingReading,
            closingReading,
          })
        }
      }
      await load()
      setStep(1)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("closeWizard.saveFailed"))
    } finally {
      setSaving(false)
    }
  }

  const saveStock = async () => {
    if (parsedStockRows.some((row) => row.warning)) {
      setError(t("shifts.stock.negativeBlocked"))
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api.upsertShiftStock(
        shiftId,
        parsedStockRows.map((row) => ({
          productId: row.productId,
          openingQty: row.opening,
          receivedQty: row.received,
          closingQty: row.closing,
        }))
      )
      await load()
      setStep(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("closeWizard.saveFailed"))
    } finally {
      setSaving(false)
    }
  }

  const saveDips = async () => {
    setSaving(true)
    setError(null)
    try {
      for (const row of tankRows) {
        if (!row.quantity.trim()) continue
        const quantity = Number(row.quantity)
        if (Number.isNaN(quantity) || quantity < 0) {
          throw new Error(t("closeWizard.invalidDip", { tank: row.tank.name }))
        }
        await api.createTankLevelReading(row.tank.id, { quantity })
      }
      await load()
      setStep(3)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("closeWizard.saveFailed"))
    } finally {
      setSaving(false)
    }
  }

  const closeShift = async () => {
    setSaving(true)
    setError(null)
    try {
      await api.updateShift(shiftId, { status: ShiftStatus.CLOSED })
      navigate(`/reconciliation?shiftId=${String(shiftId)}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("closeWizard.closeFailed"))
      setSaving(false)
    }
  }

  const fillAllStockSuggestions = () => {
    setStockRows((prev) =>
      prev.map((row) => {
        if (!row.closingSuggested) return row
        return {
          ...row,
          closingQty: String(Number(row.openingQty) + Number(row.receivedQty)),
        }
      })
    )
  }

  return (
    <PageLayout title={t("closeWizard.title")}>
      <div className="space-y-5">
        <Stepper
          steps={[
            t("closeWizard.steps.readings"),
            t("closeWizard.steps.stock"),
            t("closeWizard.steps.dips"),
            t("closeWizard.steps.summary"),
          ]}
          current={step}
          onStep={setStep}
        />

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">{t("auth.loading")}</p>
        ) : (
          <>
            {shift && (
              <p className="text-sm text-muted-foreground">
                {t("closeWizard.shiftMeta", { id: shift.id })}
              </p>
            )}

            {step === 0 && (
              <section className="space-y-4">
                <PumpReadingsGrid
                  rows={pumpRows}
                  canEdit={shift?.status !== ShiftStatus.RECONCILED}
                  onRowChange={updatePumpRow}
                />
                <Button onClick={saveReadings} disabled={saving}>
                  {saving ? t("auth.loading") : t("closeWizard.saveContinue")}
                </Button>
              </section>
            )}

            {step === 1 && (
              <section className="space-y-4">
                <StockCountGrid
                  rows={parsedStockRows}
                  canEdit={shift?.status !== ShiftStatus.RECONCILED}
                  search={stockSearch}
                  onlyChanged={stockOnlyChanged}
                  onSearchChange={setStockSearch}
                  onOnlyChangedChange={setStockOnlyChanged}
                  onRowChange={updateStockRow}
                  onFillAll={fillAllStockSuggestions}
                />
                <Button onClick={saveStock} disabled={saving}>
                  {saving ? t("auth.loading") : t("closeWizard.saveContinue")}
                </Button>
              </section>
            )}

            {step === 2 && (
              <section className="space-y-4 rounded-md border p-4">
                <p className="text-sm text-muted-foreground">
                  {preview?.dipsToday.length
                    ? t("closeWizard.dipsRecorded", {
                        count: preview.dipsToday.length,
                      })
                    : t("closeWizard.noDips")}
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {tankRows.map((row) => (
                    <label key={row.tank.id} className="space-y-1 text-sm">
                      <span className="font-medium">
                        {row.tank.name}
                        {row.tank.fuelTypeName ? ` · ${row.tank.fuelTypeName}` : ""}
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={row.quantity}
                        placeholder={t("closeWizard.dipQuantity")}
                        onChange={(e) =>
                          setTankRows((prev) =>
                            prev.map((item) =>
                              item.tank.id === row.tank.id
                                ? { ...item, quantity: e.target.value }
                                : item
                            )
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button type="button" onClick={saveDips} disabled={saving}>
                    {saving ? t("auth.loading") : t("closeWizard.saveDips")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(3)}
                  >
                    {t("closeWizard.skipDips")}
                  </Button>
                </div>
              </section>
            )}

            {step === 3 && preview && (
              <section className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border p-4">
                    <p className="text-xs text-muted-foreground">
                      {t("closeWizard.summary.fuel")}
                    </p>
                    <p className="text-2xl font-semibold">
                      {formatNumber(preview.fuelTotal.volume)} L
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {preview.fuelTotal.revenue != null
                        ? formatNumber(preview.fuelTotal.revenue)
                        : t("home.today.unknown")}
                    </p>
                  </div>
                  <div className="rounded-md border p-4">
                    <p className="text-xs text-muted-foreground">
                      {t("closeWizard.summary.shop")}
                    </p>
                    <p className="text-2xl font-semibold">
                      {formatNumber(preview.shop.expectedTotal)}
                    </p>
                  </div>
                  <div className="rounded-md border p-4">
                    <p className="text-xs text-muted-foreground">
                      {t("closeWizard.summary.dips")}
                    </p>
                    <p className="text-2xl font-semibold">
                      {preview.dipsToday.length}
                    </p>
                  </div>
                </div>

                {preview.blockers.length > 0 && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {preview.blockers.join(" · ")}
                    </AlertDescription>
                  </Alert>
                )}
                {preview.warnings.length > 0 && (
                  <Alert>
                    <AlertDescription>
                      {preview.warnings.join(" · ")}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="button"
                  disabled={saving || preview.blockers.length > 0}
                  onClick={closeShift}
                >
                  {saving ? t("auth.loading") : t("closeWizard.closeShift")}
                </Button>
              </section>
            )}
          </>
        )}
      </div>
    </PageLayout>
  )
}
