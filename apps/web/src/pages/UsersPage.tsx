import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Role } from "@pumpapp/shared"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api } from "@/lib/api"

const ROLES = [Role.ADMIN, Role.USER, Role.SALE, Role.PUMPIST] as const

export const UsersPage = () => {
  const { t } = useTranslation()
  const [users, setUsers] = useState<UserResponse[]>([])
  const [workers, setWorkers] = useState<WorkerResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserResponse | null>(null)

  const [createName, setCreateName] = useState("")
  const [createEmail, setCreateEmail] = useState("")
  const [createPassword, setCreatePassword] = useState("")
  const [createRole, setCreateRole] = useState<Role>(Role.USER)
  const [createWorkerId, setCreateWorkerId] = useState<string>("")

  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editRole, setEditRole] = useState<Role>(Role.USER)
  const [editActive, setEditActive] = useState(true)

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [usersRes, workersRes] = await Promise.all([
        api.getUsers(),
        api.getWorkers(),
      ])
      setUsers(usersRes)
      setWorkers(workersRes)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t("users.errorLoad"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const workersWithoutUser = workers.filter(
    (w) => !users.some((u) => u.workerId === w.id)
  )

  const openCreate = () => {
    setCreateName("")
    setCreateEmail("")
    setCreatePassword("")
    setCreateRole(Role.USER)
    setCreateWorkerId(workersWithoutUser[0]?.id.toString() ?? "")
    setSubmitError(null)
    setCreateOpen(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const workerId = createWorkerId ? parseInt(createWorkerId, 10) : 0
    if (
      !workerId ||
      !createName.trim() ||
      !createEmail.trim() ||
      !createPassword.trim()
    ) {
      setSubmitError("Name, email, password and worker are required.")
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.createUser({
        workerId,
        name: createName.trim(),
        email: createEmail.trim(),
        password: createPassword,
        role: createRole,
      })
      setCreateOpen(false)
      await load()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t("users.errorCreate"))
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (user: UserResponse) => {
    setEditUser(user)
    setEditName(user.name)
    setEditEmail(user.email)
    setEditRole(user.role)
    setEditActive(user.active)
    setSubmitError(null)
  }

  const closeEdit = () => {
    setEditUser(null)
    setSubmitError(null)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return
    if (!editName.trim() || !editEmail.trim()) {
      setSubmitError("Name and email are required.")
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.updateUser(editUser.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        active: editActive,
      })
      closeEdit()
      await load()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t("users.errorUpdate"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageLayout title={t("users.title")}>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">{t("users.intro")}</p>
          <Button onClick={openCreate}>{t("users.addUser")}</Button>
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <p className="text-muted-foreground">{t("auth.loading")}</p>
        ) : users.length === 0 ? (
          <p className="text-muted-foreground">{t("users.noUsers")}</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("users.table.id")}</TableHead>
                  <TableHead>{t("users.table.name")}</TableHead>
                  <TableHead>{t("users.table.email")}</TableHead>
                  <TableHead>{t("users.table.role")}</TableHead>
                  <TableHead>{t("users.table.active")}</TableHead>
                  <TableHead>{t("users.table.worker")}</TableHead>
                  <TableHead className="w-[100px]">
                    {t("users.editUser")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{t(`users.role.${user.role}`)}</TableCell>
                    <TableCell>
                      {user.active ? t("users.activeYes") : t("users.activeNo")}
                    </TableCell>
                    <TableCell>{user.worker?.name ?? user.workerId}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(user)}
                      >
                        {t("users.editUser")}
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
            <DialogTitle>{t("users.createUser")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="create-worker">{t("users.form.worker")}</Label>
              <Select
                value={createWorkerId}
                onValueChange={setCreateWorkerId}
                required
              >
                <SelectTrigger id="create-worker">
                  <SelectValue placeholder={t("users.form.worker")} />
                </SelectTrigger>
                <SelectContent>
                  {workersWithoutUser.map((w) => (
                    <SelectItem key={w.id} value={w.id.toString()}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-name">{t("users.form.name")}</Label>
              <Input
                id="create-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">{t("users.form.email")}</Label>
              <Input
                id="create-email"
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">
                {t("users.form.password")}
              </Label>
              <Input
                id="create-password"
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role">{t("users.form.role")}</Label>
              <Select
                value={createRole}
                onValueChange={(v) => setCreateRole(v as Role)}
              >
                <SelectTrigger id="create-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(`users.role.${r}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                {t("users.cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("auth.loading") : t("users.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.editUser")}</DialogTitle>
          </DialogHeader>
          {editUser && (
            <form onSubmit={handleEdit} className="space-y-4">
              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-name">{t("users.form.name")}</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">{t("users.form.email")}</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">{t("users.form.role")}</Label>
                <Select
                  value={editRole}
                  onValueChange={(v) => setEditRole(v as Role)}
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {t(`users.role.${r}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="edit-active">{t("users.form.active")}</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeEdit}>
                  {t("users.cancel")}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? t("auth.loading") : t("users.save")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
