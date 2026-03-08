import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import type { BreadcrumbsProps } from "./breadcrumbsTypes"

export type { BreadcrumbItem, BreadcrumbsProps } from "./breadcrumbsTypes.js"

export const Breadcrumbs = ({ items, className }: BreadcrumbsProps) => {
  const { t } = useTranslation()
  if (items.length === 0) return null

  return (
    <nav
      aria-label={t("breadcrumbs.ariaLabel")}
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground",
        className
      )}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && (
              <span aria-hidden className="select-none">
                /
              </span>
            )}
            {item.href && !isLast ? (
              <Link
                to={item.href}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={isLast ? "text-foreground font-medium" : undefined}
              >
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
