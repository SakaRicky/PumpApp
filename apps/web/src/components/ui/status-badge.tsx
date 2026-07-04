import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type BadgeTone = "green" | "orange" | "red" | "blue" | "neutral"

const badgeToneClasses: Record<BadgeTone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  orange: "bg-orange-50 text-orange-700 ring-orange-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/20",
  neutral: "bg-muted text-muted-foreground ring-border",
}

export const StatusBadge = ({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
      badgeToneClasses[tone],
      className
    )}
  >
    {children}
  </span>
)

const shiftStatusTone: Record<string, BadgeTone> = {
  PLANNED: "neutral",
  OPEN: "orange",
  CLOSED: "blue",
  RECONCILED: "green",
}

export const shiftStatusBadgeTone = (status: string): BadgeTone =>
  shiftStatusTone[status] ?? "neutral"
