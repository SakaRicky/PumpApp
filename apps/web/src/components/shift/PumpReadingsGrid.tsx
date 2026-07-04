import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getPumpReadingVolume, type PumpReadingGridRow } from "./pumpReadings"

export const PumpReadingsGrid = ({
  rows,
  canEdit,
  onRowChange,
}: {
  rows: PumpReadingGridRow[]
  canEdit: boolean
  onRowChange: (
    pumpId: number,
    field: "openingReading" | "closingReading",
    value: string
  ) => void
}) => {
  const { t } = useTranslation()

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("shifts.pump")}</TableHead>
            <TableHead>{t("shifts.pumpReadingsAssignedWorker")}</TableHead>
            <TableHead>{t("shifts.pumpReadingsOpening")}</TableHead>
            <TableHead>{t("shifts.pumpReadingsClosing")}</TableHead>
            <TableHead>{t("shifts.guards.volume")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground">
                {t("shifts.pumpReadingsNoOperationalPumps")}
              </TableCell>
            </TableRow>
          ) : rows.map((row) => {
            const rowNeedsAssignBeforeCreate =
              canEdit && row.readingId == null && !row.workerName
            const volume = getPumpReadingVolume(row)
            const overAverage =
              volume !== null &&
              row.recentAverageVolume != null &&
              row.recentAverageVolume > 0 &&
              volume > row.recentAverageVolume * 3
            const overCeiling =
              volume !== null &&
              row.volumeCeiling != null &&
              volume > row.volumeCeiling
            return (
              <TableRow key={row.pumpId}>
                <TableCell>{row.pumpName}</TableCell>
                <TableCell>
                  {row.workerName ? (
                    <span className="font-medium">{row.workerName}</span>
                  ) : (
                    <span className="text-muted-foreground">
                      {t("shifts.pumpReadingsUnassigned")}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    value={row.openingReading}
                    disabled={!canEdit || rowNeedsAssignBeforeCreate}
                    title={
                      rowNeedsAssignBeforeCreate
                        ? t("shifts.pumpReadingsAssignFirstTitle")
                        : undefined
                    }
                    onChange={(e) =>
                      onRowChange(row.pumpId, "openingReading", e.target.value)
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    value={row.closingReading}
                    disabled={!canEdit || rowNeedsAssignBeforeCreate}
                    title={
                      rowNeedsAssignBeforeCreate
                        ? t("shifts.pumpReadingsAssignFirstTitle")
                        : undefined
                    }
                    onChange={(e) =>
                      onRowChange(row.pumpId, "closingReading", e.target.value)
                    }
                  />
                </TableCell>
                <TableCell>
                  {volume === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <div
                      className={
                        overCeiling
                          ? "font-semibold text-red-700"
                          : overAverage
                            ? "font-medium text-amber-700"
                            : "text-foreground"
                      }
                    >
                      {volume.toFixed(3)} L
                      {overCeiling && row.volumeCeiling != null && (
                        <p className="text-[11px]">
                          {t("shifts.guards.ceilingHint", {
                            ceiling: row.volumeCeiling,
                          })}
                        </p>
                      )}
                      {!overCeiling && overAverage && (
                        <p className="text-[11px]">
                          {t("shifts.guards.averageHint")}
                        </p>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
