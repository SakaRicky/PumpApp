import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type {
  ProductResponse,
  WeeklyInventoryCloseResponse,
  WorkerResponse,
} from "@pumpapp/shared"
import { PageLayout } from "@/components/layout/PageLayout"
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
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/authContext"

type LineDraft = { productId: string; physicalQty: string }

export const WeeklyInventoryPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isAdmin = user?.role === "ADMIN"

  const [workers, setWorkers] = useState<WorkerResponse[]>([])
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [closes, setCloses] = useState<WeeklyInventoryCloseResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [weekStart, setWeekStart] = useState("")
  const [weekEnd, setWeekEnd] = useState("")
  const [workerId, setWorkerId] = useState("")
  const [enforcedShortfall, setEnforcedShortfall] = useState("")
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<LineDraft[]>([])

  const [exportMonth, setExportMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear().toString()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  })

  const load = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [w, p, c] = await Promise.all([
        api.getWorkers(),
        api.getProducts(),
        api.listWeeklyInventoryCloses(),
      ])
      setWorkers(w.filter((x) => x.active))
      setProducts(p.filter((x) => x.active))
      setCloses(c)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("weeklyInventory.loadError"))
    } finally {
      setLoading(false)
    }
  }, [isAdmin, t])

  useEffect(() => {
    void load()
  }, [load])

  const addLine = () => {
    setLines((prev) => [...prev, { productId: "", physicalQty: "" }])
  }

  const updateLine = (index: number, patch: Partial<LineDraft>) => {
    setLines((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    )
  }

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const wid = Number.parseInt(workerId, 10)
      const es = Number.parseFloat(enforcedShortfall)
      if (!weekStart || !weekEnd) {
        setSubmitError(t("weeklyInventory.errors.weekRequired"))
        setSubmitting(false)
        return
      }
      if (!Number.isFinite(wid) || wid <= 0) {
        setSubmitError(t("weeklyInventory.errors.workerRequired"))
        setSubmitting(false)
        return
      }
      if (!Number.isFinite(es)) {
        setSubmitError(t("weeklyInventory.errors.shortfallRequired"))
        setSubmitting(false)
        return
      }

      const parsedLines = lines
        .map((l) => ({
          productId: Number.parseInt(l.productId, 10),
          physicalQty: Number.parseFloat(l.physicalQty),
        }))
        .filter(
          (l) =>
            Number.isFinite(l.productId) &&
            l.productId > 0 &&
            Number.isFinite(l.physicalQty) &&
            l.physicalQty >= 0
        )

      await api.createWeeklyInventoryClose({
        weekStart,
        weekEnd,
        workerId: wid,
        enforcedShortfall: es,
        notes: notes || undefined,
        lines: parsedLines.length > 0 ? parsedLines : undefined,
      })
      setWeekStart("")
      setWeekEnd("")
      setWorkerId("")
      setEnforcedShortfall("")
      setNotes("")
      setLines([])
      await load()
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : t("weeklyInventory.saveError")
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleExport = async () => {
    setError(null)
    try {
      const csv = await api.downloadWeeklyInventoryCsv(exportMonth)
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `weekly-inventory-${exportMonth}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("weeklyInventory.exportError")
      )
    }
  }

  if (!isAdmin) {
    return (
      <PageLayout title={t("weeklyInventory.title")}>
        <p className="text-muted-foreground">
          {t("weeklyInventory.adminOnly")}
        </p>
      </PageLayout>
    )
  }

  return (
    <PageLayout title={t("weeklyInventory.title")}>
      <div className="max-w-4xl space-y-8">
        <p className="text-muted-foreground text-sm">
          {t("weeklyInventory.intro")}
        </p>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <section className="rounded-lg border p-4 space-y-3">
          <h2 className="font-semibold">{t("weeklyInventory.export.title")}</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="export-month">
                {t("weeklyInventory.export.month")}
              </Label>
              <Input
                id="export-month"
                type="month"
                value={exportMonth}
                onChange={(e) => setExportMonth(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleExport()}
            >
              {t("weeklyInventory.export.download")}
            </Button>
          </div>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="font-semibold mb-4">
            {t("weeklyInventory.form.title")}
          </h2>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="ws">
                  {t("weeklyInventory.form.weekStart")}
                </Label>
                <Input
                  id="ws"
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="we">{t("weeklyInventory.form.weekEnd")}</Label>
                <Input
                  id="we"
                  type="date"
                  value={weekEnd}
                  onChange={(e) => setWeekEnd(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("weeklyInventory.form.worker")}</Label>
              <Select value={workerId} onValueChange={setWorkerId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("weeklyInventory.form.workerPlaceholder")}
                  />
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
              <Label htmlFor="es">
                {t("weeklyInventory.form.enforcedShortfall")}
              </Label>
              <Input
                id="es"
                type="number"
                step="0.01"
                value={enforcedShortfall}
                onChange={(e) => setEnforcedShortfall(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wn">{t("weeklyInventory.form.notes")}</Label>
              <Input
                id="wn"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("weeklyInventory.form.lines")}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLine}
                >
                  {t("weeklyInventory.form.addLine")}
                </Button>
              </div>
              {lines.map((line, i) => (
                <div key={i} className="flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <Select
                      value={line.productId}
                      onValueChange={(v) => updateLine(i, { productId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "weeklyInventory.form.productPlaceholder"
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    className="w-32"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder={t("weeklyInventory.form.qty")}
                    value={line.physicalQty}
                    onChange={(e) =>
                      updateLine(i, { physicalQty: e.target.value })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLine(i)}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>

            <Button type="submit" disabled={submitting || loading}>
              {submitting ? t("auth.loading") : t("weeklyInventory.form.save")}
            </Button>
          </form>
        </section>

        <section>
          <h2 className="font-semibold mb-2">
            {t("weeklyInventory.list.title")}
          </h2>
          {loading ? (
            <p className="text-muted-foreground text-sm">{t("auth.loading")}</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("weeklyInventory.list.week")}</TableHead>
                    <TableHead>{t("weeklyInventory.list.worker")}</TableHead>
                    <TableHead>{t("weeklyInventory.list.enforced")}</TableHead>
                    <TableHead>{t("weeklyInventory.list.dailySum")}</TableHead>
                    <TableHead>{t("weeklyInventory.list.notes")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closes.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        {c.weekStart} → {c.weekEnd}
                      </TableCell>
                      <TableCell>{c.workerName}</TableCell>
                      <TableCell>{c.enforcedShortfall.toFixed(2)}</TableCell>
                      <TableCell>
                        {c.sumDailyCashShortfalls.toFixed(2)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {c.notes ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  )
}
