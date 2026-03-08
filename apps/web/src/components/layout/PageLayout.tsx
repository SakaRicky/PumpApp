import type { ReactNode } from "react"
import { Breadcrumbs } from "./Breadcrumbs"
import { useBreadcrumbsFromPath } from "./useBreadcrumbsFromPath"

export interface PageLayoutProps {
  title: string
  children: ReactNode
  breadcrumbTitle?: string
}

export const PageLayout = ({
  title,
  children,
  breadcrumbTitle,
}: PageLayoutProps) => {
  const breadcrumbs = useBreadcrumbsFromPath(breadcrumbTitle ?? title)

  return (
    <div className="flex flex-col overflow-auto">
      <header className="shrink-0 border-b border-border bg-card px-6 py-4">
        <Breadcrumbs items={breadcrumbs} className="mb-2" />
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      </header>
      <div className="flex-1 p-6">{children}</div>
    </div>
  )
}
