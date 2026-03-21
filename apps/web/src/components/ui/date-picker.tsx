"use client"

import * as React from "react"
import { format, parse, parseISO } from "date-fns"
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const DATE_FORMAT = "yyyy-MM-dd"
const DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm"
function parseValue(value: string, includeTime: boolean): Date | undefined {
  if (!value.trim()) return undefined
  try {
    if (includeTime && value.includes("T")) {
      return parseISO(value)
    }
    return parse(value, DATE_FORMAT, new Date())
  } catch {
    return undefined
  }
}

function formatDisplay(value: string, includeTime: boolean): string {
  const d = parseValue(value, includeTime)
  if (!d) return ""
  return includeTime ? format(d, "PPP p") : format(d, "PPP")
}

/** Parse `YYYY-MM` → { y, m } with m in 0..11 */
function parseMonthValue(value: string): { y: number; m: number } | undefined {
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim())
  if (!match) return undefined
  const y = Number(match[1])
  const month0 = Number(match[2]) - 1
  if (!Number.isFinite(y) || month0 < 0 || month0 > 11) return undefined
  return { y, m: month0 }
}

function formatMonthStorage(y: number, monthIndex0: number): string {
  return `${y}-${String(monthIndex0 + 1).padStart(2, "0")}`
}

function formatMonthDisplay(value: string): string {
  const p = parseMonthValue(value)
  if (!p) return ""
  return format(new Date(p.y, p.m, 1), "MMMM yyyy")
}

function monthShortLabels(): string[] {
  return Array.from({ length: 12 }, (_, i) =>
    new Date(2024, i, 1).toLocaleString(undefined, { month: "short" })
  )
}

export interface DatePickerProps {
  /** Value: `YYYY-MM-DD`, or `YYYY-MM` when `mode="month"`, or `YYYY-MM-DDTHH:mm` when `includeTime` */
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  /** When true, value includes time and popover shows time inputs (`mode` must be `"date"`). */
  includeTime?: boolean
  /** `"date"` (default): day calendar. `"month"`: month + year only (`YYYY-MM`). */
  mode?: "date" | "month"
  /** Month mode footer — defaults to English if omitted */
  monthClearLabel?: string
  monthThisMonthLabel?: string
  /** Month mode year chevrons (a11y) */
  monthPrevYearAriaLabel?: string
  monthNextYearAriaLabel?: string
}

