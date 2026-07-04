import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type {
  UserResponse,
  WorkerResponse,
  WorkerShortageLedgerResponse,
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
import { cn } from "@/lib/utils"

const formatNumber = (n: number): string =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)

const todayInputValue = (): string => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export const WorkersPage = () => {
  const { t } = useTranslation()
  const [workers, setWorkers] = useState<WorkerResponse[]>([])
  const [users, setUsers] = useState<UserResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [editWorker, setEditWorker] = useState<WorkerResponse | null>(null)

  const [createName, setCreateName] = useState("")
  const [createDesignation, setCreateDesignation] = useState("")

  const [editName, setEditName] = useState("")
  const [editDesignation, setEditDesignation] = useState("")
  const [editActive, setEditActive] = useState(true)

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [ledgerWorker, setLedgerWorker] = useState<WorkerResponse | null>(null)
  const [ledger, setLedger] = useState<WorkerShortageLedgerResponse | null>(
    null
  )
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [settleDate, setSettleDate] = useState(todayInputValue())
  const [settleAmount, setSettleAmount] = useState("")
  const [settleNotes, setSettleNotes] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [workersRes, usersRes] = await Promise.all([
        api.getWorkers(),
        api.getUsers(),
      ])
      setWorkers(workersRes)
      setUsers(usersRes)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t("workers.errorLoad"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const hasAccount = (workerId: number) =>
    users.some((u) => u.workerId === workerId)

  const openCreate = () => {
    setCreateName("")
    setCreateDesignation("")
    setSubmitError(null)
    setCreateOpen(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createName.trim()) {
      setSubmitError("Name is required.")
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.createWorker({
        name: createName.trim(),
        designation: createDesignation.trim() || undefined,
      })
      setCreateOpen(false)
      await load()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t("workers.errorCreate"))
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (worker: WorkerResponse) => {
    setEditWorker(worker)
    setEditName(worker.name)
    setEditDesignation(worker.designation ?? "")
    setEditActive(worker.active)
    setSubmitError(null)
  }

  const closeEdit = () => {
    setEditWorker(null)
    setSubmitError(null)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editWorker) return
    if (!editName.trim()) {
      setSubmitError("Name is required.")
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.updateWorker(editWorker.id, {
        name: editName.trim(),
        designation: editDesignation.trim() || undefined,
        active: editActive,
      })
      closeEdit()
      await load()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t("workers.errorUpdate"))
    } finally {
      setSubmitting(false)
    }
  }

  const openLedger = async (worker: WorkerResponse) => {
    setLedgerWorker(worker)
    setLedger(null)
    setSettleDate(todayInputValue())
    setSettleAmount("")
    setSettleNotes("")
    setSubmitError(null)
    setLedgerLoading(true)
    try {
      setLedger(await api.getWorkerShortageLedger(worker.id))
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t("workers.errorLoad"))
    } finally {
      setLedgerLoading(false)
    }
  }

  const closeLedger = () => {
    setLedgerWorker(null)
    setLedger(null)
    setSubmitError(null)
  }

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ledgerWorker) return
    const amount = Number(settleAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setSubmitError(t("workers.shortages.invalidAmount"))
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.createShortageSettlement({
        workerId: ledgerWorker.id,
        date: settleDate,
        amount,
        notes: settleNotes.trim() || null,
      })
      setSettleAmount("")
      setSettleNotes("")
      setLedger(await api.getWorkerShortageLedger(ledgerWorker.id))
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : t("workers.errorUpdate")
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageLayout title={t("workers.title")}>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">{t("workers.intro")}</p>
          <Button onClick={openCreate}>{t("workers.addWorker")}</Button>
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <p className="text-muted-foreground">{t("auth.loading")}</p>
        ) : workers.length === 0 ? (
          <p className="text-muted-foreground">{t("workers.noWorkers")}</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("workers.table.id")}</TableHead>
                  <TableHead>{t("workers.table.name")}</TableHead>
                  <TableHead>{t("workers.table.designation")}</TableHead>
                  <TableHead>{t("workers.table.active")}</TableHead>
                  <TableHead>{t("workers.table.hasAccount")}</TableHead>
                  <TableHead className="w-[100px]">
                    {t("workers.editWorker")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.map((worker) => (
                  <TableRow key={worker.id}>
                    <TableCell>{worker.id}</TableCell>
                    <TableCell>{worker.name}</TableCell>
                    <TableCell>{worker.designation ?? "—"}</TableCell>
                    <TableCell>
                      {worker.active
                        ? t("workers.activeYes")
                        : t("workers.activeNo")}
                    </TableCell>
                    <TableCell>
                      {hasAccount(worker.id)
                        ? t("workers.hasAccountYes")
                        : t("workers.hasAccountNo")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(worker)}
                        >
                          {t("workers.editWorker")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openLedger(worker)}
                        >
                          {t("workers.shortages.button")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("workers.createWorker")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="create-name">{t("workers.form.name")}</Label>
              <Input
                id="create-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-designation">
                {t("workers.form.designation")}
              </Label>
              <Input
                id="create-designation"
                value={createDesignation}
                onChange={(e) => setCreateDesignation(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                {t("workers.cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("auth.loading") : t("workers.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editWorker} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("workers.editWorker")}</DialogTitle>
          </DialogHeader>
          {editWorker && (
            <form onSubmit={handleEdit} className="space-y-4">
              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-name">{t("workers.form.name")}</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-designation">
                  {t("workers.form.designation")}
                </Label>
                <Input
                  id="edit-designation"
                  value={editDesignation}
                  onChange={(e) => setEditDesignation(e.target.value)}
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
                <Label htmlFor="edit-active">{t("workers.form.active")}</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeEdit}>
                  {t("workers.cancel")}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? t("auth.loading") : t("workers.save")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!ledgerWorker}
        onOpenChange={(open) => !open && closeLedger()}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t("workers.shortages.title", { name: ledgerWorker?.name ?? "" })}
            </DialogTitle>
          </DialogHeader>
          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          {ledgerLoading ? (
            <p className="text-muted-foreground">{t("auth.loading")}</p>
          ) : ledger ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("workers.shortages.charges")}
                  </p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatNumber(ledger.chargesTotal)}
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("workers.shortages.settlements")}
                  </p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatNumber(ledger.settlementsTotal)}
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("workers.shortages.balance")}
                  </p>
                  <p
                    className={cn(
                      "text-lg font-semibold tabular-nums",
                      ledger.balance > 0 && "text-red-600",
                      ledger.balance < 0 && "text-green-600"
                    )}
                  >
                    {formatNumber(ledger.balance)}
                  </p>
                </div>
              </div>

              {ledger.entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("workers.shortages.empty")}
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("workers.shortages.date")}</TableHead>
                        <TableHead>{t("workers.shortages.kind")}</TableHead>
                        <TableHead className="text-right">
                          {t("workers.shortages.amount")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("workers.shortages.balanceAfter")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledger.entries.map((entry) => (
                        <TableRow key={`${entry.kind}-${entry.id}`}>
                          <TableCell>
                            {new Date(entry.date).toLocaleDateString("fr-FR")}
                          </TableCell>
                          <TableCell>
                            {entry.kind === "charge"
                              ? t("workers.shortages.charge")
                              : t("workers.shortages.settlement")}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right tabular-nums",
                              entry.kind === "charge"
                                ? "text-red-600"
                                : "text-green-600"
                            )}
                          >
                            {entry.kind === "charge" ? "+" : "−"}
                            {formatNumber(entry.amount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatNumber(entry.balanceAfter)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <form onSubmit={handleSettle} className="space-y-3 border-t pt-3">
                <p className="text-sm font-medium">
                  {t("workers.shortages.settleTitle")}
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="settle-date">
                      {t("workers.shortages.date")}
                    </Label>
                    <Input
                      id="settle-date"
                      type="date"
                      value={settleDate}
                      onChange={(e) => setSettleDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="settle-amount">
                      {t("workers.shortages.amount")}
                    </Label>
                    <Input
                      id="settle-amount"
                      type="number"
                      min="1"
                      step="1"
                      value={settleAmount}
                      onChange={(e) => setSettleAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="settle-notes">
                      {t("workers.shortages.notes")}
                    </Label>
                    <Input
                      id="settle-notes"
                      value={settleNotes}
                      onChange={(e) => setSettleNotes(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={submitting}>
                    {submitting
                      ? t("auth.loading")
                      : t("workers.shortages.settle")}
                  </Button>
                </div>
              </form>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
