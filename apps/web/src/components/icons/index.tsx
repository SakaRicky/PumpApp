import type { LucideProps } from "lucide-react"
import {
  LayoutDashboard,
  CalendarClock,
  Scale,
  Package,
  FolderOpen,
  BarChart3,
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Fuel,
  Users,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react"
import { forwardRef } from "react"
import { cn } from "@/lib/utils"

/**
 * Re-exported Lucide icons for use across the app.
 * Import from `@/components/icons` to keep icon usage consistent and tree-shakeable.
 * Add new icons here when needed; use PascalCase names matching Lucide.
 */
export {
  LayoutDashboard,
  CalendarClock,
  Scale,
  Package,
  FolderOpen,
  BarChart3,
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Fuel,
  Users,
  Settings,
  LogOut,
}

export type { LucideIcon, LucideProps }

const sizeMap = {
  xs: "size-3.5",
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
} as const

export interface IconProps extends Omit<LucideProps, "size"> {
  icon: LucideIcon
  size?: keyof typeof sizeMap
}

/**
 * Wrapper for consistent icon sizing and className merging.
 * Use when you need a single API for size (xs/sm/md/lg) or shared styling.
 */
export const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ icon: LucideIcon, size = "md", className, ...props }, ref) => (
    <LucideIcon
      ref={ref}
      className={cn(sizeMap[size], "shrink-0", className)}
      aria-hidden
      {...props}
    />
  )
)
Icon.displayName = "Icon"
