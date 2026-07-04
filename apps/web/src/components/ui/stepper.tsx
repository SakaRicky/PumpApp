import { cn } from "@/lib/utils"

export const Stepper = ({
  steps,
  current,
  onStep,
}: {
  steps: string[]
  current: number
  onStep?: (index: number) => void
}) => (
  <ol className="grid gap-2 sm:grid-cols-4">
    {steps.map((step, index) => (
      <li key={step}>
        <button
          type="button"
          disabled={!onStep}
          onClick={() => onStep?.(index)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm",
            index === current
              ? "border-primary bg-primary/10 font-semibold"
              : "bg-background text-muted-foreground"
          )}
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs">
            {index + 1}
          </span>
          {step}
        </button>
      </li>
    ))}
  </ol>
)
