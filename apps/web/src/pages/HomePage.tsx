import { PageLayout } from "@/components/layout/PageLayout"
import { LayoutDashboard } from "@/components/icons"

export const HomePage = () => (
  <PageLayout title="Dashboard">
    <div className="flex items-start gap-3 text-muted-foreground">
      <LayoutDashboard className="size-5 shrink-0 mt-0.5" aria-hidden />
      <p>
        Welcome to PumpPro. Use the sidebar to open Shifts, Reconciliation,
        Products, or Reports.
      </p>
    </div>
  </PageLayout>
)
