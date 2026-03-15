"use client"

import * as React from "react"
import { format, parse, parseISO } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

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

export interface DatePickerProps {
  /** Value: YYYY-MM-DD or, when includeTime, YYYY-MM-DDTHH:mm (or empty) */
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  /** When true, value includes time and popover shows time inputs */
  includeTime?: boolean
}

export const DatePicker = ({
  value,
  onChange,
  id,
  placeholder = "Pick a date",
  disabled = false,
  className,
  includeTime = false,
}: DatePickerProps) => {
  const [open, setOpen] = React.useState(false)
  const selected = parseValue(value, includeTime)

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
    if (open) {
      const d = selected ?? new Date()
      setPendingDate(d)
      setPendingHour(d.getHours())
      setPendingMinute(d.getMinutes())
    }
  }, [open, selected])

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

  const handleNow = () => {
    const now = new Date()
    setPendingDate(now)
    setPendingHour(now.getHours())
    setPendingMinute(now.getMinutes())
  }

  const displayText = value ? formatDisplay(value, includeTime) : placeholder

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
        <Calendar
          mode="single"
          selected={includeTime ? pendingDate : selected}
          onSelect={handleSelect}
        />
        {includeTime && (
          <div className="border-t p-3 space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">
                Time
              </label>
              <div className="flex gap-1 items-center">
                <select
                  aria-label="Hour"
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm w-14"
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
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm w-14"
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
                className="h-8 ml-auto"
                onClick={commitDateTime}
              >
                Done
              </Button>
            </div>
          </div>
        )}
        {!includeTime && (
          <div className="flex gap-2 p-2 border-t">
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
      </PopoverContent>
    </Popover>
  )
}
