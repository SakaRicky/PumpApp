import { PageLayout } from "@/components/layout/PageLayout"
import { Scale } from "@/components/icons"

export const ReconciliationPage = () => (
  <PageLayout title="Reconciliation">
    <div className="flex items-start gap-3 text-muted-foreground">
      <Scale className="size-5 shrink-0 mt-0.5" aria-hidden />
      <p>Shift reconciliation and cash hand-in.</p>
    </div>
  </PageLayout>
)
