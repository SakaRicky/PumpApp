import { PageLayout } from "@/components/layout/PageLayout"
import { FolderOpen } from "@/components/icons"

export const MasterDataPage = () => (
  <PageLayout title="Categories & more">
    <div className="flex items-start gap-3 text-muted-foreground">
      <FolderOpen className="size-5 shrink-0 mt-0.5" aria-hidden />
      <p>Categories, workers, pumps, fuel price history.</p>
    </div>
  </PageLayout>
)
