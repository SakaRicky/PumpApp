import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"
import type { DashboardResponse } from "@pumpapp/shared"
import { PageLayout } from "@/components/layout/PageLayout"
import { StatCard } from "@/components/ui/stat-card"
import { ProgressBar } from "@/components/ui/progress-bar"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import {
  AlertCircle,
  Banknote,
  BarChart3,
  CalendarClock,
  CheckCircle,
  ClipboardList,
  Fuel,
  Package,
  Scale,
} from "@/components/icons"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/authContext"

const formatNumber = (n: number): string =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })

const Card = ({
  title,
  children,
  action,
  className,
}: {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}) => (
  <section
    className={cn("rounded-xl border bg-card p-5 shadow-sm", className)}
  >
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      {action}
    </div>
    {children}
  </section>
)

export const HomePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [quickOpening, setQuickOpening] = useState(false)

  const loadDashboard = useCallback((cancelled?: () => boolean) => {
    setLoading(true)
    setError(null)
    return api
      .getDashboard()
      .then((d) => {
        if (!cancelled?.()) setData(d)
      })
      .catch((e: unknown) => {
        if (!cancelled?.()) {
          setError(e instanceof Error ? e.message : String(e))
        }
      })
      .finally(() => {
        if (!cancelled?.()) setLoading(false)
      })
  }, [])

  useEffect(() => {
    let cancelled = false
    void loadDashboard(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [loadDashboard])

  const handleQuickOpen = async () => {
    setQuickOpening(true)
    setError(null)
    try {
      await api.quickOpenShift()
      await loadDashboard()
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      if (message.includes("already exists")) {
        navigate("/shifts")
      } else {
        setError(message)
      }
    } finally {
      setQuickOpening(false)
    }
  }

  return (
    <PageLayout title={t("home.title")} subtitle={t("home.subtitle")}>
      {loading && <p className="text-muted-foreground">{t("home.loading")}</p>}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}
      {data && (
        <div className="flex flex-col gap-5">
          <Card title={t("home.actions.title")}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {data.today.currentShiftId === null ? (
                <Button onClick={handleQuickOpen} disabled={quickOpening}>
                  <CalendarClock aria-hidden />
                  {quickOpening
                    ? t("auth.loading")
                    : t("home.actions.openShift")}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() =>
                    navigate(`/shifts/${data.today.currentShiftId}/close`)
                  }
                >
                  <ClipboardList aria-hidden />
                  {t("home.actions.enterReadings")}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/reconciliation")}
              >
                <Scale aria-hidden />
                {t("home.actions.reconcile", {
                  count: data.pendingReconciliations.length,
                })}
              </Button>
              {user?.role === "ADMIN" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/money")}
                  >
                    <Banknote aria-hidden />
                    {t("home.actions.expense")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/money")}
                  >
                    <CheckCircle aria-hidden />
                    {t("home.actions.deposit")}
                  </Button>
                </>
              )}
            </div>
          </Card>

          {/* Today stat row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard
              icon={Fuel}
              tone="green"
              label={t("home.today.fuelVolume")}
              value={`${formatNumber(data.today.fuelVolume)} L`}
            />
            <StatCard
              icon={BarChart3}
              tone="blue"
              label={t("home.today.fuelRevenue")}
              value={
                data.today.fuelRevenue !== null
                  ? formatNumber(data.today.fuelRevenue)
                  : t("home.today.unknown")
              }
              hint={
                data.today.fuelRevenue === null
                  ? t("home.today.missingPrice")
                  : undefined
              }
              hintTone="warn"
            />
            <StatCard
              icon={Package}
              tone="orange"
              label={t("home.today.shopRevenue")}
              value={formatNumber(data.today.shopRevenue)}
            />
            <StatCard
              icon={Banknote}
              tone="green"
              label={t("home.today.cashHandedIn")}
              value={formatNumber(data.today.cashHandedIn)}
              hint={t("home.today.shifts", {
                reconciled: data.today.shiftsReconciled,
                total: data.today.shiftsTotal,
              })}
            />
            <StatCard
              icon={Scale}
              tone="red"
              label={t("home.today.expenses")}
              value={formatNumber(data.today.expenses)}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            {/* Pending reconciliations — the anti-theft early-warning queue */}
            <Card
              title={t("home.pending.title")}
              className="xl:col-span-2"
              action={
                <Link
                  to="/reconciliation"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {t("home.pending.goto")}
                </Link>
              }
            >
              {data.staleOpenShifts.length === 0 &&
              data.pendingReconciliations.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg bg-accent p-3 text-sm text-accent-foreground">
                  <CheckCircle className="size-4 text-emerald-600" aria-hidden />
                  {t("home.pending.empty")}
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.staleOpenShifts.length > 0 && (
                    <li className="pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("home.pending.staleTitle")}
                    </li>
                  )}
                  {data.staleOpenShifts.map((shift) => (
                    <li key={`stale-${shift.shiftId}`}>
                      <Link
                        to="/shifts"
                        className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm transition-colors hover:bg-red-100"
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="flex size-8 items-center justify-center rounded-lg bg-red-100 text-red-700">
                            <CalendarClock className="size-4" aria-hidden />
                          </span>
                          <span className="font-medium text-red-950">
                            {t("home.pending.staleItem", {
                              id: shift.shiftId,
                              date: formatDate(shift.date),
                            })}
                          </span>
                        </span>
                        <StatusBadge tone="red">
                          {t("home.pending.age", { count: shift.ageDays })}
                        </StatusBadge>
                      </Link>
                    </li>
                  ))}
                  {data.pendingReconciliations.length > 0 &&
                    data.staleOpenShifts.length > 0 && (
                      <li className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("home.pending.reconciliationTitle")}
                      </li>
                    )}
                  {data.pendingReconciliations.map((shift) => (
                    <li key={shift.shiftId}>
                      <Link
                        to="/reconciliation"
                        className="flex items-center justify-between gap-3 rounded-lg border bg-background/60 px-3 py-2.5 text-sm transition-colors hover:bg-accent"
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "flex size-8 items-center justify-center rounded-lg",
                              shift.ageDays >= 3
                                ? "bg-red-50 text-red-600"
                                : shift.ageDays >= 1
                                  ? "bg-orange-50 text-orange-600"
                                  : "bg-emerald-50 text-emerald-700"
                            )}
                          >
                            <CalendarClock className="size-4" aria-hidden />
                          </span>
                          <span className="font-medium">
                            {t("home.pending.item", {
                              id: shift.shiftId,
                              date: formatDate(shift.date),
                            })}
                          </span>
                        </span>
                        <StatusBadge
                          tone={
                            shift.ageDays >= 3
                              ? "red"
                              : shift.ageDays >= 1
                                ? "orange"
                                : "neutral"
                          }
                        >
                          {t("home.pending.age", { count: shift.ageDays })}
                        </StatusBadge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Safe balance */}
            <Card title={t("home.safe.title")}>
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("home.safe.balance")}
                  </p>
                  <p
                    className={cn(
                      "text-3xl font-bold tracking-tight tabular-nums",
                      data.safeBalance.balance < 0 && "text-red-600"
                    )}
                  >
                    {formatNumber(data.safeBalance.balance)}
                  </p>
                </div>
                <dl className="space-y-2 border-t pt-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">
                      {t("home.safe.cashCollected")}
                    </dt>
                    <dd className="font-medium tabular-nums">
                      {formatNumber(data.safeBalance.cashCollected)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">
                      {t("home.safe.expensesTotal")}
                    </dt>
                    <dd
                      className={cn(
                        "font-medium tabular-nums",
                        data.safeBalance.expensesTotal > 0 && "text-red-600"
                      )}
                    >
                      {data.safeBalance.expensesTotal > 0
                        ? `−${formatNumber(data.safeBalance.expensesTotal)}`
                        : "0"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">
                      {t("home.safe.depositsTotal")}
                    </dt>
                    <dd
                      className={cn(
                        "font-medium tabular-nums",
                        data.safeBalance.depositsTotal > 0 && "text-red-600"
                      )}
                    >
                      {data.safeBalance.depositsTotal > 0
                        ? `−${formatNumber(data.safeBalance.depositsTotal)}`
                        : "0"}
                    </dd>
                  </div>
                </dl>
              </div>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            {/* Tank levels */}
            <Card title={t("home.tanks.title")} className="xl:col-span-2">
              {data.tanks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("home.tanks.empty")}
                </p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {data.tanks.map((tank) => {
                    const percent =
                      tank.capacity && tank.capacity > 0
                        ? ((tank.theoreticalQuantity ?? 0) / tank.capacity) * 100
                        : null
                    return (
                      <li key={tank.id}>
                        <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                          <span className="flex items-center gap-2 font-medium">
                            {tank.name}
                            <span className="text-xs text-muted-foreground">
                              {tank.fuelTypeName}
                            </span>
                            {tank.withinTolerance === false && (
                              <StatusBadge tone="red">
                                <AlertCircle className="size-3" aria-hidden />
                                {t("home.tanks.toleranceExceeded")}
                              </StatusBadge>
                            )}
                          </span>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {formatNumber(tank.theoreticalQuantity ?? 0)}
                            {tank.capacity
                              ? ` / ${formatNumber(tank.capacity)} L`
                              : " L"}
                            {percent !== null && (
                              <span className="ml-2 font-semibold text-foreground">
                                {percent.toFixed(0)}%
                              </span>
                            )}
                          </span>
                        </div>
                        <ProgressBar percent={percent ?? 0} />
                        {tank.varianceQuantity !== null && (
                          <p
                            className={cn(
                              "mt-1 text-[11px] tabular-nums",
                              tank.varianceQuantity < 0
                                ? "text-red-600"
                                : "text-emerald-600"
                            )}
                          >
                            {t("home.tanks.variance", {
                              value: formatNumber(tank.varianceQuantity),
                            })}
                          </p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>

            {/* Recent discrepancies */}
            <Card title={t("home.discrepancies.title")}>
              {data.recentDiscrepancies.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("home.discrepancies.empty")}
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.recentDiscrepancies.map((row) => (
                    <li
                      key={row.shiftId}
                      className="flex items-center justify-between gap-2 rounded-lg border bg-background/60 px-3 py-2 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {t("home.discrepancies.item", {
                          id: row.shiftId,
                          date: formatDate(row.date),
                        })}
                      </span>
                      <StatusBadge
                        tone={
                          row.discrepancyAmount > 0
                            ? "red"
                            : row.discrepancyAmount < 0
                              ? "orange"
                              : "green"
                        }
                      >
                        {row.discrepancyAmount > 0
                          ? t("home.discrepancies.short", {
                              value: formatNumber(row.discrepancyAmount),
                            })
                          : row.discrepancyAmount < 0
                            ? t("home.discrepancies.over", {
                                value: formatNumber(
                                  Math.abs(row.discrepancyAmount)
                                ),
                              })
                            : t("home.discrepancies.balanced")}
                      </StatusBadge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
