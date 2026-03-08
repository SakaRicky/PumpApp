import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type { UserResponse, WorkerResponse } from "@pumpapp/shared"
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

export const WorkersPage = () => {
  const { t } = useTranslation()
  const [workers, setWorkers] = useState<WorkerResponse[]>([])
  const [users, setUsers] = useState<UserResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [editWorker, setEditWorker] = useState<WorkerResponse | null>(null)

  const [createName, setCreateName] = useState("")
  const [createDesignation, setCreateDesignation] = useState("")

  const [editName, setEditName] = useState("")
  const [editDesignation, setEditDesignation] = useState("")
  const [editActive, setEditActive] = useState(true)

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [workersRes, usersRes] = await Promise.all([
        api.getWorkers(),
        api.getUsers(),
      ])
      setWorkers(workersRes)
      setUsers(usersRes)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t("workers.errorLoad"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const hasAccount = (workerId: number) =>
    users.some((u) => u.workerId === workerId)

  const openCreate = () => {
    setCreateName("")
    setCreateDesignation("")
    setSubmitError(null)
    setCreateOpen(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createName.trim()) {
      setSubmitError("Name is required.")
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.createWorker({
        name: createName.trim(),
        designation: createDesignation.trim() || undefined,
      })
      setCreateOpen(false)
      await load()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t("workers.errorCreate"))
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (worker: WorkerResponse) => {
    setEditWorker(worker)
    setEditName(worker.name)
    setEditDesignation(worker.designation ?? "")
    setEditActive(worker.active)
    setSubmitError(null)
  }

  const closeEdit = () => {
    setEditWorker(null)
    setSubmitError(null)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editWorker) return
    if (!editName.trim()) {
      setSubmitError("Name is required.")
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.updateWorker(editWorker.id, {
        name: editName.trim(),
        designation: editDesignation.trim() || undefined,
        active: editActive,
      })
      closeEdit()
      await load()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t("workers.errorUpdate"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageLayout title={t("workers.title")}>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">{t("workers.intro")}</p>
          <Button onClick={openCreate}>{t("workers.addWorker")}</Button>
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <p className="text-muted-foreground">{t("auth.loading")}</p>
        ) : workers.length === 0 ? (
          <p className="text-muted-foreground">{t("workers.noWorkers")}</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("workers.table.id")}</TableHead>
                  <TableHead>{t("workers.table.name")}</TableHead>
                  <TableHead>{t("workers.table.designation")}</TableHead>
                  <TableHead>{t("workers.table.active")}</TableHead>
                  <TableHead>{t("workers.table.hasAccount")}</TableHead>
                  <TableHead className="w-[100px]">
                    {t("workers.editWorker")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.map((worker) => (
                  <TableRow key={worker.id}>
                    <TableCell>{worker.id}</TableCell>
                    <TableCell>{worker.name}</TableCell>
                    <TableCell>{worker.designation ?? "—"}</TableCell>
                    <TableCell>
                      {worker.active
                        ? t("workers.activeYes")
                        : t("workers.activeNo")}
                    </TableCell>
                    <TableCell>
                      {hasAccount(worker.id)
                        ? t("workers.hasAccountYes")
                        : t("workers.hasAccountNo")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(worker)}
                      >
                        {t("workers.editWorker")}
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
            <DialogTitle>{t("workers.createWorker")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="create-name">{t("workers.form.name")}</Label>
              <Input
                id="create-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-designation">
                {t("workers.form.designation")}
              </Label>
              <Input
                id="create-designation"
                value={createDesignation}
                onChange={(e) => setCreateDesignation(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                {t("workers.cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("auth.loading") : t("workers.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editWorker} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("workers.editWorker")}</DialogTitle>
          </DialogHeader>
          {editWorker && (
            <form onSubmit={handleEdit} className="space-y-4">
              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-name">{t("workers.form.name")}</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-designation">
                  {t("workers.form.designation")}
                </Label>
                <Input
                  id="edit-designation"
                  value={editDesignation}
                  onChange={(e) => setEditDesignation(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="edit-active">{t("workers.form.active")}</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeEdit}>
                  {t("workers.cancel")}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? t("auth.loading") : t("workers.save")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
