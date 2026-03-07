import { useTranslation } from "react-i18next"
import { PageLayout } from "@/components/layout/PageLayout"
import { Scale } from "@/components/icons"

export const ReconciliationPage = () => {
  const { t } = useTranslation()
  return (
    <PageLayout title={t("reconciliation.title")}>
      <div className="flex items-start gap-3 text-muted-foreground">
        <Scale className="size-5 shrink-0 mt-0.5" aria-hidden />
        <p>{t("reconciliation.intro")}</p>
      </div>
    </PageLayout>
  )
}
