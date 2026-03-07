import { PageLayout } from "@/components/layout/PageLayout"
import { Package } from "@/components/icons"

export const ProductsPage = () => (
  <PageLayout title="Products">
    <div className="flex items-start gap-3 text-muted-foreground">
      <Package className="size-5 shrink-0 mt-0.5" aria-hidden />
      <p>Products and categories.</p>
    </div>
  </PageLayout>
)
