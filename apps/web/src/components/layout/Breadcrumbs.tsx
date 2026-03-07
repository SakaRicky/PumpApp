import { Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

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

const pathSegmentToLabel = (segment: string): string =>
  segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")

export const useBreadcrumbsFromPath = (
  pageTitle?: string
): BreadcrumbItem[] => {
  const location = useLocation()
  const { t } = useTranslation()
  const segments = location.pathname.split("/").filter(Boolean)
  const items: BreadcrumbItem[] = [{ label: t("breadcrumbs.home"), href: "/" }]
  let path = ""
  for (let i = 0; i < segments.length; i++) {
    path += `/${segments[i]}`
    const isLast = i === segments.length - 1
    items.push({
      label: isLast && pageTitle ? pageTitle : pathSegmentToLabel(segments[i]),
      href: isLast ? undefined : path,
    })
  }
  if (pageTitle && segments.length > 0) {
    items[items.length - 1].label = pageTitle
  }
  return items
}
