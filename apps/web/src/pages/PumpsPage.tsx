import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type {
  PumpResponse,
  FuelPriceResponse,
  FuelPriceCreateBody,
  FuelTypeResponse,
  TankResponse,
  FuelDeliveryResponse,
} from "@pumpapp/shared"
import { PageLayout } from "@/components/layout/PageLayout"
import { Button } from "@/components/ui/button"
import { TankLevelGauge } from "@/components/TankLevelGauge"
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
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/api"
import { useAlert } from "@/contexts/AlertProvider"

export const PumpsPage = () => {
  const { t } = useTranslation()
  const { showAlert } = useAlert()
  const [activeTab, setActiveTab] = useState<
    "pumps" | "fuelTypes" | "tanks" | "deliveries"
  >("pumps")

  const [pumps, setPumps] = useState<PumpResponse[]>([])
  const [pumpsLoading, setPumpsLoading] = useState(true)
  const [pumpsError, setPumpsError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [editPump, setEditPump] = useState<PumpResponse | null>(null)

  const [createName, setCreateName] = useState("")
  const [createActive, setCreateActive] = useState(true)
  const [createPumpTankId, setCreatePumpTankId] = useState<number | "">("")

  const [editName, setEditName] = useState("")
  const [editActive, setEditActive] = useState(true)
  const [editPumpTankId, setEditPumpTankId] = useState<number | "">("")

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [fuelTypes, setFuelTypes] = useState<FuelTypeResponse[]>([])
  const [fuelTypesLoading, setFuelTypesLoading] = useState(false)
  const [fuelTypesError, setFuelTypesError] = useState<string | null>(null)
  const [fuelTypePrices, setFuelTypePrices] = useState<
    Record<number, FuelPriceResponse | undefined>
  >({})

  const [tanks, setTanks] = useState<TankResponse[]>([])
  const [tanksLoading, setTanksLoading] = useState(false)
  const [tanksError, setTanksError] = useState<string | null>(null)

  const [createFuelTypeOpen, setCreateFuelTypeOpen] = useState(false)
  const [editFuelType, setEditFuelType] = useState<FuelTypeResponse | null>(
    null
  )
  const [createFuelTypeName, setCreateFuelTypeName] = useState("")
  const [createFuelTypeActive, setCreateFuelTypeActive] = useState(true)
  const [createFuelTypeSellingPrice, setCreateFuelTypeSellingPrice] =
    useState<string>("")
  const [createFuelTypePurchasePrice, setCreateFuelTypePurchasePrice] =
    useState<string>("")
  const [editFuelTypeName, setEditFuelTypeName] = useState("")
  const [editFuelTypeActive, setEditFuelTypeActive] = useState(true)
  const [editFuelTypeSellingPrice, setEditFuelTypeSellingPrice] =
    useState<string>("")
  const [editFuelTypePurchasePrice, setEditFuelTypePurchasePrice] =
    useState<string>("")

  const [createTankOpen, setCreateTankOpen] = useState(false)
  const [editTank, setEditTank] = useState<TankResponse | null>(null)
  const [createTankName, setCreateTankName] = useState("")
  const [createTankFuelTypeId, setCreateTankFuelTypeId] = useState<number | "">(
    ""
  )
  const [createTankCapacity, setCreateTankCapacity] = useState<string>("")
  const [createTankActive, setCreateTankActive] = useState(true)
  const [editTankName, setEditTankName] = useState("")
  const [editTankFuelTypeId, setEditTankFuelTypeId] = useState<number | "">("")
  const [editTankCapacity, setEditTankCapacity] = useState<string>("")
  const [editTankActive, setEditTankActive] = useState(true)

  const [priceDialogFuelType, setPriceDialogFuelType] = useState<{
    id: number
    name: string
  } | null>(null)
  const [prices, setPrices] = useState<FuelPriceResponse[]>([])
  const [pricesLoading, setPricesLoading] = useState(false)
  const [priceError, setPriceError] = useState<string | null>(null)
  const [priceForm, setPriceForm] = useState<FuelPriceCreateBody>({
    fuelTypeId: 0,
    pricePerUnit: 0,
    purchasePricePerUnit: 0,
    effectiveFrom: "",
  })

  const [deliveries, setDeliveries] = useState<FuelDeliveryResponse[]>([])
  const [deliveriesLoading, setDeliveriesLoading] = useState(false)
  const [deliveriesError, setDeliveriesError] = useState<string | null>(null)
  const [deliveryTankId, setDeliveryTankId] = useState<number | "">("")
  const [deliveryQuantity, setDeliveryQuantity] = useState<string>("")
  const [deliveryDeliveredAt, setDeliveryDeliveredAt] = useState<string>("")
  const [deliveryNotes, setDeliveryNotes] = useState<string>("")
  const [deliverySubmitting, setDeliverySubmitting] = useState(false)
  const [deliveriesRefreshing, setDeliveriesRefreshing] = useState(false)

  const loadPumps = useCallback(async () => {
    setPumpsLoading(true)
    setPumpsError(null)
    try {
      const res = await api.getPumps()
      setPumps(res)
    } catch (e) {
      setPumpsError(e instanceof Error ? e.message : t("pumps.errorLoad"))
    } finally {
      setPumpsLoading(false)
    }
  }, [t])

  const loadFuelTypes = useCallback(async () => {
    setFuelTypesLoading(true)
    setFuelTypesError(null)
    try {
      const [fuelTypeList, priceList] = await Promise.all([
        api.getFuelTypes(),
        api.getFuelPrices(),
      ])
      setFuelTypes(fuelTypeList)

      const latestByFuelType: Record<number, FuelPriceResponse> = {}
      for (const price of priceList) {
        const existing = latestByFuelType[price.fuelTypeId]
        if (!existing) {
          latestByFuelType[price.fuelTypeId] = price
          continue
        }
        if (
          new Date(price.effectiveFrom).getTime() >
          new Date(existing.effectiveFrom).getTime()
        ) {
          latestByFuelType[price.fuelTypeId] = price
        }
      }
      setFuelTypePrices(latestByFuelType)
    } catch (e) {
      setFuelTypesError(
        e instanceof Error ? e.message : t("pumps.fuelTypes.errorLoad")
      )
    } finally {
      setFuelTypesLoading(false)
    }
  }, [t])

  const loadTanks = useCallback(async () => {
    setTanksLoading(true)
    setTanksError(null)
    try {
      const res = await api.getTanks()
      setTanks(res)
    } catch (e) {
      setTanksError(e instanceof Error ? e.message : t("pumps.tanks.errorLoad"))
    } finally {
      setTanksLoading(false)
    }
  }, [t])

  const loadDeliveries = useCallback(async () => {
    setDeliveriesLoading(true)
    setDeliveriesError(null)
    try {
      const res = await api.getDeliveries()
      setDeliveries(res)
    } catch (e) {
      setDeliveriesError(
        e instanceof Error ? e.message : t("pumps.deliveries.errorLoad")
      )
    } finally {
      setDeliveriesLoading(false)
    }
  }, [t])

  useEffect(() => {
    void Promise.all([loadPumps(), loadFuelTypes(), loadTanks()])
  }, [loadPumps, loadFuelTypes, loadTanks])

  useEffect(() => {
    if (activeTab === "deliveries") {
      void loadDeliveries()
    }
  }, [activeTab, loadDeliveries])

  const openCreate = () => {
    setCreateName("")
    setCreateActive(true)
    setCreatePumpTankId("")
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
        ...(createPumpTankId !== "" && {
          tankId: Number(createPumpTankId),
        }),
      })
      setCreateOpen(false)
      showAlert(t("pumps.messages.pumpCreated"), "success")
      await loadPumps()
    } catch (e) {
      const message = e instanceof Error ? e.message : t("pumps.errorCreate")
      setSubmitError(message)
      showAlert(message, "error")
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (pump: PumpResponse) => {
    setEditPump(pump)
    setEditName(pump.name)
    setEditActive(pump.active)
    setEditPumpTankId(pump.tankId ?? "")
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
        ...(editPumpTankId !== "" && {
          tankId: Number(editPumpTankId),
        }),
      })
      closeEdit()
      showAlert(t("pumps.messages.pumpUpdated"), "success")
      await loadPumps()
    } catch (e) {
      const message = e instanceof Error ? e.message : t("pumps.errorUpdate")
      setSubmitError(message)
      showAlert(message, "error")
    } finally {
      setSubmitting(false)
    }
  }

  const openPricesForFuelType = async (fuelType: {
    id: number
    name: string
  }) => {
    setPriceDialogFuelType(fuelType)
    setPricesLoading(true)
    setPriceError(null)
    try {
      const res = await api.getFuelPrices()
      setPrices(res.filter((p) => p.fuelTypeId === fuelType.id))
      setPriceForm({
        fuelTypeId: fuelType.id,
        pricePerUnit: 0,
        purchasePricePerUnit: 0,
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
    setPriceDialogFuelType(null)
    setPrices([])
    setPriceError(null)
  }

  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!priceDialogFuelType) return
    if (!priceForm.effectiveFrom) {
      setPriceError(t("products.priceHistory.effectiveAtRequired"))
      return
    }
    if (priceForm.pricePerUnit < 0) {
      setPriceError(t("products.priceHistory.invalidPrice"))
      return
    }
    if (
      priceForm.purchasePricePerUnit !== undefined &&
      priceForm.purchasePricePerUnit < 0
    ) {
      setPriceError(t("products.priceHistory.invalidPrice"))
      return
    }
    setPricesLoading(true)
    setPriceError(null)
    try {
      await api.createFuelPrice({
        fuelTypeId: priceDialogFuelType.id,
        pricePerUnit: priceForm.pricePerUnit,
        purchasePricePerUnit: priceForm.purchasePricePerUnit,
        effectiveFrom: priceForm.effectiveFrom,
      })
      const res = await api.getFuelPrices()
      setPrices(res.filter((p) => p.fuelTypeId === priceDialogFuelType.id))
      setPriceForm((prev) => ({
        ...prev,
        pricePerUnit: 0,
        purchasePricePerUnit: 0,
        effectiveFrom: "",
      }))
      showAlert(t("pumps.messages.fuelPriceSaved"), "success")
    } catch (e) {
      const message =
        e instanceof Error ? e.message : t("products.priceHistory.errorCreate")
      setPriceError(message)
      showAlert(message, "error")
    } finally {
      setPricesLoading(false)
    }
  }

  const openCreateFuelType = () => {
    setCreateFuelTypeName("")
    setCreateFuelTypeActive(true)
    setCreateFuelTypeSellingPrice("")
    setCreateFuelTypePurchasePrice("")
    setSubmitError(null)
    setCreateFuelTypeOpen(true)
  }

  const handleCreateFuelType = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createFuelTypeName.trim()) {
      setSubmitError(t("pumps.fuelTypes.form.name"))
      return
    }

    const selling =
      createFuelTypeSellingPrice.trim() === ""
        ? undefined
        : Number(createFuelTypeSellingPrice)
    const purchase =
      createFuelTypePurchasePrice.trim() === ""
        ? undefined
        : Number(createFuelTypePurchasePrice)

    if (
      (selling !== undefined && Number.isNaN(selling)) ||
      (purchase !== undefined && Number.isNaN(purchase))
    ) {
      setSubmitError(t("products.priceHistory.invalidPrice"))
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      const created = await api.createFuelType({
        name: createFuelTypeName.trim(),
        active: createFuelTypeActive,
      })

      if (selling !== undefined || purchase !== undefined) {
        await api.createFuelPrice({
          fuelTypeId: created.id,
          pricePerUnit: selling ?? 0,
          purchasePricePerUnit: purchase,
          effectiveFrom: new Date().toISOString(),
        })
      }

      setCreateFuelTypeOpen(false)
      showAlert(t("pumps.messages.fuelTypeSaved"), "success")
      await loadFuelTypes()
    } catch (e) {
      const message =
        e instanceof Error ? e.message : t("pumps.fuelTypes.errorCreate")
      setSubmitError(message)
      showAlert(message, "error")
    } finally {
      setSubmitting(false)
    }
  }

  const openEditFuelType = (fuelType: FuelTypeResponse) => {
    setEditFuelType(fuelType)
    setEditFuelTypeName(fuelType.name)
    setEditFuelTypeActive(fuelType.active)
    const latestPrice = fuelTypePrices[fuelType.id]
    setEditFuelTypeSellingPrice(
      latestPrice ? String(latestPrice.pricePerUnit) : ""
    )
    setEditFuelTypePurchasePrice(
      latestPrice?.purchasePricePerUnit != null
        ? String(latestPrice.purchasePricePerUnit)
        : ""
    )
    setSubmitError(null)
  }

  const closeEditFuelType = () => {
    setEditFuelType(null)
    setSubmitError(null)
  }

  const handleEditFuelType = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editFuelType) return
    if (!editFuelTypeName.trim()) {
      setSubmitError(t("pumps.fuelTypes.form.name"))
      return
    }

    const latestPrice = fuelTypePrices[editFuelType.id]
    const sellingInput =
      editFuelTypeSellingPrice.trim() === ""
        ? undefined
        : Number(editFuelTypeSellingPrice)
    const purchaseInput =
      editFuelTypePurchasePrice.trim() === ""
        ? undefined
        : Number(editFuelTypePurchasePrice)

    if (
      (sellingInput !== undefined && Number.isNaN(sellingInput)) ||
      (purchaseInput !== undefined && Number.isNaN(purchaseInput))
    ) {
      setSubmitError(t("products.priceHistory.invalidPrice"))
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.updateFuelType(editFuelType.id, {
        name: editFuelTypeName.trim(),
        active: editFuelTypeActive,
      })
      const sellingChanged =
        sellingInput !== undefined &&
        (!latestPrice || sellingInput !== latestPrice.pricePerUnit)
      const purchaseChanged =
        purchaseInput !== undefined &&
        (!latestPrice || purchaseInput !== latestPrice.purchasePricePerUnit)

      if (sellingChanged || purchaseChanged) {
        await api.createFuelPrice({
          fuelTypeId: editFuelType.id,
          pricePerUnit: sellingInput ?? latestPrice?.pricePerUnit ?? 0,
          purchasePricePerUnit:
            purchaseInput ?? latestPrice?.purchasePricePerUnit ?? undefined,
          effectiveFrom: new Date().toISOString(),
        })
      }

      closeEditFuelType()
      showAlert(t("pumps.messages.fuelTypeSaved"), "success")
      await loadFuelTypes()
    } catch (e) {
      const message =
        e instanceof Error ? e.message : t("pumps.fuelTypes.errorUpdate")
      setSubmitError(message)
      showAlert(message, "error")
    } finally {
      setSubmitting(false)
    }
  }

  const openCreateTank = () => {
    setCreateTankName("")
    setCreateTankFuelTypeId("")
    setCreateTankCapacity("")
    setCreateTankActive(true)
    setSubmitError(null)
    setCreateTankOpen(true)
  }

  const handleCreateTank = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createTankName.trim() || createTankFuelTypeId === "") {
      setSubmitError(t("pumps.tanks.form.required"))
      return
    }
    const capacity =
      createTankCapacity.trim() === "" ? undefined : Number(createTankCapacity)
    if (capacity !== undefined && Number.isNaN(capacity)) {
      setSubmitError(t("pumps.tanks.form.invalidCapacity"))
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.createTank({
        fuelTypeId: Number(createTankFuelTypeId),
        name: createTankName.trim(),
        ...(capacity !== undefined && { capacity }),
        active: createTankActive,
      })
      setCreateTankOpen(false)
      showAlert(t("pumps.messages.tankSaved"), "success")
      await loadTanks()
    } catch (e) {
      const message =
        e instanceof Error ? e.message : t("pumps.tanks.errorCreate")
      setSubmitError(message)
      showAlert(message, "error")
    } finally {
      setSubmitting(false)
    }
  }

  const openEditTank = (tank: TankResponse) => {
    setEditTank(tank)
    setEditTankName(tank.name)
    setEditTankFuelTypeId(tank.fuelTypeId)
    setEditTankCapacity(tank.capacity !== null ? String(tank.capacity) : "")
    setEditTankActive(tank.active)
    setSubmitError(null)
  }

  const closeEditTank = () => {
    setEditTank(null)
    setSubmitError(null)
  }

  const handleEditTank = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTank) return
    if (!editTankName.trim() || editTankFuelTypeId === "") {
      setSubmitError(t("pumps.tanks.form.required"))
      return
    }
    const capacity =
      editTankCapacity.trim() === "" ? undefined : Number(editTankCapacity)
    if (capacity !== undefined && Number.isNaN(capacity)) {
      setSubmitError(t("pumps.tanks.form.invalidCapacity"))
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.updateTank(editTank.id, {
        fuelTypeId: Number(editTankFuelTypeId),
        name: editTankName.trim(),
        ...(capacity !== undefined && { capacity }),
        active: editTankActive,
      })
      closeEditTank()
      showAlert(t("pumps.messages.tankSaved"), "success")
      await loadTanks()
    } catch (e) {
      const message =
        e instanceof Error ? e.message : t("pumps.tanks.errorUpdate")
      setSubmitError(message)
      showAlert(message, "error")
    } finally {
      setSubmitting(false)
    }
  }

  const handleRecordDelivery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (deliveryTankId === "") {
      showAlert(t("pumps.deliveries.tankRequired"), "error")
      return
    }
    const qty = Number(deliveryQuantity)
    if (Number.isNaN(qty) || qty < 0) {
      showAlert(t("pumps.deliveries.invalidQuantity"), "error")
      return
    }
    setDeliverySubmitting(true)
    setDeliveriesError(null)
    try {
      await api.createDelivery(Number(deliveryTankId), {
        quantity: qty,
        ...(deliveryDeliveredAt.trim() && {
          deliveredAt: new Date(deliveryDeliveredAt).toISOString(),
        }),
        ...(deliveryNotes.trim() && { notes: deliveryNotes.trim() }),
      })
      setDeliveryTankId("")
      setDeliveryQuantity("")
      setDeliveryDeliveredAt("")
      setDeliveryNotes("")
      showAlert(t("pumps.messages.deliveryRecorded"), "success")
      await Promise.all([loadTanks(), loadDeliveries()])
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("pumps.deliveries.errorCreate")
      setDeliveriesError(message)
      showAlert(message, "error")
    } finally {
      setDeliverySubmitting(false)
    }
  }

  const handleRefreshDeliveries = async () => {
    setDeliveriesRefreshing(true)
    try {
      await Promise.all([loadTanks(), loadDeliveries()])
    } finally {
      setDeliveriesRefreshing(false)
    }
  }

  return (
    <PageLayout title={t("pumps.title")}>
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-muted-foreground">{t("pumps.intro")}</p>
          <div className="inline-flex rounded-md border bg-muted p-1">
            <button
              type="button"
              className={`px-3 py-1 text-sm font-medium ${
                activeTab === "pumps"
                  ? "bg-background text-foreground rounded-md shadow"
                  : "text-muted-foreground"
              }`}
              onClick={() => setActiveTab("pumps")}
            >
              {t("pumps.tabs.pumps")}
            </button>
            <button
              type="button"
              className={`px-3 py-1 text-sm font-medium ${
                activeTab === "fuelTypes"
                  ? "bg-background text-foreground rounded-md shadow"
                  : "text-muted-foreground"
              }`}
              onClick={() => setActiveTab("fuelTypes")}
            >
              {t("pumps.tabs.fuelTypes")}
            </button>
            <button
              type="button"
              className={`px-3 py-1 text-sm font-medium ${
                activeTab === "tanks"
                  ? "bg-background text-foreground rounded-md shadow"
                  : "text-muted-foreground"
              }`}
              onClick={() => setActiveTab("tanks")}
            >
              {t("pumps.tabs.tanks")}
            </button>
            <button
              type="button"
              className={`px-3 py-1 text-sm font-medium ${
                activeTab === "deliveries"
                  ? "bg-background text-foreground rounded-md shadow"
                  : "text-muted-foreground"
              }`}
              onClick={() => setActiveTab("deliveries")}
            >
              {t("pumps.tabs.deliveries")}
            </button>
          </div>
        </div>

        {pumpsError && activeTab === "pumps" && (
          <Alert variant="destructive">
            <AlertDescription>{pumpsError}</AlertDescription>
          </Alert>
        )}

        {activeTab === "pumps" && (
          <div className="space-y-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-medium">
                {t("pumps.section.pumps")}
              </span>
              <Button onClick={openCreate}>{t("pumps.addPump")}</Button>
            </div>
            {pumpsLoading ? (
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
                      <TableHead>{t("pumps.table.fuelType")}</TableHead>
                      <TableHead className="w-[220px]">
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
                        <TableCell>{pump.fuelTypeName ?? "—"}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(pump)}
                          >
                            {t("pumps.editPump")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {activeTab === "fuelTypes" && (
          <div className="space-y-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-medium">
                {t("pumps.section.fuelTypes")}
              </span>
              <Button onClick={openCreateFuelType}>
                {t("pumps.fuelTypes.add")}
              </Button>
            </div>
            {fuelTypesError && (
              <Alert variant="destructive">
                <AlertDescription>{fuelTypesError}</AlertDescription>
              </Alert>
            )}
            {fuelTypesLoading ? (
              <p className="text-muted-foreground">{t("auth.loading")}</p>
            ) : fuelTypes.length === 0 ? (
              <p className="text-muted-foreground">
                {t("pumps.fuelTypes.empty")}
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("pumps.table.id")}</TableHead>
                      <TableHead>{t("pumps.table.name")}</TableHead>
                      <TableHead>{t("products.table.sellingPrice")}</TableHead>
                      <TableHead>{t("products.table.purchasePrice")}</TableHead>
                      <TableHead>{t("pumps.table.active")}</TableHead>
                      <TableHead className="w-[260px]">
                        {t("products.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fuelTypes.map((fuelType) => {
                      const latestPrice = fuelTypePrices[fuelType.id]
                      return (
                        <TableRow key={fuelType.id}>
                          <TableCell>{fuelType.id}</TableCell>
                          <TableCell>{fuelType.name}</TableCell>
                          <TableCell>
                            {latestPrice
                              ? latestPrice.pricePerUnit.toFixed(2)
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {latestPrice?.purchasePricePerUnit != null
                              ? latestPrice.purchasePricePerUnit.toFixed(2)
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {fuelType.active
                              ? t("products.activeYes")
                              : t("products.activeNo")}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditFuelType(fuelType)}
                              >
                                {t("pumps.fuelTypes.edit")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  void openPricesForFuelType({
                                    id: fuelType.id,
                                    name: fuelType.name,
                                  })
                                }
                              >
                                {t("products.priceHistory.title")}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {activeTab === "tanks" && (
          <div className="space-y-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-medium">
                {t("pumps.section.tanks")}
              </span>
              <Button onClick={openCreateTank}>{t("pumps.tanks.add")}</Button>
            </div>
            {tanksError && (
              <Alert variant="destructive">
                <AlertDescription>{tanksError}</AlertDescription>
              </Alert>
            )}
            {tanksLoading ? (
              <p className="text-muted-foreground">{t("auth.loading")}</p>
            ) : tanks.length === 0 ? (
              <p className="text-muted-foreground">{t("pumps.tanks.empty")}</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("pumps.table.id")}</TableHead>
                      <TableHead>{t("pumps.table.name")}</TableHead>
                      <TableHead>{t("pumps.table.fuelType")}</TableHead>
                      <TableHead>{t("pumps.tanks.table.capacity")}</TableHead>
                      <TableHead>
                        {t("pumps.tanks.table.theoreticalQuantity")}
                      </TableHead>
                      <TableHead>
                        {t("pumps.tanks.table.actualQuantity")}
                      </TableHead>
                      <TableHead>{t("pumps.table.active")}</TableHead>
                      <TableHead className="w-[180px]">
                        {t("products.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tanks.map((tank) => (
                      <TableRow key={tank.id}>
                        <TableCell>{tank.id}</TableCell>
                        <TableCell>{tank.name}</TableCell>
                        <TableCell>{tank.fuelTypeName ?? "—"}</TableCell>
                        <TableCell>
                          {tank.capacity !== null ? tank.capacity : "—"}
                        </TableCell>
                        <TableCell>
                          {tank.theoreticalQuantity !== null
                            ? tank.theoreticalQuantity
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {tank.actualQuantity !== null
                            ? tank.actualQuantity
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {tank.active
                            ? t("products.activeYes")
                            : t("products.activeNo")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditTank(tank)}
                          >
                            {t("pumps.tanks.edit")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {activeTab === "deliveries" && (
          <div className="space-y-6">
            <div className="rounded-md border bg-card p-4">
              <h3 className="mb-3 text-sm font-medium">
                {t("pumps.deliveries.record")}
              </h3>
              {tanks.length === 0 ? (
                <Alert className="mb-3">
                  <AlertDescription>
                    {t("pumps.deliveries.noTanks")}{" "}
                    <button
                      type="button"
                      className="underline focus:outline-none focus:ring-2 focus:ring-ring"
                      onClick={() => setActiveTab("tanks")}
                    >
                      {t("pumps.tabs.tanks")}
                    </button>
                  </AlertDescription>
                </Alert>
              ) : null}
              <form
                onSubmit={handleRecordDelivery}
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="delivery-tank">
                    {t("pumps.deliveries.tank")} *
                  </Label>
                  <Select
                    value={
                      deliveryTankId === "" ? undefined : String(deliveryTankId)
                    }
                    onValueChange={(val) => {
                      setDeliveryTankId(val ? Number(val) : "")
                      setDeliveriesError(null)
                    }}
                    disabled={tanks.length === 0}
                  >
                    <SelectTrigger id="delivery-tank">
                      <SelectValue
                        placeholder={t("pumps.deliveries.tankPlaceholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {tanks.map((tank) => (
                        <SelectItem key={tank.id} value={String(tank.id)}>
                          {tank.name}
                          {tank.fuelTypeName ? ` — ${tank.fuelTypeName}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery-quantity">
                    {t("pumps.deliveries.quantity")} (
                    {t("pumps.deliveries.quantityUnit")}) *
                  </Label>
                  <Input
                    id="delivery-quantity"
                    type="number"
                    step="0.001"
                    min="0"
                    value={deliveryQuantity}
                    onChange={(e) => {
                      setDeliveryQuantity(e.target.value)
                      setDeliveriesError(null)
                    }}
                    required
                    disabled={tanks.length === 0}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery-deliveredAt">
                    {t("pumps.deliveries.deliveredAt")}
                  </Label>
                  <DatePicker
                    id="delivery-deliveredAt"
                    value={deliveryDeliveredAt}
                    onChange={(v) => {
                      setDeliveryDeliveredAt(v)
                      setDeliveriesError(null)
                    }}
                    placeholder={t("pumps.deliveries.deliveredAtPlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery-notes">
                    {t("pumps.deliveries.notes")}
                  </Label>
                  <Input
                    id="delivery-notes"
                    value={deliveryNotes}
                    onChange={(e) => {
                      setDeliveryNotes(e.target.value)
                      setDeliveriesError(null)
                    }}
                    placeholder={t("pumps.deliveries.notesPlaceholder")}
                    disabled={tanks.length === 0}
                  />
                </div>
                <div className="flex items-end gap-2 sm:col-span-2 md:col-span-4">
                  <Button
                    type="submit"
                    disabled={deliverySubmitting || tanks.length === 0}
                  >
                    {deliverySubmitting
                      ? t("auth.loading")
                      : t("pumps.deliveries.recordButton")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleRefreshDeliveries()}
                    disabled={deliveriesRefreshing}
                  >
                    {deliveriesRefreshing
                      ? t("auth.loading")
                      : t("pumps.deliveries.refresh")}
                  </Button>
                </div>
              </form>
              {deliveriesError && (
                <Alert variant="destructive" className="mt-3">
                  <AlertDescription>{deliveriesError}</AlertDescription>
                </Alert>
              )}
            </div>

            {tanks.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium">
                  {t("pumps.deliveries.levels")}
                </h3>
                <div className="flex flex-wrap gap-4">
                  {tanks.map((tank) => (
                    <TankLevelGauge
                      key={tank.id}
                      theoreticalQuantity={tank.theoreticalQuantity}
                      capacity={tank.capacity}
                      tankName={tank.name}
                      fuelTypeName={tank.fuelTypeName}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-sm font-medium">
                {t("pumps.deliveries.history")}
              </h3>
              {deliveriesLoading ? (
                <p className="text-muted-foreground text-sm">
                  {t("auth.loading")}
                </p>
              ) : deliveries.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t("pumps.deliveries.empty")}
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          {t("pumps.deliveries.table.deliveredAt")}
                        </TableHead>
                        <TableHead>
                          {t("pumps.deliveries.table.tank")}
                        </TableHead>
                        <TableHead>
                          {t("pumps.deliveries.table.quantity")}
                        </TableHead>
                        <TableHead>
                          {t("pumps.deliveries.table.notes")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveries.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell>
                            {new Date(d.deliveredAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {d.tankName ?? `Tank #${d.tankId}`}
                            {d.fuelTypeName ? ` — ${d.fuelTypeName}` : ""}
                          </TableCell>
                          <TableCell>
                            {Number(d.quantity).toLocaleString()} L
                          </TableCell>
                          <TableCell>{d.notes ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="create-pump-tank">
                {t("pumps.tanks.form.fuelType")}
              </Label>
              <select
                id="create-pump-tank"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={createPumpTankId}
                onChange={(e) =>
                  setCreatePumpTankId(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
              >
                <option value="">
                  {t("pumps.tanks.form.fuelTypePlaceholder")}
                </option>
                {tanks.map((tank) => (
                  <option key={tank.id} value={tank.id}>
                    {tank.name}
                    {tank.fuelTypeName ? ` — ${tank.fuelTypeName}` : ""}
                  </option>
                ))}
              </select>
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
              <div className="space-y-2">
                <Label htmlFor="edit-pump-tank">
                  {t("pumps.tanks.form.fuelType")}
                </Label>
                <select
                  id="edit-pump-tank"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={editPumpTankId}
                  onChange={(e) =>
                    setEditPumpTankId(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                >
                  <option value="">
                    {t("pumps.tanks.form.fuelTypePlaceholder")}
                  </option>
                  {tanks.map((tank) => (
                    <option key={tank.id} value={tank.id}>
                      {tank.name}
                      {tank.fuelTypeName ? ` — ${tank.fuelTypeName}` : ""}
                    </option>
                  ))}
                </select>
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
        open={!!priceDialogFuelType}
        onOpenChange={(open) => !open && closePrices()}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t("products.priceHistory.dialogTitle")}
              {priceDialogFuelType && ` — ${priceDialogFuelType.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {priceError && (
              <Alert variant="destructive">
                <AlertDescription>{priceError}</AlertDescription>
              </Alert>
            )}

            {priceDialogFuelType && (
              <form
                onSubmit={handleAddPrice}
                className="space-y-3 rounded-md border p-3"
              >
                <h4 className="text-sm font-medium">
                  {t("products.priceHistory.addPrice")}
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="pump-price">
                      {t("products.table.sellingPrice")}
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
                    <Label htmlFor="pump-purchase-price">
                      {t("products.table.purchasePrice")}
                    </Label>
                    <Input
                      id="pump-purchase-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceForm.purchasePricePerUnit ?? 0}
                      onChange={(e) =>
                        setPriceForm((prev) => ({
                          ...prev,
                          purchasePricePerUnit: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pump-effectiveFrom">
                      {t("products.priceHistory.effectiveAt")}
                    </Label>
                    <DatePicker
                      id="pump-effectiveFrom"
                      value={priceForm.effectiveFrom}
                      onChange={(value) =>
                        setPriceForm((prev) => ({
                          ...prev,
                          effectiveFrom: value,
                        }))
                      }
                      placeholder={t("products.priceHistory.pickDate")}
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
                          {t("products.table.sellingPrice")}
                        </TableHead>
                        <TableHead>
                          {t("products.table.purchasePrice")}
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
                            {row.purchasePricePerUnit !== null
                              ? row.purchasePricePerUnit.toFixed(2)
                              : "—"}
                          </TableCell>
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

      {/* Fuel type dialogs */}
      <Dialog open={createFuelTypeOpen} onOpenChange={setCreateFuelTypeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pumps.fuelTypes.create")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateFuelType} className="space-y-4">
            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="create-fueltype-name">
                {t("pumps.fuelTypes.form.name")}
              </Label>
              <Input
                id="create-fueltype-name"
                value={createFuelTypeName}
                onChange={(e) => setCreateFuelTypeName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-fueltype-sellingPrice">
                  {t("products.table.sellingPrice")}
                </Label>
                <Input
                  id="create-fueltype-sellingPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={createFuelTypeSellingPrice}
                  onChange={(e) =>
                    setCreateFuelTypeSellingPrice(e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-fueltype-purchasePrice">
                  {t("products.table.purchasePrice")}
                </Label>
                <Input
                  id="create-fueltype-purchasePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={createFuelTypePurchasePrice}
                  onChange={(e) =>
                    setCreateFuelTypePurchasePrice(e.target.value)
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="create-fueltype-active"
                checked={createFuelTypeActive}
                onChange={(e) => setCreateFuelTypeActive(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="create-fueltype-active">
                {t("pumps.form.active")}
              </Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateFuelTypeOpen(false)}
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

      <Dialog
        open={!!editFuelType}
        onOpenChange={(open) => !open && closeEditFuelType()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pumps.fuelTypes.edit")}</DialogTitle>
          </DialogHeader>
          {editFuelType && (
            <form onSubmit={handleEditFuelType} className="space-y-4">
              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-fueltype-name">
                  {t("pumps.fuelTypes.form.name")}
                </Label>
                <Input
                  id="edit-fueltype-name"
                  value={editFuelTypeName}
                  onChange={(e) => setEditFuelTypeName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-fueltype-sellingPrice">
                    {t("products.table.sellingPrice")}
                  </Label>
                  <Input
                    id="edit-fueltype-sellingPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editFuelTypeSellingPrice}
                    onChange={(e) =>
                      setEditFuelTypeSellingPrice(e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-fueltype-purchasePrice">
                    {t("products.table.purchasePrice")}
                  </Label>
                  <Input
                    id="edit-fueltype-purchasePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editFuelTypePurchasePrice}
                    onChange={(e) =>
                      setEditFuelTypePurchasePrice(e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-fueltype-active"
                  checked={editFuelTypeActive}
                  onChange={(e) => setEditFuelTypeActive(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="edit-fueltype-active">
                  {t("pumps.form.active")}
                </Label>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeEditFuelType}
                >
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

      {/* Tank dialogs */}
      <Dialog open={createTankOpen} onOpenChange={setCreateTankOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pumps.tanks.create")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTank} className="space-y-4">
            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="create-tank-name">
                {t("pumps.tanks.form.name")}
              </Label>
              <Input
                id="create-tank-name"
                value={createTankName}
                onChange={(e) => setCreateTankName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-tank-fuelType">
                {t("pumps.tanks.form.fuelType")}
              </Label>
              <select
                id="create-tank-fuelType"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={createTankFuelTypeId}
                onChange={(e) =>
                  setCreateTankFuelTypeId(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
              >
                <option value="">
                  {t("pumps.tanks.form.fuelTypePlaceholder")}
                </option>
                {fuelTypes.map((fuelType) => (
                  <option key={fuelType.id} value={fuelType.id}>
                    {fuelType.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-tank-capacity">
                {t("pumps.tanks.form.capacity")}
              </Label>
              <Input
                id="create-tank-capacity"
                type="number"
                min="0"
                step="0.001"
                value={createTankCapacity}
                onChange={(e) => setCreateTankCapacity(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="create-tank-active"
                checked={createTankActive}
                onChange={(e) => setCreateTankActive(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="create-tank-active">
                {t("pumps.form.active")}
              </Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateTankOpen(false)}
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

      <Dialog
        open={!!editTank}
        onOpenChange={(open) => !open && closeEditTank()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pumps.tanks.edit")}</DialogTitle>
          </DialogHeader>
          {editTank && (
            <form onSubmit={handleEditTank} className="space-y-4">
              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-tank-name">
                  {t("pumps.tanks.form.name")}
                </Label>
                <Input
                  id="edit-tank-name"
                  value={editTankName}
                  onChange={(e) => setEditTankName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tank-fuelType">
                  {t("pumps.tanks.form.fuelType")}
                </Label>
                <select
                  id="edit-tank-fuelType"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={editTankFuelTypeId}
                  onChange={(e) =>
                    setEditTankFuelTypeId(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                >
                  <option value="">
                    {t("pumps.tanks.form.fuelTypePlaceholder")}
                  </option>
                  {fuelTypes.map((fuelType) => (
                    <option key={fuelType.id} value={fuelType.id}>
                      {fuelType.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tank-capacity">
                  {t("pumps.tanks.form.capacity")}
                </Label>
                <Input
                  id="edit-tank-capacity"
                  type="number"
                  min="0"
                  step="0.001"
                  value={editTankCapacity}
                  onChange={(e) => setEditTankCapacity(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-tank-active"
                  checked={editTankActive}
                  onChange={(e) => setEditTankActive(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="edit-tank-active">
                  {t("pumps.form.active")}
                </Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeEditTank}>
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
    </PageLayout>
  )
}
