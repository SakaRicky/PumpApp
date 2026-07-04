import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ParsedStockCountRow } from "./stockCount"

export const StockCountGrid = ({
  rows,
  canEdit,
  search,
  onlyChanged,
  onSearchChange,
  onOnlyChangedChange,
  onRowChange,
  onFillAll,
}: {
  rows: ParsedStockCountRow[]
  canEdit: boolean
  search: string
  onlyChanged: boolean
  onSearchChange: (value: string) => void
  onOnlyChangedChange: (value: boolean) => void
  onRowChange: (
    productId: number,
    field: "openingQty" | "receivedQty" | "closingQty",
    value: string
  ) => void
  onFillAll: () => void
}) => {
  const { t } = useTranslation()
  const filteredRows = rows.filter((row) => {
    if (
      search &&
      !row.productName.toLowerCase().includes(search.toLowerCase())
    ) {
      return false
    }
    if (onlyChanged && row.opening === row.closing && row.received === 0) {
      return false
    }
    return true
  })
  const hasWarnings = rows.some((row) => row.warning)

  return (
    <>
      {hasWarnings && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {t("shifts.stock.negativeBlocked")}
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            className="w-full sm:w-60"
            placeholder={t("shifts.stock.filters.search")}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={onlyChanged}
              onChange={(e) => onOnlyChangedChange(e.target.checked)}
            />
            {t("shifts.stock.filters.onlyChanged")}
          </label>
        </div>
        {canEdit && (
          <Button type="button" variant="outline" size="sm" onClick={onFillAll}>
            {t("shifts.stock.fillAll")}
          </Button>
        )}
      </div>
      <div className="max-h-[60vh] overflow-y-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("shifts.stock.table.product")}</TableHead>
              <TableHead>{t("shifts.stock.table.category")}</TableHead>
              <TableHead className="w-[90px]">
                {t("shifts.stock.table.opening")}
              </TableHead>
              <TableHead className="w-[90px]">
                {t("shifts.stock.table.received")}
              </TableHead>
              <TableHead className="w-[90px]">
                {t("shifts.stock.table.closing")}
              </TableHead>
              <TableHead className="w-[90px]">
                {t("shifts.stock.table.sold")}
              </TableHead>
              <TableHead className="w-[110px]">
                {t("shifts.stock.table.revenue")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((row) => (
              <TableRow
                key={row.productId}
                className={row.warning ? "bg-red-50" : undefined}
              >
                <TableCell>{row.productName}</TableCell>
                <TableCell>{row.categoryName}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={row.openingQty}
                    disabled={!canEdit}
                    onChange={(e) =>
                      onRowChange(row.productId, "openingQty", e.target.value)
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={row.receivedQty}
                    disabled={!canEdit}
                    onChange={(e) =>
                      onRowChange(row.productId, "receivedQty", e.target.value)
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={row.closingQty}
                    disabled={!canEdit}
                    className={row.closingSuggested ? "text-muted-foreground" : undefined}
                    onChange={(e) =>
                      onRowChange(row.productId, "closingQty", e.target.value)
                    }
                  />
                  {row.closingSuggested && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {t("shifts.stock.prefillHint")}
                    </p>
                  )}
                </TableCell>
                <TableCell className={row.warning ? "font-semibold text-red-700" : undefined}>
                  {row.sold.toFixed(3)}
                </TableCell>
                <TableCell>{row.revenue.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
