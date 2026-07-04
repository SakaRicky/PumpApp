import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type {
  CashDepositResponse,
  ExpenseResponse,
  SafeBalanceResponse,
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
import { StatCard } from "@/components/ui/stat-card"
import { Banknote, Scale, Package, CheckCircle } from "@/components/icons"
import { api } from "@/lib/api"

const formatNumber = (n: number): string =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

const toDateInputValue = (iso: string): string => iso.slice(0, 10)

const todayInputValue = (): string => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

interface ExpenseForm {
  date: string
  category: string
  amount: string
  paidBy: string
  description: string
}

interface DepositForm {
  date: string
  amount: string
  destination: string
  reference: string
  notes: string
}

const emptyExpenseForm = (): ExpenseForm => ({
  date: todayInputValue(),
  category: "",
  amount: "",
  paidBy: "",
  description: "",
})

const emptyDepositForm = (): DepositForm => ({
  date: todayInputValue(),
  amount: "",
  destination: "",
  reference: "",
  notes: "",
})

export const MoneyPage = () => {
  const { t } = useTranslation()

  const [safeBalance, setSafeBalance] = useState<SafeBalanceResponse | null>(
    null
  )
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([])
  const [deposits, setDeposits] = useState<CashDepositResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseResponse | null>(
    null
  )
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(
    emptyExpenseForm()
  )

  const [depositDialogOpen, setDepositDialogOpen] = useState(false)
  const [editingDeposit, setEditingDeposit] =
    useState<CashDepositResponse | null>(null)
  const [depositForm, setDepositForm] = useState<DepositForm>(
    emptyDepositForm()
  )

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [dashboard, expenseRows, depositRows] = await Promise.all([
        api.getDashboard(),
        api.getExpenses(),
        api.getCashDeposits(),
      ])
      setSafeBalance(dashboard.safeBalance)
      setExpenses(expenseRows)
      setDeposits(depositRows)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t("money.errors.load"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const openExpenseCreate = () => {
    setEditingExpense(null)
    setExpenseForm(emptyExpenseForm())
    setSubmitError(null)
    setExpenseDialogOpen(true)
  }

  const openExpenseEdit = (row: ExpenseResponse) => {
    setEditingExpense(row)
    setExpenseForm({
      date: toDateInputValue(row.date),
      category: row.category,
      amount: String(row.amount),
      paidBy: row.paidBy ?? "",
      description: row.description ?? "",
    })
    setSubmitError(null)
    setExpenseDialogOpen(true)
  }

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(expenseForm.amount)
    if (!expenseForm.category.trim() || !Number.isFinite(amount) || amount <= 0) {
      setSubmitError(t("money.errors.invalidForm"))
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const body = {
        date: expenseForm.date,
        category: expenseForm.category.trim(),
        amount,
        paidBy: expenseForm.paidBy.trim() || null,
        description: expenseForm.description.trim() || null,
      }
      if (editingExpense) {
        await api.updateExpense(editingExpense.id, body)
      } else {
        await api.createExpense(body)
      }
      setExpenseDialogOpen(false)
      await load()
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : t("money.errors.save")
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleExpenseDelete = async (row: ExpenseResponse) => {
    if (!window.confirm(t("money.expenses.confirmDelete"))) return
    try {
      await api.deleteExpense(row.id)
      await load()
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t("money.errors.save"))
    }
  }

  const openDepositCreate = () => {
    setEditingDeposit(null)
    setDepositForm(emptyDepositForm())
    setSubmitError(null)
    setDepositDialogOpen(true)
  }

  const openDepositEdit = (row: CashDepositResponse) => {
    setEditingDeposit(row)
    setDepositForm({
      date: toDateInputValue(row.date),
      amount: String(row.amount),
      destination: row.destination,
      reference: row.reference ?? "",
      notes: row.notes ?? "",
    })
    setSubmitError(null)
    setDepositDialogOpen(true)
  }

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(depositForm.amount)
    if (
      !depositForm.destination.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setSubmitError(t("money.errors.invalidForm"))
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const body = {
        date: depositForm.date,
        amount,
        destination: depositForm.destination.trim(),
        reference: depositForm.reference.trim() || null,
        notes: depositForm.notes.trim() || null,
      }
      if (editingDeposit) {
        await api.updateCashDeposit(editingDeposit.id, body)
      } else {
        await api.createCashDeposit(body)
      }
      setDepositDialogOpen(false)
      await load()
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : t("money.errors.save")
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleDepositDelete = async (row: CashDepositResponse) => {
    if (!window.confirm(t("money.deposits.confirmDelete"))) return
    try {
      await api.deleteCashDeposit(row.id)
      await load()
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t("money.errors.save"))
    }
  }

  return (
    <PageLayout title={t("money.title")} subtitle={t("money.subtitle")}>
      <div className="space-y-6">
        {loadError && (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <p className="text-muted-foreground">{t("auth.loading")}</p>
        ) : (
          <>
            {safeBalance && (
              <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                  icon={Banknote}
                  tone="green"
                  label={t("money.safe.cashCollected")}
                  value={formatNumber(safeBalance.cashCollected)}
                />
                <StatCard
                  icon={Scale}
                  tone="red"
                  label={t("money.safe.expensesTotal")}
                  value={
                    safeBalance.expensesTotal > 0
                      ? `−${formatNumber(safeBalance.expensesTotal)}`
                      : "0"
                  }
                />
                <StatCard
                  icon={Package}
                  tone="blue"
                  label={t("money.safe.depositsTotal")}
                  value={
                    safeBalance.depositsTotal > 0
                      ? `−${formatNumber(safeBalance.depositsTotal)}`
                      : "0"
                  }
                />
                <StatCard
                  icon={CheckCircle}
                  tone={safeBalance.balance < 0 ? "red" : "green"}
                  label={t("money.safe.balance")}
                  value={formatNumber(safeBalance.balance)}
                />
              </section>
            )}

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">
                  {t("money.expenses.title")}
                </h2>
                <Button onClick={openExpenseCreate}>
                  {t("money.expenses.add")}
                </Button>
              </div>
              {expenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("money.expenses.empty")}
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("money.table.date")}</TableHead>
                        <TableHead>{t("money.expenses.category")}</TableHead>
                        <TableHead className="text-right">
                          {t("money.table.amount")}
                        </TableHead>
                        <TableHead>{t("money.expenses.paidBy")}</TableHead>
                        <TableHead>{t("money.expenses.description")}</TableHead>
                        <TableHead className="w-[160px]">
                          {t("money.table.actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{formatDate(row.date)}</TableCell>
                          <TableCell>{row.category}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatNumber(row.amount)}
                          </TableCell>
                          <TableCell>{row.paidBy ?? "—"}</TableCell>
                          <TableCell>{row.description ?? "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openExpenseEdit(row)}
                              >
                                {t("money.table.edit")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExpenseDelete(row)}
                              >
                                {t("money.table.delete")}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">
                  {t("money.deposits.title")}
                </h2>
                <Button onClick={openDepositCreate}>
                  {t("money.deposits.add")}
                </Button>
              </div>
              {deposits.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("money.deposits.empty")}
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("money.table.date")}</TableHead>
                        <TableHead className="text-right">
                          {t("money.table.amount")}
                        </TableHead>
                        <TableHead>{t("money.deposits.destination")}</TableHead>
                        <TableHead>{t("money.deposits.reference")}</TableHead>
                        <TableHead className="w-[160px]">
                          {t("money.table.actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deposits.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{formatDate(row.date)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatNumber(row.amount)}
                          </TableCell>
                          <TableCell>{row.destination}</TableCell>
                          <TableCell>{row.reference ?? "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDepositEdit(row)}
                              >
                                {t("money.table.edit")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDepositDelete(row)}
                              >
                                {t("money.table.delete")}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingExpense
                ? t("money.expenses.editTitle")
                : t("money.expenses.createTitle")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="expense-date">{t("money.table.date")}</Label>
              <Input
                id="expense-date"
                type="date"
                value={expenseForm.date}
                onChange={(e) =>
                  setExpenseForm((f) => ({ ...f, date: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-category">
                {t("money.expenses.category")}
              </Label>
              <Input
                id="expense-category"
                value={expenseForm.category}
                onChange={(e) =>
                  setExpenseForm((f) => ({ ...f, category: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-amount">{t("money.table.amount")}</Label>
              <Input
                id="expense-amount"
                type="number"
                min="1"
                step="1"
                value={expenseForm.amount}
                onChange={(e) =>
                  setExpenseForm((f) => ({ ...f, amount: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-paid-by">
                {t("money.expenses.paidBy")}
              </Label>
              <Input
                id="expense-paid-by"
                value={expenseForm.paidBy}
                onChange={(e) =>
                  setExpenseForm((f) => ({ ...f, paidBy: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-description">
                {t("money.expenses.description")}
              </Label>
              <Input
                id="expense-description"
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm((f) => ({
                    ...f,
                    description: e.target.value,
                  }))
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setExpenseDialogOpen(false)}
              >
                {t("money.cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("auth.loading") : t("money.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDeposit
                ? t("money.deposits.editTitle")
                : t("money.deposits.createTitle")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDepositSubmit} className="space-y-4">
            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="deposit-date">{t("money.table.date")}</Label>
              <Input
                id="deposit-date"
                type="date"
                value={depositForm.date}
                onChange={(e) =>
                  setDepositForm((f) => ({ ...f, date: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deposit-amount">{t("money.table.amount")}</Label>
              <Input
                id="deposit-amount"
                type="number"
                min="1"
                step="1"
                value={depositForm.amount}
                onChange={(e) =>
                  setDepositForm((f) => ({ ...f, amount: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deposit-destination">
                {t("money.deposits.destination")}
              </Label>
              <Input
                id="deposit-destination"
                value={depositForm.destination}
                onChange={(e) =>
                  setDepositForm((f) => ({
                    ...f,
                    destination: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deposit-reference">
                {t("money.deposits.reference")}
              </Label>
              <Input
                id="deposit-reference"
                value={depositForm.reference}
                onChange={(e) =>
                  setDepositForm((f) => ({ ...f, reference: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deposit-notes">{t("money.deposits.notes")}</Label>
              <Input
                id="deposit-notes"
                value={depositForm.notes}
                onChange={(e) =>
                  setDepositForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDepositDialogOpen(false)}
              >
                {t("money.cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("auth.loading") : t("money.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
