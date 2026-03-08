import { useTranslation } from "react-i18next"
import { PageLayout } from "@/components/layout/PageLayout"

export const WorkersPage = () => {
  const { t } = useTranslation()
  return (
    <PageLayout title={t("workers.title")}>
      <p className="text-muted-foreground">{t("workers.intro")}</p>
    </PageLayout>
  )
}
