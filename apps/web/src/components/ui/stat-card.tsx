import type { ComponentType, ReactNode } from "react"
import { cn } from "@/lib/utils"

export type StatTone = "green" | "orange" | "blue" | "red" | "purple" | "neutral"

const toneClasses: Record<StatTone, string> = {
  green: "bg-emerald-50 text-emerald-700",
  orange: "bg-orange-50 text-orange-600",
  blue: "bg-sky-50 text-sky-600",
  red: "bg-red-50 text-red-600",
  purple: "bg-violet-50 text-violet-600",
  neutral: "bg-muted text-muted-foreground",
}

interface StatCardProps {
  label: string
  value: ReactNode
  icon?: ComponentType<{ className?: string }>
  tone?: StatTone
  /** Small line under the value: trend, ratio, context. */
  hint?: ReactNode
  /** Color the hint as a trend: "up" green, "down" red, "warn" orange. */
  hintTone?: "up" | "down" | "warn" | "muted"
  className?: string
}

const hintToneClasses = {
  up: "text-emerald-600",
  down: "text-red-600",
  warn: "text-orange-600",
  muted: "text-muted-foreground",
} as const

export const StatCard = ({
  label,
  value,
  icon: Icon,
  tone = "green",
  hint,
  hintTone = "muted",
  className,
}: StatCardProps) => (
  <div
    className={cn(
      "flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm",
      className
    )}
  >
    {Icon && (
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          toneClasses[tone]
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
    )}
    <span className="min-w-0 flex-1">
      <span className="block truncate text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <span className="mt-0.5 block text-xl font-bold tracking-tight tabular-nums">
        {value}
      </span>
      {hint && (
        <span
          className={cn(
            "mt-0.5 block text-[11px] font-medium",
            hintToneClasses[hintTone]
          )}
        >
          {hint}
        </span>
      )}
    </span>
  </div>
)
