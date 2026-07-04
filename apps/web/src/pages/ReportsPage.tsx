import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type {
  DailyReportRow,
  EventResponse,
  ShiftReportRow,
  TankVarianceReportResponse,
  TankResponse,
} from "@pumpapp/shared"
import { EventType } from "@pumpapp/shared"
import { PageLayout } from "@/components/layout/PageLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  StatusBadge,
  shiftStatusBadgeTone,
} from "@/components/ui/status-badge"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

const formatNumber = (n: number | null): string =>
  n === null
    ? "—"
    : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

const downloadCsv = (csv: string, filename: string): void => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const defaultFrom = (): string => {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}
const defaultTo = (): string => new Date().toISOString().slice(0, 10)

// Chart specs per the dataviz method: 2px line, ≥8px markers with a 2px
// surface ring, hairline solid gridlines, single validated hue.
const CHART_LINE = "#2563eb"

interface ChartPoint {
  x: number
  y: number
  label: string
  value: number
}

const VarianceChart = ({ report }: { report: TankVarianceReportResponse }) => {
  const { t } = useTranslation()
  const [hover, setHover] = useState<ChartPoint | null>(null)

  const width = 640
  const height = 240
  const pad = useMemo(() => ({ top: 16, right: 64, bottom: 28, left: 56 }), [])

  const data = useMemo(
    () => report.rows.filter((r) => r.cumulativeVariance !== null),
    [report]
  )

  const { points, min, max } = useMemo(() => {
    if (data.length === 0) {
      return { points: [] as ChartPoint[], min: 0, max: 0 }
    }
    const values = data.map((r) => r.cumulativeVariance as number)
    const lo = Math.min(0, ...values)
    const hi = Math.max(0, ...values)
    const span = hi - lo || 1
    const innerW = width - pad.left - pad.right
    const innerH = height - pad.top - pad.bottom
    const pts = data.map((r, i) => ({
      x:
        pad.left +
        (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
      y:
        pad.top +
        innerH -
        (((r.cumulativeVariance as number) - lo) / span) * innerH,
      label: formatDate(r.measuredAt),
      value: r.cumulativeVariance as number,
    }))
    return { points: pts, min: lo, max: hi }
  }, [data, pad])

  if (points.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("reports.variance.noData")}
      </p>
    )
  }

  const span = max - min || 1
  const zeroY = pad.top + (height - pad.top - pad.bottom) * (1 - (0 - min) / span)
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ")
  const last = points[points.length - 1]
  const tooltipX = hover ? Math.min(hover.x + 8, width - 150) : 0
  const tooltipY = hover ? Math.max(hover.y - 34, 4) : 0

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[480px] max-w-full"
        role="img"
        aria-label={t("reports.variance.chartAria", { tank: report.tankName })}
        onMouseLeave={() => setHover(null)}
      >
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={pad.left}
            x2={width - pad.right}
            y1={pad.top + (height - pad.top - pad.bottom) * f}
            y2={pad.top + (height - pad.top - pad.bottom) * f}
            stroke="#e5e5e2"
            strokeWidth="1"
          />
        ))}
        <line
          x1={pad.left}
          x2={width - pad.right}
          y1={zeroY}
          y2={zeroY}
          stroke="#a3a3a0"
          strokeWidth="1"
        />
        <text
          x={pad.left - 8}
          y={zeroY + 4}
          textAnchor="end"
          className="fill-muted-foreground"
          fontSize="11"
        >
          0
        </text>
        <text
          x={pad.left - 8}
          y={pad.top + 4}
          textAnchor="end"
          className="fill-muted-foreground"
          fontSize="11"
        >
          {formatNumber(max)}
        </text>
        <text
          x={pad.left - 8}
          y={height - pad.bottom + 4}
          textAnchor="end"
          className="fill-muted-foreground"
          fontSize="11"
        >
          {formatNumber(min)}
        </text>
        <path
          d={path}
          fill="none"
          stroke={CHART_LINE}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="6" fill="#fcfcfb" />
            <circle cx={p.x} cy={p.y} r="4" fill={CHART_LINE} />
            <circle
              cx={p.x}
              cy={p.y}
              r="12"
              fill="transparent"
              onMouseEnter={() => setHover(p)}
            />
          </g>
        ))}
        {hover && (
          <g pointerEvents="none">
            <line
              x1={hover.x}
              x2={hover.x}
              y1={pad.top}
              y2={height - pad.bottom}
              stroke="#a3a3a0"
              strokeWidth="1"
            />
            <rect
              x={tooltipX}
              y={tooltipY}
              width="142"
              height="30"
              rx="4"
              fill="#1f1f1e"
              opacity="0.92"
            />
            <text x={tooltipX + 8} y={tooltipY + 13} fill="#fcfcfb" fontSize="10">
              {hover.label}
            </text>
            <text
              x={tooltipX + 8}
              y={tooltipY + 25}
              fill="#fcfcfb"
              fontSize="11"
              fontWeight="600"
            >
              {formatNumber(hover.value)} L
            </text>
          </g>
        )}
        {!hover && (
          <text
            x={last.x + 10}
            y={last.y + 4}
            fontSize="11"
            fontWeight="600"
            className="fill-foreground"
          >
            {formatNumber(last.value)} L
          </text>
        )}
        <text
          x={points[0].x}
          y={height - 8}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="11"
        >
          {points[0].label}
        </text>
        {points.length > 1 && (
          <text
            x={last.x}
            y={height - 8}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize="11"
          >
            {last.label}
          </text>
        )}
      </svg>
    </div>
  )
}

