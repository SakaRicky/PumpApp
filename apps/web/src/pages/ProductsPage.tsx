import { useTranslation } from "react-i18next"
import { PageLayout } from "@/components/layout/PageLayout"
import { Package } from "@/components/icons"

export const ProductsPage = () => {
  const { t } = useTranslation()
  return (
    <PageLayout title={t("products.title")}>
      <div className="flex items-start gap-3 text-muted-foreground">
        <Package className="size-5 shrink-0 mt-0.5" aria-hidden />
        <p>{t("products.intro")}</p>
      </div>
    </PageLayout>
  )
}
