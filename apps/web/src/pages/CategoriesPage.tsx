import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type { CategoryResponse } from "@pumpapp/shared"
import { PageLayout } from "@/components/layout/PageLayout"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api } from "@/lib/api"

export const CategoriesPage = () => {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<CategoryResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<CategoryResponse | null>(
    null
  )

  const [createName, setCreateName] = useState("")
  const [createDescription, setCreateDescription] = useState("")

  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await api.getCategories()
      setCategories(res)
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : t("categories.errors.errorLoad")
      )
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setCreateName("")
    setCreateDescription("")
    setSubmitError(null)
    setCreateOpen(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createName.trim()) {
      setSubmitError(t("categories.errors.nameRequired"))
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.createCategory({
        name: createName.trim(),
        description: createDescription.trim() || undefined,
      })
      setCreateOpen(false)
      await load()
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : t("categories.errors.errorCreate")
      )
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (category: CategoryResponse) => {
    setEditCategory(category)
    setEditName(category.name)
    setEditDescription(category.description ?? "")
    setSubmitError(null)
  }

  const closeEdit = () => {
    setEditCategory(null)
    setSubmitError(null)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editCategory) return
    if (!editName.trim()) {
      setSubmitError(t("categories.errors.nameRequired"))
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.updateCategory(editCategory.id, {
        name: editName.trim(),
        description: editDescription.trim() || null,
      })
      closeEdit()
      await load()
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : t("categories.errors.errorUpdate")
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageLayout title={t("categories.title")}>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">{t("categories.intro")}</p>
          <Button onClick={openCreate}>{t("categories.add")}</Button>
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <p className="text-muted-foreground">{t("auth.loading")}</p>
        ) : categories.length === 0 ? (
          <p className="text-muted-foreground">
            {t("categories.noCategories")}
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("categories.table.id")}</TableHead>
                  <TableHead>{t("categories.table.name")}</TableHead>
                  <TableHead>{t("categories.table.description")}</TableHead>
                  <TableHead className="w-[100px]">
                    {t("categories.edit")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>{cat.id}</TableCell>
                    <TableCell>{cat.name}</TableCell>
                    <TableCell>{cat.description ?? "—"}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(cat)}
                      >
                        {t("categories.edit")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("categories.createCategory")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="create-name">{t("categories.form.name")}</Label>
              <Input
                id="create-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">
                {t("categories.form.description")}
              </Label>
              <Input
                id="create-description"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                {t("categories.cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("auth.loading") : t("categories.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editCategory}
        onOpenChange={(open) => !open && closeEdit()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("categories.editCategory")}</DialogTitle>
          </DialogHeader>
          {editCategory && (
            <form onSubmit={handleEdit} className="space-y-4">
              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-name">{t("categories.form.name")}</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">
                  {t("categories.form.description")}
                </Label>
                <Input
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeEdit}>
                  {t("categories.cancel")}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? t("auth.loading") : t("categories.save")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
