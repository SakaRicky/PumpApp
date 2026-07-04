import type { ReactNode } from "react"
import { Breadcrumbs } from "./Breadcrumbs"
import { useBreadcrumbsFromPath } from "./useBreadcrumbsFromPath"

export interface PageLayoutProps {
  title: string
  children: ReactNode
  breadcrumbTitle?: string
  /** One-line description under the title. */
  subtitle?: string
  /** Right-aligned header controls (buttons, filters). */
  actions?: ReactNode
}

export const PageLayout = ({
  title,
  children,
  breadcrumbTitle,
  subtitle,
  actions,
}: PageLayoutProps) => {
  const breadcrumbs = useBreadcrumbsFromPath(breadcrumbTitle ?? title)

  return (
    <div className="flex flex-col overflow-auto">
      <header className="shrink-0 border-b border-border bg-card px-6 py-4">
        <Breadcrumbs items={breadcrumbs} className="mb-2" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </header>
      <div className="flex-1 p-6">{children}</div>
    </div>
  )
}