type Tab = "shifts" | "daily" | "variance" | "audit"

export const ReportsPage = () => {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>("shifts")
  const [from, setFrom] = useState(defaultFrom())
  const [to, setTo] = useState(defaultTo())
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [shiftRows, setShiftRows] = useState<ShiftReportRow[]>([])
  const [dailyRows, setDailyRows] = useState<DailyReportRow[]>([])

  const [tanks, setTanks] = useState<TankResponse[]>([])
  const [tankId, setTankId] = useState<number | null>(null)
  const [varianceReport, setVarianceReport] =
    useState<TankVarianceReportResponse | null>(null)

  const [events, setEvents] = useState<EventResponse[]>([])
  const [eventsTotal, setEventsTotal] = useState(0)
  const [eventType, setEventType] = useState<string>("ALL")
  const [eventOffset, setEventOffset] = useState(0)
  const EVENT_PAGE = 25

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (tab === "shifts") {
        setShiftRows(await api.getShiftReport({ from, to }))
      } else if (tab === "daily") {
        setDailyRows(await api.getDailyReport({ from, to }))
      } else if (tab === "variance") {
        let list = tanks
        if (list.length === 0) {
          list = await api.getTanks()
          setTanks(list)
        }
        const id = tankId ?? list[0]?.id ?? null
        if (id !== null) {
          if (tankId === null) setTankId(id)
          setVarianceReport(await api.getTankVarianceReport(id, { from, to }))
        }
      } else {
        const res = await api.getEvents({
          ...(eventType !== "ALL" && { type: eventType as EventType }),
          limit: EVENT_PAGE,
          offset: eventOffset,
        })
        setEvents(res.items)
        setEventsTotal(res.total)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("reports.errors.load"))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, from, to, tankId, eventType, eventOffset, t])

  useEffect(() => {
    load()
  }, [load])

  const handleCsv = async () => {
    try {
      if (tab === "shifts") {
        downloadCsv(
          await api.downloadReportCsv("shifts", { from, to }),
          `rapport-postes-${from}-${to}.csv`
        )
      } else if (tab === "daily") {
        downloadCsv(
          await api.downloadReportCsv("daily", { from, to }),
          `rapport-journalier-${from}-${to}.csv`
        )
      } else if (tab === "variance" && tankId !== null) {
        downloadCsv(
          await api.downloadReportCsv("tank-variance", {
            tankId: String(tankId),
            from,
            to,
          }),
          `variance-cuve-${tankId}.csv`
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("reports.errors.load"))
    }
  }

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "shifts", label: t("reports.tabs.shifts") },
    { key: "daily", label: t("reports.tabs.daily") },
    { key: "variance", label: t("reports.tabs.variance") },
    { key: "audit", label: t("reports.tabs.audit") },
  ]

  return (
    <PageLayout title={t("reports.title")} subtitle={t("reports.subtitle")}>
      <div className="space-y-4">
        <div
          className="flex flex-wrap gap-1 rounded-lg border bg-muted p-1"
          role="tablist"
        >
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                tab === key
                  ? "bg-card font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {tab !== "audit" && (
            <>
              <div className="space-y-1">
                <Label htmlFor="report-from">{t("reports.filters.from")}</Label>
                <Input
                  id="report-from"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="report-to">{t("reports.filters.to")}</Label>
                <Input
                  id="report-to"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </>
          )}
          {tab === "variance" && (
            <div className="space-y-1">
              <Label>{t("reports.variance.tank")}</Label>
              <Select
                value={tankId !== null ? String(tankId) : undefined}
                onValueChange={(v) => setTankId(Number(v))}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder={t("reports.variance.tank")} />
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
          )}
          {tab === "audit" && (
            <div className="space-y-1">
              <Label>{t("reports.audit.type")}</Label>
              <Select
                value={eventType}
                onValueChange={(v) => {
                  setEventType(v)
                  setEventOffset(0)
                }}
              >
                <SelectTrigger className="w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    {t("reports.audit.allTypes")}
                  </SelectItem>
                  {Object.values(EventType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {tab !== "audit" && (
            <Button variant="outline" onClick={handleCsv}>
              {t("reports.exportCsv")}
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {loading && (
          <p className="text-muted-foreground">{t("auth.loading")}</p>
        )}

        {!loading && tab === "shifts" && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("reports.columns.shift")}</TableHead>
                  <TableHead>{t("reports.columns.date")}</TableHead>
                  <TableHead>{t("reports.columns.status")}</TableHead>
                  <TableHead className="text-right">
                    {t("reports.columns.fuelVolume")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("reports.columns.fuelRevenue")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("reports.columns.shopRevenue")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("reports.columns.cash")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("reports.columns.discrepancy")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shiftRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground">
                      {t("reports.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  shiftRows.map((row) => (
                    <TableRow key={row.shiftId}>
                      <TableCell>#{row.shiftId}</TableCell>
                      <TableCell>{formatDate(row.date)}</TableCell>
                      <TableCell>
                        <StatusBadge tone={shiftStatusBadgeTone(row.status)}>
                          {row.status}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(row.fuelVolume)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(row.fuelRevenue)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(row.shopRevenue)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(row.cashHandedIn)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          row.discrepancy !== null &&
                            row.discrepancy > 0 &&
                            "text-red-600",
                          row.discrepancy !== null &&
                            row.discrepancy < 0 &&
                            "text-amber-600"
                        )}
                      >
                        {formatNumber(row.discrepancy)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && tab === "daily" && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("reports.columns.date")}</TableHead>
                  <TableHead className="text-right">
                    {t("reports.columns.shifts")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("reports.columns.fuelVolume")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("reports.columns.fuelRevenue")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("reports.columns.shopRevenue")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("reports.columns.cash")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("reports.columns.discrepancy")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      {t("reports.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  dailyRows.map((row) => (
                    <TableRow key={row.date}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.shiftsReconciled}/{row.shiftsTotal}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(row.fuelVolume)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(row.fuelRevenue)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(row.shopRevenue)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(row.cashHandedIn)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          row.discrepancy !== null &&
                            row.discrepancy > 0 &&
                            "text-red-600",
                          row.discrepancy !== null &&
                            row.discrepancy < 0 &&
                            "text-amber-600"
                        )}
                      >
                        {formatNumber(row.discrepancy)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && tab === "variance" && varianceReport && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <h3 className="mb-1 text-sm font-semibold">
                {t("reports.variance.chartTitle", {
                  tank: varianceReport.tankName,
                })}
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                {t("reports.variance.chartHint")}
              </p>
              <VarianceChart report={varianceReport} />
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("reports.columns.date")}</TableHead>
                    <TableHead className="text-right">
                      {t("reports.variance.actual")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("reports.variance.theoretical")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("reports.variance.variance")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("reports.variance.cumulative")}
                    </TableHead>
                    <TableHead>{t("reports.variance.verdict")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {varianceReport.rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground">
                        {t("reports.variance.noData")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    varianceReport.rows.map((row) => (
                      <TableRow key={row.readingId}>
                        <TableCell>{formatDate(row.measuredAt)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(row.actualQuantity)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(row.theoreticalQuantity)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums",
                            row.variance !== null &&
                              row.variance < 0 &&
                              "text-red-600"
                          )}
                        >
                          {formatNumber(row.variance)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(row.cumulativeVariance)}
                        </TableCell>
                        <TableCell>
                          {row.withinTolerance === null ? (
                            "—"
                          ) : row.withinTolerance ? (
                            <StatusBadge tone="green">
                              {t("reports.variance.ok")}
                            </StatusBadge>
                          ) : (
                            <StatusBadge tone="red">
                              {t("reports.variance.exceeded")}
                            </StatusBadge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {!loading && tab === "audit" && (
          <div className="space-y-3">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>{t("reports.audit.when")}</TableHead>
                    <TableHead>{t("reports.audit.eventType")}</TableHead>
                    <TableHead>{t("reports.audit.shift")}</TableHead>
                    <TableHead>{t("reports.audit.details")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        {t("reports.empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>{event.id}</TableCell>
                        <TableCell>
                          {new Date(event.occurredAt).toLocaleString("fr-FR")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {event.type}
                        </TableCell>
                        <TableCell>
                          {event.shiftId !== null ? `#${event.shiftId}` : "—"}
                        </TableCell>
                        <TableCell className="max-w-md truncate text-xs text-muted-foreground">
                          {event.payload ? JSON.stringify(event.payload) : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("reports.audit.total", { count: eventsTotal })}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={eventOffset === 0}
                  onClick={() =>
                    setEventOffset(Math.max(0, eventOffset - EVENT_PAGE))
                  }
                >
                  {t("reports.audit.prev")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={eventOffset + EVENT_PAGE >= eventsTotal}
                  onClick={() => setEventOffset(eventOffset + EVENT_PAGE)}
                >
                  {t("reports.audit.next")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
