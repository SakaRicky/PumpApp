import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type {
  CategoryResponse,
  ProductResponse,
  PurchasePriceResponse,
} from "@pumpapp/shared"
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
import { useAuth } from "@/contexts/authContext"
import { api } from "@/lib/api"
import { Package } from "@/components/icons"

// List is sorted by effectiveAt desc (newest first). Chronologically previous = next index.
const isPriceIncreased = (
  list: PurchasePriceResponse[],
  index: number
): boolean => {
  if (index >= list.length - 1) return false
  const curr = list[index]
  const chronoPrev = list[index + 1]
  return curr.purchasePrice > chronoPrev.purchasePrice
}

export const ProductsPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isAdmin = user?.role === "ADMIN"

  const [products, setProducts] = useState<ProductResponse[]>([])
  const [categories, setCategories] = useState<CategoryResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<ProductResponse | null>(null)
  const [priceHistoryProduct, setPriceHistoryProduct] =
    useState<ProductResponse | null>(null)

  const [createName, setCreateName] = useState("")
  const [createCategoryId, setCreateCategoryId] = useState<string>("")
  const [createSellingPrice, setCreateSellingPrice] = useState("")
  const [createCurrentStock, setCreateCurrentStock] = useState("")
  const [createActive, setCreateActive] = useState(true)

  const [editName, setEditName] = useState("")
  const [editCategoryId, setEditCategoryId] = useState("")
  const [editSellingPrice, setEditSellingPrice] = useState("")
  const [editCurrentStock, setEditCurrentStock] = useState("")
  const [editActive, setEditActive] = useState(true)

  const [purchasePrices, setPurchasePrices] = useState<PurchasePriceResponse[]>(
    []
  )
  const [pricesLoading, setPricesLoading] = useState(false)
  const [priceFormPurchasePrice, setPriceFormPurchasePrice] = useState("")
  const [priceFormEffectiveAt, setPriceFormEffectiveAt] = useState("")
  const [priceFormNotes, setPriceFormNotes] = useState("")
  const [priceSubmitError, setPriceSubmitError] = useState<string | null>(null)
  const [priceAlertMessage, setPriceAlertMessage] = useState<string | null>(
    null
  )
  const [lastAddedPriceId, setLastAddedPriceId] = useState<number | null>(null)
  const [priceSubmitting, setPriceSubmitting] = useState(false)

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
      ])
      setProducts(productsRes)
      setCategories(categoriesRes)
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : t("products.errors.errorLoad")
      )
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const loadPurchasePrices = useCallback(async (productId: number) => {
    setPricesLoading(true)
    try {
      const res = await api.getPurchasePrices(productId)
      setPurchasePrices(res)
    } catch {
      setPurchasePrices([])
    } finally {
      setPricesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (priceHistoryProduct) {
      loadPurchasePrices(priceHistoryProduct.id)
      setPriceAlertMessage(null)
      setLastAddedPriceId(null)
      setPriceFormPurchasePrice("")
      setPriceFormEffectiveAt("")
      setPriceFormNotes("")
      setPriceSubmitError(null)
    } else {
      setPurchasePrices([])
      setLastAddedPriceId(null)
    }
  }, [priceHistoryProduct, loadPurchasePrices])

  const categoryName = (product: ProductResponse): string =>
    product.category?.name ??
    categories.find((c) => c.id === product.categoryId)?.name ??
    String(product.categoryId)

  const openCreate = () => {
    setCreateName("")
    setCreateCategoryId(categories[0]?.id.toString() ?? "")
    setCreateSellingPrice("")
    setCreateCurrentStock("0")
    setCreateActive(true)
    setSubmitError(null)
    setCreateOpen(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const categoryId = createCategoryId ? parseInt(createCategoryId, 10) : 0
    if (!createName.trim() || !categoryId) {
      setSubmitError(t("products.errors.nameAndCategoryRequired"))
      return
    }
    const sellingPrice = parseFloat(createSellingPrice)
    const currentStock = parseFloat(createCurrentStock)
    if (Number.isNaN(sellingPrice) || sellingPrice < 0) {
      setSubmitError(t("products.errors.invalidSellingPrice"))
      return
    }
    if (Number.isNaN(currentStock) || currentStock < 0) {
      setSubmitError(t("products.errors.invalidCurrentStock"))
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.createProduct({
        name: createName.trim(),
        categoryId,
        sellingPrice,
        currentStock,
        active: createActive,
      })
      setCreateOpen(false)
      await load()
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : t("products.errors.errorCreate")
      )
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (product: ProductResponse) => {
    setEditProduct(product)
    setEditName(product.name)
    setEditCategoryId(product.categoryId.toString())
    setEditSellingPrice(String(product.sellingPrice))
    setEditCurrentStock(String(product.currentStock))
    setEditActive(product.active)
    setSubmitError(null)
  }

  const closeEdit = () => {
    setEditProduct(null)
    setSubmitError(null)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editProduct) return
    if (!editName.trim()) {
      setSubmitError(t("products.errors.nameRequired"))
      return
    }
    const categoryId = parseInt(editCategoryId, 10)
    const sellingPrice = parseFloat(editSellingPrice)
    const currentStock = parseFloat(editCurrentStock)
    if (Number.isNaN(sellingPrice) || sellingPrice < 0) {
      setSubmitError(t("products.errors.invalidSellingPrice"))
      return
    }
    if (Number.isNaN(currentStock) || currentStock < 0) {
      setSubmitError(t("products.errors.invalidCurrentStock"))
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.updateProduct(editProduct.id, {
        name: editName.trim(),
        categoryId,
        sellingPrice,
        currentStock,
        active: editActive,
      })
      closeEdit()
      await load()
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : t("products.errors.errorUpdate")
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddPurchasePrice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!priceHistoryProduct) return
    const purchasePrice = parseFloat(priceFormPurchasePrice)
    if (Number.isNaN(purchasePrice) || purchasePrice < 0) {
      setPriceSubmitError(t("products.priceHistory.invalidPrice"))
      return
    }
    const effectiveAt = priceFormEffectiveAt.trim()
    if (!effectiveAt) {
      setPriceSubmitError(t("products.priceHistory.effectiveAtRequired"))
      return
    }
    const isoDate =
      effectiveAt.length <= 10
        ? `${effectiveAt}T00:00:00.000Z`
        : new Date(effectiveAt).toISOString()
    setPriceSubmitting(true)
    setPriceSubmitError(null)
    setPriceAlertMessage(null)
    try {
      const res = await api.createPurchasePrice(priceHistoryProduct.id, {
        purchasePrice,
        effectiveAt: isoDate,
        notes: priceFormNotes.trim() || undefined,
      })
      setPriceFormPurchasePrice("")
      setPriceFormEffectiveAt("")
      setPriceFormNotes("")
      setLastAddedPriceId(res.id)
      await loadPurchasePrices(priceHistoryProduct.id)
      setPriceAlertMessage(
        res.alert
          ? t("products.priceHistory.priceRecordedWithIncrease")
          : t("products.priceHistory.priceRecorded")
      )
    } catch (e) {
      setPriceSubmitError(
        e instanceof Error ? e.message : t("products.priceHistory.errorCreate")
      )
    } finally {
      setPriceSubmitting(false)
    }
  }

  const sortedPrices = [...purchasePrices].sort(
    (a, b) =>
      new Date(b.effectiveAt).getTime() - new Date(a.effectiveAt).getTime()
  )

  return (
    <PageLayout title={t("products.title")}>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 text-muted-foreground">
            <Package className="size-5 shrink-0 mt-0.5" aria-hidden />
            <p>{t("products.intro")}</p>
          </div>
          {isAdmin && (
            <Button onClick={openCreate}>{t("products.addProduct")}</Button>
          )}
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <p className="text-muted-foreground">{t("auth.loading")}</p>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground">{t("products.noProducts")}</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("products.table.id")}</TableHead>
                  <TableHead>{t("products.table.name")}</TableHead>
                  <TableHead>{t("products.table.category")}</TableHead>
                  <TableHead>{t("products.table.sellingPrice")}</TableHead>
                  <TableHead>{t("products.table.currentStock")}</TableHead>
                  <TableHead>{t("products.table.active")}</TableHead>
                  <TableHead className="w-[180px]">
                    {t("products.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.id}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{categoryName(product)}</TableCell>
                    <TableCell>
                      {Number(product.sellingPrice).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {Number(product.currentStock).toFixed(3)}
                    </TableCell>
                    <TableCell>
                      {product.active
                        ? t("products.activeYes")
                        : t("products.activeNo")}
                    </TableCell>
                    <TableCell className="flex gap-2">
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(product)}
                        >
                          {t("products.edit")}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPriceHistoryProduct(product)}
                      >
                        {t("products.priceHistory.title")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create product dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("products.createProduct")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="create-name">{t("products.form.name")}</Label>
              <Input
                id="create-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-category">
                {t("products.form.category")}
              </Label>
              <Select
                value={createCategoryId}
                onValueChange={setCreateCategoryId}
                required
              >
                <SelectTrigger id="create-category">
                  <SelectValue placeholder={t("products.form.category")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-sellingPrice">
                {t("products.form.sellingPrice")}
              </Label>
              <Input
                id="create-sellingPrice"
                type="number"
                step="0.01"
                min="0"
                value={createSellingPrice}
                onChange={(e) => setCreateSellingPrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-currentStock">
                {t("products.form.currentStock")}
              </Label>
              <Input
                id="create-currentStock"
                type="number"
                step="0.001"
                min="0"
                value={createCurrentStock}
                onChange={(e) => setCreateCurrentStock(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="create-active"
                checked={createActive}
                onChange={(e) => setCreateActive(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="create-active">{t("products.form.active")}</Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                {t("products.cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("auth.loading") : t("products.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit product dialog */}
      <Dialog
        open={!!editProduct}
        onOpenChange={(open) => !open && closeEdit()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("products.editProduct")}</DialogTitle>
          </DialogHeader>
          {editProduct && (
            <form onSubmit={handleEdit} className="space-y-4">
              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-name">{t("products.form.name")}</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">
                  {t("products.form.category")}
                </Label>
                <Select
                  value={editCategoryId}
                  onValueChange={setEditCategoryId}
                >
                  <SelectTrigger id="edit-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sellingPrice">
                  {t("products.form.sellingPrice")}
                </Label>
                <Input
                  id="edit-sellingPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editSellingPrice}
                  onChange={(e) => setEditSellingPrice(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-currentStock">
                  {t("products.form.currentStock")}
                </Label>
                <Input
                  id="edit-currentStock"
                  type="number"
                  step="0.001"
                  min="0"
                  value={editCurrentStock}
                  onChange={(e) => setEditCurrentStock(e.target.value)}
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
                <Label htmlFor="edit-active">{t("products.form.active")}</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeEdit}>
                  {t("products.cancel")}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? t("auth.loading") : t("products.save")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Price history dialog */}
      <Dialog
        open={!!priceHistoryProduct}
        onOpenChange={(open) => !open && setPriceHistoryProduct(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t("products.priceHistory.dialogTitle")}
              {priceHistoryProduct && ` — ${priceHistoryProduct.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {priceAlertMessage && (
              <Alert>
                <AlertDescription>{priceAlertMessage}</AlertDescription>
              </Alert>
            )}

            {isAdmin && (
              <form
                onSubmit={handleAddPurchasePrice}
                className="space-y-3 rounded-md border p-3"
              >
                <h4 className="text-sm font-medium">
                  {t("products.priceHistory.addPrice")}
                </h4>
                {priceSubmitError && (
                  <Alert variant="destructive">
                    <AlertDescription>{priceSubmitError}</AlertDescription>
                  </Alert>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="price-purchasePrice">
                      {t("products.priceHistory.purchasePrice")}
                    </Label>
                    <Input
                      id="price-purchasePrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceFormPurchasePrice}
                      onChange={(e) =>
                        setPriceFormPurchasePrice(e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price-effectiveAt">
                      {t("products.priceHistory.effectiveAt")}
                    </Label>
                    <Input
                      id="price-effectiveAt"
                      type="datetime-local"
                      value={priceFormEffectiveAt}
                      onChange={(e) => setPriceFormEffectiveAt(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price-notes">
                      {t("products.priceHistory.notes")}
                    </Label>
                    <Input
                      id="price-notes"
                      value={priceFormNotes}
                      onChange={(e) => setPriceFormNotes(e.target.value)}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={priceSubmitting}>
                  {priceSubmitting
                    ? t("auth.loading")
                    : t("products.priceHistory.addPrice")}
                </Button>
              </form>
            )}

            <div>
              <h4 className="mb-2 text-sm font-medium">
                {t("products.priceHistory.tableTitle")}
              </h4>
              {pricesLoading ? (
                <p className="text-muted-foreground text-sm">
                  {t("auth.loading")}
                </p>
              ) : sortedPrices.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t("products.priceHistory.noPrices")}
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          {t("products.priceHistory.effectiveAt")}
                        </TableHead>
                        <TableHead>
                          {t("products.priceHistory.purchasePrice")}
                        </TableHead>
                        <TableHead>
                          {t("products.priceHistory.notes")}
                        </TableHead>
                        <TableHead className="w-[120px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedPrices.map((row, index) => (
                        <TableRow
                          key={row.id}
                          className={
                            row.id === lastAddedPriceId
                              ? "bg-amber-50 dark:bg-amber-950/20"
                              : undefined
                          }
                        >
                          <TableCell>
                            {new Date(row.effectiveAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {Number(row.purchasePrice).toFixed(2)}
                          </TableCell>
                          <TableCell>{row.notes ?? "—"}</TableCell>
                          <TableCell>
                            {isPriceIncreased(sortedPrices, index) && (
                              <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                                {t("products.priceHistory.priceIncreased")}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
