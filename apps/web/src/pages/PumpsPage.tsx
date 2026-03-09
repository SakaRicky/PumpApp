import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type {
  PumpResponse,
  FuelPriceResponse,
  FuelPriceCreateBody,
} from "@pumpapp/shared"
import { PageLayout } from "@/components/layout/PageLayout"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api } from "@/lib/api"

export const PumpsPage = () => {
  const { t } = useTranslation()
  const [pumps, setPumps] = useState<PumpResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [editPump, setEditPump] = useState<PumpResponse | null>(null)

  const [createName, setCreateName] = useState("")
  const [createActive, setCreateActive] = useState(true)

  const [editName, setEditName] = useState("")
  const [editActive, setEditActive] = useState(true)

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [priceDialogPump, setPriceDialogPump] = useState<PumpResponse | null>(
    null
  )
  const [prices, setPrices] = useState<FuelPriceResponse[]>([])
  const [pricesLoading, setPricesLoading] = useState(false)
  const [priceError, setPriceError] = useState<string | null>(null)
  const [priceForm, setPriceForm] = useState<FuelPriceCreateBody>({
    pumpId: 0,
    pricePerUnit: 0,
    effectiveFrom: "",
  })

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await api.getPumps()
      setPumps(res)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t("pumps.errorLoad"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setCreateName("")
    setCreateActive(true)
    setSubmitError(null)
    setCreateOpen(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createName.trim()) {
      setSubmitError(t("pumps.form.name"))
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.createPump({
        name: createName.trim(),
        active: createActive,
      })
      setCreateOpen(false)
      await load()
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : t("pumps.errorCreate")
      )
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (pump: PumpResponse) => {
    setEditPump(pump)
    setEditName(pump.name)
    setEditActive(pump.active)
    setSubmitError(null)
  }

  const closeEdit = () => {
    setEditPump(null)
    setSubmitError(null)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editPump) return
    if (!editName.trim()) {
      setSubmitError(t("pumps.form.name"))
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.updatePump(editPump.id, {
        name: editName.trim(),
        active: editActive,
      })
      closeEdit()
      await load()
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : t("pumps.errorUpdate")
      )
    } finally {
      setSubmitting(false)
    }
  }

  const openPrices = async (pump: PumpResponse) => {
    setPriceDialogPump(pump)
    setPricesLoading(true)
    setPriceError(null)
    try {
      if (!pump.fuelTypeId) {
        setPriceError("This pump is not linked to any fuel type yet.")
        setPrices([])
        return
      }
      const res = await api.getFuelPrices()
      setPrices(res.filter((p) => p.fuelTypeId === pump.fuelTypeId))
      setPriceForm({
        fuelTypeId: pump.fuelTypeId,
        pricePerUnit: 0,
        effectiveFrom: "",
      })
    } catch (e) {
      setPriceError(
        e instanceof Error ? e.message : t("products.priceHistory.errorCreate")
      )
    } finally {
      setPricesLoading(false)
    }
  }

  const closePrices = () => {
    setPriceDialogPump(null)
    setPrices([])
    setPriceError(null)
  }

  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!priceDialogPump) return
    if (!priceForm.effectiveFrom) {
      setPriceError(t("products.priceHistory.effectiveAtRequired"))
      return
    }
    if (priceForm.pricePerUnit < 0) {
      setPriceError(t("products.priceHistory.invalidPrice"))
      return
    }
    setPricesLoading(true)
    setPriceError(null)
    try {
      await api.createFuelPrice({
        fuelTypeId: priceDialogPump.fuelTypeId!,
        pricePerUnit: priceForm.pricePerUnit,
        effectiveFrom: priceForm.effectiveFrom,
      })
      const res = await api.getFuelPrices()
      setPrices(
        res.filter((p) => p.fuelTypeId === priceDialogPump.fuelTypeId)
      )
      setPriceForm((prev) => ({
        ...prev,
        pricePerUnit: 0,
        effectiveFrom: "",
      }))
    } catch (e) {
      setPriceError(
        e instanceof Error ? e.message : t("products.priceHistory.errorCreate")
      )
    } finally {
      setPricesLoading(false)
    }
  }

  return (
    <PageLayout title={t("pumps.title")}>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">{t("pumps.intro")}</p>
          <Button onClick={openCreate}>{t("pumps.addPump")}</Button>
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <p className="text-muted-foreground">{t("auth.loading")}</p>
        ) : pumps.length === 0 ? (
          <p className="text-muted-foreground">{t("pumps.noPumps")}</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("pumps.table.id")}</TableHead>
                  <TableHead>{t("pumps.table.name")}</TableHead>
                  <TableHead>{t("pumps.table.active")}</TableHead>
                  <TableHead className="w-[120px]">
                    {t("products.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pumps.map((pump) => (
                  <TableRow key={pump.id}>
                    <TableCell>{pump.id}</TableCell>
                    <TableCell>{pump.name}</TableCell>
                    <TableCell>
                      {pump.active
                        ? t("products.activeYes")
                        : t("products.activeNo")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(pump)}
                      >
                        {t("pumps.editPump")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2"
                        onClick={() => void openPrices(pump)}
                      >
                        {t("products.priceHistory.title")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create pump dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pumps.createPump")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="create-name">{t("pumps.form.name")}</Label>
              <Input
                id="create-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="create-active"
                checked={createActive}
                onChange={(e) => setCreateActive(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="create-active">{t("pumps.form.active")}</Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                {t("pumps.cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("auth.loading") : t("pumps.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit pump dialog */}
      <Dialog open={!!editPump} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pumps.editPump")}</DialogTitle>
          </DialogHeader>
          {editPump && (
            <form onSubmit={handleEdit} className="space-y-4">
              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-name">{t("pumps.form.name")}</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="edit-active">{t("pumps.form.active")}</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeEdit}>
                  {t("pumps.cancel")}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? t("auth.loading") : t("pumps.save")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Fuel price history dialog */}
      <Dialog
        open={!!priceDialogPump}
        onOpenChange={(open) => !open && closePrices()}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t("products.priceHistory.dialogTitle")}
              {priceDialogPump && ` — ${priceDialogPump.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {priceError && (
              <Alert variant="destructive">
                <AlertDescription>{priceError}</AlertDescription>
              </Alert>
            )}

            {priceDialogPump && (
              <form
                onSubmit={handleAddPrice}
                className="space-y-3 rounded-md border p-3"
              >
                <h4 className="text-sm font-medium">
                  {t("products.priceHistory.addPrice")}
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pump-price">
                      {t("products.priceHistory.purchasePrice")}
                    </Label>
                    <Input
                      id="pump-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceForm.pricePerUnit}
                      onChange={(e) =>
                        setPriceForm((prev) => ({
                          ...prev,
                          pricePerUnit: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pump-effectiveFrom">
                      {t("products.priceHistory.effectiveAt")}
                    </Label>
                    <Input
                      id="pump-effectiveFrom"
                      type="date"
                      value={priceForm.effectiveFrom}
                      onChange={(e) =>
                        setPriceForm((prev) => ({
                          ...prev,
                          effectiveFrom: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={pricesLoading}>
                    {pricesLoading ? t("auth.loading") : t("pumps.save")}
                  </Button>
                </DialogFooter>
              </form>
            )}

            <div>
              <h4 className="mb-2 text-sm font-medium">
                {t("products.priceHistory.tableTitle")}
              </h4>
              {pricesLoading ? (
                <p className="text-muted-foreground text-sm">
                  {t("auth.loading")}
                </p>
              ) : prices.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t("products.priceHistory.noPrices")}
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          {t("products.priceHistory.effectiveAt")}
                        </TableHead>
                        <TableHead>
                          {t("products.priceHistory.purchasePrice")}
                        </TableHead>
                        <TableHead>effectiveTo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prices.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            {new Date(row.effectiveFrom).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{row.pricePerUnit.toFixed(2)}</TableCell>
                          <TableCell>
                            {row.effectiveTo
                              ? new Date(row.effectiveTo).toLocaleDateString()
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}

