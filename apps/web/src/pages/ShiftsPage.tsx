import { PageLayout } from "@/components/layout/PageLayout"
import { CalendarClock } from "@/components/icons"

export const ShiftsPage = () => (
  <PageLayout title="Shifts">
    <div className="flex items-start gap-3 text-muted-foreground">
      <CalendarClock className="size-5 shrink-0 mt-0.5" aria-hidden />
      <p>Shift management and workers.</p>
    </div>
  </PageLayout>
)