export const DatePicker = ({
  value,
  onChange,
  id,
  placeholder = "Pick a date",
  disabled = false,
  className,
  includeTime = false,
  mode = "date",
  monthClearLabel = "Clear",
  monthThisMonthLabel = "This month",
  monthPrevYearAriaLabel = "Previous year",
  monthNextYearAriaLabel = "Next year",
}: DatePickerProps) => {
  const [open, setOpen] = React.useState(false)
  const [viewYear, setViewYear] = React.useState(() => {
    if (mode === "month") {
      return parseMonthValue(value)?.y ?? new Date().getFullYear()
    }
    return new Date().getFullYear()
  })

  const selected = React.useMemo(
    () => parseValue(value, includeTime),
    [value, includeTime]
  )

  const [pendingDate, setPendingDate] = React.useState<Date | undefined>(
    () => selected
  )
  const [pendingHour, setPendingHour] = React.useState(() =>
    selected ? selected.getHours() : new Date().getHours()
  )
  const [pendingMinute, setPendingMinute] = React.useState(() =>
    selected ? selected.getMinutes() : new Date().getMinutes()
  )

  React.useEffect(() => {
    if (open && mode === "month") {
      const p = parseMonthValue(value)
      setViewYear(p?.y ?? new Date().getFullYear())
    }
  }, [open, mode, value])

  React.useEffect(() => {
    if (open && mode === "date") {
      const d = selected ?? new Date()
      setPendingDate(d)
      setPendingHour(d.getHours())
      setPendingMinute(d.getMinutes())
    }
  }, [open, selected, mode])

  const handleSelect = (date: Date | undefined) => {
    if (!date) return
    if (includeTime) {
      setPendingDate(date)
    } else {
      onChange(format(date, DATE_FORMAT))
      setOpen(false)
    }
  }

  const commitDateTime = () => {
    if (!pendingDate) return
    const d = new Date(
      pendingDate.getFullYear(),
      pendingDate.getMonth(),
      pendingDate.getDate(),
      pendingHour,
      pendingMinute
    )
    onChange(format(d, DATETIME_FORMAT))
    setOpen(false)
  }

  const handleClear = () => {
    onChange("")
    setOpen(false)
  }

  const handleToday = () => {
    const today = new Date()
    if (includeTime) {
      setPendingDate(today)
      setPendingHour(today.getHours())
      setPendingMinute(today.getMinutes())
    } else {
      onChange(format(today, DATE_FORMAT))
      setOpen(false)
    }
  }

  const handleThisMonth = () => {
    const n = new Date()
    onChange(formatMonthStorage(n.getFullYear(), n.getMonth()))
    setOpen(false)
  }

  const handleNow = () => {
    const now = new Date()
    setPendingDate(now)
    setPendingHour(now.getHours())
    setPendingMinute(now.getMinutes())
  }

  const displayText =
    mode === "month"
      ? value
        ? formatMonthDisplay(value)
        : placeholder
      : value
        ? formatDisplay(value, includeTime)
        : placeholder

  const monthLabels = React.useMemo(() => monthShortLabels(), [])

  const isMonthMode = mode === "month"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 size-4 shrink-0" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {isMonthMode ? (
          <>
            <div className="flex items-center justify-between gap-1 border-b px-2 py-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                aria-label={monthPrevYearAriaLabel}
                onClick={() => setViewYear((y) => y - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-[4rem] text-center text-sm font-medium tabular-nums">
                {viewYear}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                aria-label={monthNextYearAriaLabel}
                onClick={() => setViewYear((y) => y + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-1 p-3">
              {monthLabels.map((label, idx) => {
                const stored = formatMonthStorage(viewYear, idx)
                const isSelected = value === stored
                return (
                  <Button
                    key={stored}
                    type="button"
                    variant={isSelected ? "default" : "ghost"}
                    size="sm"
                    className="h-9 font-normal"
                    onClick={() => {
                      onChange(stored)
                      setOpen(false)
                    }}
                  >
                    {label}
                  </Button>
                )
              })}
            </div>
            <div className="flex gap-2 border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 flex-1 text-muted-foreground"
                onClick={handleClear}
              >
                {monthClearLabel}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 flex-1"
                onClick={handleThisMonth}
              >
                {monthThisMonthLabel}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Calendar
              mode="single"
              selected={includeTime ? pendingDate : selected}
              onSelect={handleSelect}
            />
            {includeTime && (
              <div className="space-y-3 border-t p-3">
                <div className="flex items-center gap-2">
                  <label className="whitespace-nowrap text-sm text-muted-foreground">
                    Time
                  </label>
                  <div className="flex items-center gap-1">
                    <select
                      aria-label="Hour"
                      className="h-9 w-14 rounded-md border border-input bg-background px-2 text-sm"
                      value={pendingHour}
                      onChange={(e) => setPendingHour(Number(e.target.value))}
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {String(i).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                    <span className="text-muted-foreground">:</span>
                    <select
                      aria-label="Minute"
                      className="h-9 w-14 rounded-md border border-input bg-background px-2 text-sm"
                      value={pendingMinute}
                      onChange={(e) => setPendingMinute(Number(e.target.value))}
                    >
                      {Array.from({ length: 60 }, (_, i) => (
                        <option key={i} value={i}>
                          {String(i).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-primary"
                    onClick={handleNow}
                  >
                    Now
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={handleToday}
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-muted-foreground"
                    onClick={handleClear}
                  >
                    Clear
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="ml-auto h-8"
                    onClick={commitDateTime}
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
            {!includeTime && (
              <div className="flex gap-2 border-t p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 flex-1"
                  onClick={handleToday}
                >
                  Today
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 flex-1 text-muted-foreground"
                  onClick={handleClear}
                >
                  Clear
                </Button>
              </div>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
