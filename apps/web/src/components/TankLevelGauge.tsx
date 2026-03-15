interface TankLevelGaugeProps {
  theoreticalQuantity: number | null
  capacity: number | null
  tankName: string
  fuelTypeName?: string | null
}

export const TankLevelGauge = ({
  theoreticalQuantity,
  capacity,
  tankName,
  fuelTypeName,
}: TankLevelGaugeProps) => {
  const qty = theoreticalQuantity ?? 0
  const cap = capacity ?? 0
  const hasCapacity = cap > 0
  const percent = hasCapacity ? Math.min(100, (qty / cap) * 100) : 0

  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border bg-card p-3 text-card-foreground shadow-sm">
      <div className="text-center">
        <p className="text-sm font-medium">{tankName}</p>
        {fuelTypeName && (
          <p className="text-xs text-muted-foreground">{fuelTypeName}</p>
        )}
      </div>
      <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-primary/30 bg-muted">
        <div
          className="absolute bottom-0 left-0 right-0 bg-primary/70 transition-[height] duration-500 ease-out"
          style={{ height: `${percent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          {hasCapacity ? (
            <span className="text-sm font-medium tabular-nums">
              {percent.toFixed(0)}%
            </span>
          ) : (
            <span className="text-xs font-medium tabular-nums">
              {qty.toLocaleString()} L
            </span>
          )}
        </div>
      </div>
      {hasCapacity && (
        <p className="text-xs text-muted-foreground">
          {qty.toLocaleString()} / {cap.toLocaleString()} L
        </p>
      )}
    </div>
  )
}
