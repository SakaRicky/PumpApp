import { useTranslation } from "react-i18next"
import { PageLayout } from "@/components/layout/PageLayout"
import { BarChart3 } from "@/components/icons"

export const ReportsPage = () => {
  const { t } = useTranslation()
  return (
    <PageLayout title={t("reports.title")}>
      <div className="flex items-start gap-3 text-muted-foreground">
        <BarChart3 className="size-5 shrink-0 mt-0.5" aria-hidden />
        <p>{t("reports.intro")}</p>
      </div>
    </PageLayout>
  )
}
