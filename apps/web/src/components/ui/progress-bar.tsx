import { cn } from "@/lib/utils"

/**
 * Horizontal level bar (tank levels, progress). Color shifts with the level:
 * green when healthy, orange below 40%, red below 20% — matching alert logic.
 */
export const ProgressBar = ({
  percent,
  className,
  colorByLevel = true,
}: {
  percent: number
  className?: string
  colorByLevel?: boolean
}) => {
  const clamped = Math.max(0, Math.min(100, percent))
  const color = !colorByLevel
    ? "bg-primary"
    : clamped < 20
      ? "bg-red-500"
      : clamped < 40
        ? "bg-orange-400"
        : "bg-emerald-600"
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", color)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
