"use client"

import * as React from "react"
import { format, parse } from "date-fns"
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

export interface DatePickerProps {
  /** Value as YYYY-MM-DD or empty */
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

export const DatePicker = ({
  value,
  onChange,
  id,
  placeholder = "Pick a date",
  disabled = false,
  className,
}: DatePickerProps) => {
  const [open, setOpen] = React.useState(false)
  const selected = value ? parse(value, DATE_FORMAT, new Date()) : undefined

  const handleSelect = (date: Date | undefined) => {
    if (!date) return
    onChange(format(date, DATE_FORMAT))
    setOpen(false)
  }

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
          <CalendarIcon className="mr-2 size-4" />
          {value
            ? format(parse(value, DATE_FORMAT, new Date()), "PPP")
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={selected} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  )
}
