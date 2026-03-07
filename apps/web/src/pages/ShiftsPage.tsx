import { useTranslation } from "react-i18next"
import { PageLayout } from "@/components/layout/PageLayout"
import { CalendarClock } from "@/components/icons"

export const ShiftsPage = () => {
  const { t } = useTranslation()
  return (
    <PageLayout title={t("shifts.title")}>
      <div className="flex items-start gap-3 text-muted-foreground">
        <CalendarClock className="size-5 shrink-0 mt-0.5" aria-hidden />
        <p>{t("shifts.intro")}</p>
      </div>
    </PageLayout>
  )
}
