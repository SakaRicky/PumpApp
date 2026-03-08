import { useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import type { BreadcrumbItem } from "./breadcrumbsTypes"

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
