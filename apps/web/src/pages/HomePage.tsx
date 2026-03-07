import { PageLayout } from "@/components/layout/PageLayout"

export const HomePage = () => (
  <PageLayout title="Dashboard">
    <p className="text-muted-foreground">
      Welcome to PumpPro. Use the sidebar to open Shifts, Reconciliation,
      Products, or Reports.
    </p>
  </PageLayout>
)
