import { useTranslation } from "react-i18next"
import { PageLayout } from "@/components/layout/PageLayout"
import { FolderOpen } from "@/components/icons"

export const MasterDataPage = () => {
  const { t } = useTranslation()
  return (
    <PageLayout title={t("masterData.title")}>
      <div className="flex items-start gap-3 text-muted-foreground">
        <FolderOpen className="size-5 shrink-0 mt-0.5" aria-hidden />
        <p>{t("masterData.intro")}</p>
      </div>
    </PageLayout>
  )
}
