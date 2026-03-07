import { useTranslation } from "react-i18next"
import { PageLayout } from "@/components/layout/PageLayout"
import { LayoutDashboard } from "@/components/icons"

export const HomePage = () => {
  const { t } = useTranslation()
  return (
    <PageLayout title={t("home.title")}>
      <div className="flex items-start gap-3 text-muted-foreground">
        <LayoutDashboard className="size-5 shrink-0 mt-0.5" aria-hidden />
        <p>{t("home.welcome")}</p>
      </div>
    </PageLayout>
  )
}
