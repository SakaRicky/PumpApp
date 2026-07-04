import { cn } from "@/lib/utils"

interface BrandLogoProps {
  /** "sidebar" renders light-on-dark; "light" renders dark-on-light (login). */
  variant?: "sidebar" | "light"
  withTagline?: boolean
  className?: string
}

const DropletMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden>
    <defs>
      <linearGradient id="pp-drop" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#7ac943" />
        <stop offset="0.55" stopColor="#1b8a3f" />
        <stop offset="1" stopColor="#f5a623" />
      </linearGradient>
    </defs>
    <path
      fill="url(#pp-drop)"
      d="M24 3C24 3 9 20.5 9 31a15 15 0 0 0 30 0C39 20.5 24 3 24 3Z"
    />
    <path
      fill="currentColor"
      opacity="0.85"
      d="M24 14c-4.6 5.8-8 11.4-8 16a8 8 0 0 0 16 0c0-4.6-3.4-10.2-8-16Zm0 5.2c3 4.1 5 8 5 10.8a5 5 0 0 1-10 0c0-2.8 2-6.7 5-10.8Z"
    />
  </svg>
)

export const BrandLogo = ({
  variant = "sidebar",
  withTagline = false,
  className,
}: BrandLogoProps) => (
  <span className={cn("flex items-center gap-2.5", className)}>
    <DropletMark
      className={cn(
        "size-9 shrink-0",
        variant === "sidebar" ? "text-sidebar" : "text-background"
      )}
    />
    <span className="flex flex-col leading-none">
      <span className="text-lg font-extrabold tracking-tight">
        <span
          className={
            variant === "sidebar" ? "text-white" : "text-foreground"
          }
        >
          PUMP
        </span>
        <span
          className={
            variant === "sidebar" ? "text-sidebar-primary" : "text-primary"
          }
        >
          PRO
        </span>
      </span>
      {withTagline && (
        <span
          className={cn(
            "mt-1 text-[10px] font-medium",
            variant === "sidebar"
              ? "text-sidebar-foreground/80"
              : "text-muted-foreground"
          )}
        >
          Run your station. Grow your business.
        </span>
      )}
    </span>
  </span>
)
