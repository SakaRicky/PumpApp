import type { PrismaClient } from "../../node_modules/.prisma/client/index.js"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>

export interface VolumeCeiling {
  ceiling: number | null
  source: "setting" | "tank" | null
}

const SETTING_KEY = "readings.maxVolumePerShiftLiters"

const numericSettingValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value
  }
  if (
    value &&
    typeof value === "object" &&
    "value" in value &&
    typeof value.value === "number" &&
    Number.isFinite(value.value) &&
    value.value > 0
  ) {
    return value.value
  }
  return null
}

export const resolveVolumeCeiling = async (
  pumpId: number,
  client: Tx | typeof prisma = prisma
): Promise<VolumeCeiling> => {
  const setting = await client.setting.findUnique({
    where: { key: SETTING_KEY },
  })
  const settingCeiling = numericSettingValue(setting?.value)
  if (settingCeiling !== null) {
    return { ceiling: settingCeiling, source: "setting" }
  }

  const pump = await client.pump.findUnique({
    where: { id: pumpId },
    include: { tank: true },
  })
  const tankCapacity =
    pump?.tank?.capacity != null ? Number(pump.tank.capacity) : null
  if (tankCapacity !== null && Number.isFinite(tankCapacity) && tankCapacity > 0) {
    return { ceiling: tankCapacity, source: "tank" }
  }

  return { ceiling: null, source: null }
}

export const assertVolumeWithinCeiling = ({
  volume,
  ceiling,
  overrideCeiling,
  overrideReason,
  isAdmin,
}: {
  volume: number
  ceiling: number | null
  overrideCeiling?: boolean
  overrideReason?: string
  isAdmin: boolean
}): void => {
  if (ceiling === null || volume <= ceiling) return

  if (!overrideCeiling) {
    throw new AppError(
      `Pump reading volume ${volume} L exceeds the per-shift ceiling of ${ceiling} L`,
      422,
      ErrorCode.VALIDATION_ERROR,
      { volume, ceiling, ceilingExceeded: true }
    )
  }

  if (!isAdmin) {
    throw new AppError("Only admins can override the reading volume ceiling", 403, ErrorCode.FORBIDDEN)
  }

  if (!overrideReason?.trim()) {
    throw new AppError(
      "Override reason is required when forcing a reading above the ceiling",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }
}
