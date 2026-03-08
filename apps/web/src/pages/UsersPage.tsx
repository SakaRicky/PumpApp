import { useTranslation } from "react-i18next"
import { PageLayout } from "@/components/layout/PageLayout"

export const UsersPage = () => {
  const { t } = useTranslation()
  return (
    <PageLayout title={t("users.title")}>
      <p className="text-muted-foreground">{t("users.intro")}</p>
    </PageLayout>
  )
}
