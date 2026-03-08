"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

import "react-day-picker/style.css"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

const Calendar = ({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) => (
  <DayPicker
    showOutsideDays={showOutsideDays}
    className={cn("p-3", className)}
    classNames={{
      months: "flex flex-col sm:flex-row gap-2",
      month: "flex flex-col gap-4",
      month_caption: "flex justify-center pt-1 relative items-center",
      nav: "flex items-center gap-1",
      button_previous:
        "absolute left-1 size-7 rounded-md border border-input bg-background p-0 opacity-50 hover:opacity-100",
      button_next:
        "absolute right-1 size-7 rounded-md border border-input bg-background p-0 opacity-50 hover:opacity-100",
      month_grid: "w-full border-collapse space-y-1",
      weekdays: "flex",
      weekday: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
      week: "flex w-full mt-2",
      day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
      day_button:
        "size-8 rounded-md p-0 font-normal hover:bg-accent hover:text-accent-foreground aria-selected:opacity-100",
      range_start:
        "day-range-start rounded-l-md bg-primary text-primary-foreground",
      range_end:
        "day-range-end rounded-r-md bg-primary text-primary-foreground",
      selected:
        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
      today: "bg-accent text-accent-foreground",
      outside:
        "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
      disabled: "text-muted-foreground opacity-50",
      range_middle:
        "aria-selected:bg-accent aria-selected:text-accent-foreground",
      hidden: "invisible",
      ...classNames,
    }}
    components={{
      Chevron: ({ orientation }) =>
        orientation === "left" ? (
          <ChevronLeft className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        ),
    }}
    {...props}
  />
)
Calendar.displayName = "Calendar"

export { Calendar }
